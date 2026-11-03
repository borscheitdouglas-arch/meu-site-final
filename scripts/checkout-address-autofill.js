/* Endereço por CEP no checkout. A consulta envia somente o CEP ao ViaCEP.
   Não altera preço, frete, dados de pagamento nem regras de validação do servidor. */
(() => {
  'use strict';
  const keys = ['street','neighborhood','city','state'];
  const digits = value => String(value || '').replace(/\D/g,'');
  const clean = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
  function mount(form) {
    if (!form || form.dataset.cepAutofillMounted === 'yes') return;
    const zip = form.elements.namedItem('zipCode');
    const inputs = Object.fromEntries(keys.map(key => [key,form.elements.namedItem(key)]));
    if (!zip || keys.some(key => !inputs[key])) return;
    const panel = inputs.street.closest('.checkout-panel');
    const fieldGrid = panel?.querySelector('.checkout-field-grid');
    if (!fieldGrid) return;
    form.dataset.cepAutofillMounted = 'yes';
    const feedback = document.createElement('p');
    feedback.className = 'hint checkout-cep-feedback';
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    feedback.hidden = true;
    fieldGrid.before(feedback);
    let previousZip = '';
    let autofilled = {};
    let timer = null, controller = null, sequence = 0;
    function message(text) {
      feedback.textContent = text;
      feedback.hidden = !text;
    }
    function clearAutofill() {
      for (const key of keys) {
        if (autofilled[key] && inputs[key].value === autofilled[key]) {
          inputs[key].value = '';
        }
      }
      autofilled = {};
    }
    async function lookup(code,requestedSequence) {
      const active = new AbortController();
      controller = active;
      const timeout = setTimeout(() => active.abort(),8000);
      const before = Object.fromEntries(keys.map(key => [key,inputs[key].value]));
      try {
        const res = await fetch('https://viacep.com.br/ws/' + code + '/json/', {
          mode: 'cors', cache: 'no-store', signal: active.signal
        });
        if (!res.ok) throw Error('cep_service_error');
        const data = await res.json();
        if (requestedSequence !== sequence || digits(zip.value) !== code) return;
        if (!data || data.erro === true ||
            (data.cep && digits(data.cep) !== code)) {
          message('CEP não encontrado. Confira o número e preencha o endereço manualmente.');
          return;
        }
        const uf = clean(data.uf,2).toUpperCase();
        const found = {
          street:clean(data.logradouro,180),
          neighborhood:clean(data.bairro,90),
          city:clean(data.localidade,90),
          state:/^[A-Z]{2}$/.test(uf) ? uf : ''
        };
        let filled = 0;
        for (const key of keys) {
          // Respeita dados já digitados ou alterados enquanto a consulta ocorria.
          if (found[key] && !inputs[key].value.trim() && inputs[key].value === before[key]) {
            inputs[key].value = found[key];
            autofilled[key] = found[key];
            filled++;
          }
        }
        if (filled) {
          message(found.street && found.neighborhood
            ? 'Endereço preenchido pelo CEP. Confira os dados e informe o número.'
            : 'CEP localizado. Confira os campos preenchidos e complete os dados faltantes.');
        } else {
          message('Confira o endereço e complete os campos que não foram encontrados pelo CEP.');
        }
      } catch {
        if (requestedSequence === sequence && digits(zip.value) === code) {
          message('Não foi possível consultar o endereço agora. Preencha os campos manualmente.');
        }
      } finally {
        clearTimeout(timeout);
        if (controller === active) controller = null;
      }
    }
    function changed() {
      const code = digits(zip.value);
      if (code === previousZip) return;
      previousZip = code;
      sequence++;
      if (timer !== null) clearTimeout(timer);
      controller?.abort();
      controller = null;
      clearAutofill();
      if (!/^\d{8}$/.test(code)) {
        message('');
        return;
      }
      message('Buscando endereço pelo CEP…');
      const requestedSequence = sequence;
      timer = setTimeout(() => lookup(code,requestedSequence),350);
    }
    zip.addEventListener('input',changed);
    zip.addEventListener('change',changed);
    // Também consulta CEP recebido da tela anterior do carrinho.
    changed();
  }
  window.DouglasCheckoutAddress = {mount};
  function mountStaticCheckout() {
    mount(document.getElementById('checkout-multi-form'));
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',mountStaticCheckout);
  else mountStaticCheckout();
})();