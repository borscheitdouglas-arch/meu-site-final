// Behavioral checks for the browser's assisted quotation, with no network or payments.
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');

const source = readFileSync(join(__dirname, '../scripts/salve-regina-inquiry.js'), 'utf8');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};

class Element {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.selectors = new Map();
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  emit(name) { return this.listeners.get(name)?.({preventDefault() {}}); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  insertBefore(node) { this.children.push(node); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  querySelector(selector) {
    if (this.selectors.has(selector)) return this.selectors.get(selector);
    if (selector === 'input[name="vaviShipping"]:checked') {
      return this.children.flatMap(node => node.children).find(node => node.checked);
    }
    return null;
  }
}

function setup(readiness = {checkoutEnabled: false}) {
  const form = new Element('form');
  const article = new Element('article');
  const cardStatus = new Element('span');
  article.selectors.set('.atelier-vavi-status', cardStatus);
  form.closest = () => article;
  form.parentElement = article;
  const selectors = {
    status: '[data-vavi-inquiry-status]', result: '[data-vavi-inquiry-result]',
    message: '[data-vavi-inquiry-message]', email: '[data-vavi-inquiry-email]',
    copy: '[data-vavi-inquiry-copy]', zip: 'input[name="zipCode"]', size: 'select[name="size"]',
    submit: 'button[type="submit"]', panel: '[data-vavi-shipping-panel]',
    options: '[data-vavi-shipping-options]', total: '[data-vavi-total]'
  };
  const elements = {};
  for (const [key, selector] of Object.entries(selectors)) {
    elements[key] = new Element();
    form.selectors.set(selector, elements[key]);
  }
  elements.submit.textContent = 'Consultar frete';
  elements.size.value = 'G';
  elements.copy.textContent = 'Copiar mensagem';
  elements.result.hidden = elements.panel.hidden = true;
  elements.zip.setAttribute('aria-describedby', 'cep-hint');
  const requests = [];
  const timers = new Map();
  let timerId = 0;
  const clipboard = {writeText: async () => {}};
  runInNewContext(source, {
    AbortController, Intl, navigator: {clipboard},
    // AbortSignal.timeout deliberately absent: common older browser compatibility.
    document: {
      querySelector: () => form,
      querySelectorAll: () => [form],
      createElement: tag => new Element(tag)
    },
    setTimeout(callback, milliseconds) { timers.set(++timerId, {callback, milliseconds}); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      if (url.endsWith('/api/checkout/live/readiness')) {
        return Promise.resolve({ok: true, json: async () => readiness});
      }
      assert.ok(url.endsWith('/api/shipping/preview'), 'No purchase endpoint may be called');
      const request = {...deferred(), url, options};
      requests.push(request);
      return request.promise;
    }
  });
  const reply = (request, body, ok = true) => request.resolve({ok, json: async () => body});
  return {form, article, cardStatus, ...elements, requests, timers, clipboard, reply};
}

const quote = (id, shippingCost, overrides = {}) => ({
  id, name: 'Transportadora ' + id, shippingCost, deliveryTime: 4, isActive: true, ...overrides
});
const settle = () => new Promise(resolve => setImmediate(resolve));

test('checkout appears only after explicit true from readiness', async () => {
  for (const value of [false, undefined, 'true', 1, true]) {
    const ui = setup({checkoutEnabled: value});
    await settle();
    assert.equal(ui.article.children.length, value === true ? 1 : 0);
    if (value === true) assert.equal(ui.article.children[0].href, '/pages/checkout-salve-regina.html');
  }
});

test('invalid CEP never requests a quotation and identifies the field', async () => {
  const ui = setup();
  ui.zip.value = '123';
  await ui.form.emit('submit');
  assert.equal(ui.requests.length, 0);
  assert.equal(ui.zip.getAttribute('aria-invalid'), 'true');
  assert.equal(ui.zip.focused, true);
  assert.match(ui.zip.getAttribute('aria-describedby'), /cep-hint vavi-inquiry-status/);
});

test('valid quote sorts options, keeps price and updates totals on selection', async () => {
  const ui = setup();
  ui.zip.value = '01310-100';
  const pending = ui.form.emit('submit');
  assert.equal(ui.submit.disabled, true);
  assert.equal(ui.options.getAttribute('aria-busy'), 'true');

  assert.deepEqual(JSON.parse(ui.requests[0].options.body), {
    zipCode: '01310100', sku: 'salve-regina-preta-g'
  });

  ui.reply(ui.requests[0], {zipCode: '01310100', options: [quote('a', 25), quote('b', 18.50)]});
  await pending;
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.options.getAttribute('role'), 'radiogroup');
  assert.match(ui.message.value, /Total estimado: R\$\s128,40/);
  assert.match(ui.message.value, /Tamanho: G/);
  assert.match(ui.message.value, /Nenhum pedido ou pagamento foi realizado/);
  assert.ok(ui.email.href.startsWith('mailto:douglas.assumpcao27@gmail.com?'));
  const radios = ui.options.children.flatMap(element => element.children).filter(element => element.type === 'radio');
  radios[0].checked = false;
  radios[1].checked = true;
  ui.options.emit('change');
  assert.match(ui.message.value, /Total estimado: R\$\s134,90/);
  assert.equal(ui.submit.disabled, false);
  assert.equal(ui.submit.textContent, 'Consultar frete');
});

test('inactive, pickup and malformed prices or delivery times cannot be selected', async () => {
  const ui = setup();
  ui.zip.value = '01310100';
  const pending = ui.form.emit('submit');
  ui.reply(ui.requests[0], {zipCode: '01310100', options: [
    quote('a', 20, {isActive: false}), quote('b', 0, {name: 'Retirada na fábrica'}),
    quote('c', -1), quote('d', 10.123), quote('e', 10001),
    quote('f', 10, {deliveryTime: -1}), quote('g', 10, {deliveryTime: 366}),
    quote('h', 10, {name: ''}), quote('i', 10, {id: ''})
  ]});
  await pending;
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.result.hidden, false);
  assert.match(ui.message.value, /Frete: pendente de confirmação/);
});

for (const [label, response] of [
  ['duplicate identifiers', {zipCode: '01310100', options: [quote('a', 20), quote('a', 25)]}],
  ['mismatched CEP', {zipCode: '01310101', options: [quote('a', 20)]}],
  ['malformed response', {zipCode: '01310100', options: null}]
]) {
  test(label + ' falls back to manual quotation without a price', async () => {
    const ui = setup();
    ui.zip.value = '01310100';
    const pending = ui.form.emit('submit');
    ui.reply(ui.requests[0], response);
    await pending;
    assert.equal(ui.panel.hidden, true);
    assert.equal(ui.total.textContent, '');
    assert.equal(ui.result.hidden, false);
    assert.match(ui.status.textContent, /Não foi possível consultar/);
    assert.match(ui.message.value, /Frete: pendente de confirmação/);
  });
}

test('old failed request cannot overwrite or unlock a newer quotation', async () => {
  const ui = setup();
  ui.zip.value = '01310100';
  const first = ui.form.emit('submit');
  ui.zip.value = '20040020';
  ui.zip.emit('input');
  assert.equal(ui.requests[0].options.signal.aborted, true);
  const second = ui.form.emit('submit');
  ui.requests[0].reject(new Error('cancelled'));
  await first;
  assert.equal(ui.submit.disabled, true);
  assert.match(ui.status.textContent, /Consultando/);
  assert.equal(ui.result.hidden, true);
  ui.reply(ui.requests[1], {zipCode: '20040020', options: [quote('b', 20)]});
  await second;
  assert.match(ui.message.value, /20040-020/);
  assert.doesNotMatch(ui.message.value, /01310-100/);
});

test('changing CEP away and back discards even a successful old response', async () => {
  const ui = setup();
  ui.zip.value = '01310100';
  const pending = ui.form.emit('submit');
  ui.zip.value = '20040020';
  ui.zip.emit('input');
  ui.zip.value = '01310100';
  ui.zip.emit('input');
  ui.reply(ui.requests[0], {zipCode: '01310100', options: [quote('a', 20)]});
  await pending;
  assert.equal(ui.result.hidden, true);
  assert.equal(ui.message.value, '');
  assert.equal(ui.status.textContent, '');
  assert.equal(ui.submit.disabled, false);
});

test('timeout offers a manual quotation and restores the form', async () => {
  const ui = setup();
  ui.zip.value = '01310100';
  const pending = ui.form.emit('submit');
  const request = ui.requests[0];
  request.options.signal.addEventListener('abort', () => request.reject(new Error('timeout')));
  [...ui.timers.values()].find(timer => timer.milliseconds === 16000).callback();
  await pending;
  assert.equal(request.options.signal.aborted, true);
  assert.equal(ui.result.hidden, false);
  assert.match(ui.message.value, /Frete: pendente de confirmação/);
  assert.equal(ui.submit.disabled, false);
  assert.equal(ui.options.getAttribute('aria-busy'), 'false');
});

test('editing CEP clears the old private message, mailto and copy state', async () => {
  const ui = setup();
  ui.zip.value = '01310100';
  const pending = ui.form.emit('submit');
  ui.reply(ui.requests[0], {zipCode: '01310100', options: [quote('a', 20)]});
  await pending;
  const copying = deferred();
  ui.clipboard.writeText = () => copying.promise;
  const copy = ui.copy.emit('click');
  ui.zip.value = '20040020';
  ui.zip.emit('input');
  copying.resolve();
  await copy;
  assert.equal(ui.result.hidden, true);
  assert.equal(ui.message.value, '');
  assert.equal(ui.email.href, 'mailto:douglas.assumpcao27@gmail.com');
  assert.equal(ui.copy.textContent, 'Copiar mensagem');
});

test('XG preserves its configured price and requests the matching SKU', async () => {
  const ui = setup();
  ui.size.value = 'XG';
  ui.zip.value = '01310-100';
  const pending = ui.form.emit('submit');
  assert.deepEqual(JSON.parse(ui.requests[0].options.body), {zipCode: '01310100', sku: 'salve-regina-preta-xg'});
  ui.reply(ui.requests[0], {zipCode: '01310100', options: [quote('a', 18.50)]});
  await pending;
  assert.match(ui.message.value, /Tamanho: XG/);
  assert.match(ui.message.value, /Total estimado: R\$\s138,40/);
});

test('changing size away and back discards the previous pending quote', async () => {
  const ui = setup();
  ui.zip.value = '01310-100';
  const pending = ui.form.emit('submit');
  ui.size.value = 'XG';
  ui.size.emit('change');
  assert.equal(ui.requests[0].options.signal.aborted, true);
  ui.size.value = 'G';
  ui.size.emit('change');
  ui.reply(ui.requests[0], {zipCode: '01310100', options: [quote('a', 18.50)]});
  await pending;
  assert.equal(ui.result.hidden, true);
  assert.equal(ui.message.value, '');
  assert.equal(ui.submit.disabled, false);
});
