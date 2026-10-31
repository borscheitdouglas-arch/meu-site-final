/* Pré-cotação assistida, sem pagamento: preços são indicativos até confirmação pelo vendedor. */
(() => {
  'use strict';
  const merchantEmail = 'douglas.assumpcao27@gmail.com';
  const api = 'https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const productPriceCents = 10990; // Preço preliminar exibido na vitrine, nunca um valor de cobrança.
  const money = cents => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(cents / 100);
  // AbortController também atende navegadores sem AbortSignal.timeout.
  async function requestJSON(url, options, timeoutMs, controller = new AbortController()) {
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {...options, signal: controller.signal});
      if (!response.ok) throw new Error('request_unavailable');
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  // O checkout não aparece na loja até o servidor declarar a liberação.
  requestJSON(api + '/api/checkout/live/readiness', {
    method:'GET',mode:'cors',cache:'no-store'
  }, 6000).then(data=>{
    if(data?.checkoutEnabled!==true)return;
    const form=document.querySelector('[data-vavi-inquiry]');
    if(!form)return;
    const article=form.closest('.atelier-vavi-card');
    const status=article?.querySelector('.atelier-vavi-status');
    if(status)status.textContent='Compra segura disponível';
    const link=document.createElement('a');
    link.href='/pages/checkout-salve-regina.html';
    link.className='atelier-buy atelier-buy-primary atelier-vavi-live-link';
    link.textContent='Comprar agora · Mercado Pago';
    form.parentElement.insertBefore(link,form);
  }).catch(()=>{});
  document.querySelectorAll('[data-vavi-inquiry]').forEach((form, formIndex) => {
    const status = form.querySelector('[data-vavi-inquiry-status]');
    const result = form.querySelector('[data-vavi-inquiry-result]');
    const message = form.querySelector('[data-vavi-inquiry-message]');
    const emailLink = form.querySelector('[data-vavi-inquiry-email]');
    const copyButton = form.querySelector('[data-vavi-inquiry-copy]');
    const zipInput = form.querySelector('input[name="zipCode"]');
    const submit = form.querySelector('button[type="submit"]');
    const shippingPanel = form.querySelector('[data-vavi-shipping-panel]');
    const optionsContainer = form.querySelector('[data-vavi-shipping-options]');
    const estimatedTotal = form.querySelector('[data-vavi-total]');
    if (![status, result, message, emailLink, copyButton, zipInput, submit,
      shippingPanel, optionsContainer, estimatedTotal].every(Boolean)) return;
    let currentZip = '';
    let choices = [];
    let requestVersion = 0;
    let pendingRequest = null;
    const submitLabel = submit.textContent;
    const copyLabel = copyButton.textContent;
    if (!status.id) status.id = 'vavi-inquiry-status-' + formIndex;
    const describedBy = new Set((zipInput.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    describedBy.add(status.id);
    zipInput.setAttribute('aria-describedby', [...describedBy].join(' '));
    optionsContainer.setAttribute('role', 'radiogroup');
    optionsContainer.setAttribute('aria-label', 'Opções de frete estimado');

    function setLoading(loading) {
      submit.disabled = loading;
      submit.textContent = loading ? 'Consultando frete…' : submitLabel;
      optionsContainer.setAttribute('aria-busy', String(loading));
    }

    function buildMessage() {
      const selected = optionsContainer.querySelector('input[name="vaviShipping"]:checked');
      const option = selected && choices.find(x => x.id === selected.value);
      const formattedZip = currentZip.slice(0, 5) + '-' + currentZip.slice(5);
      const subject = 'Consulta de compra | Camiseta Salve Regina preta G';
      const lines = [
        'Olá! Gostaria de consultar a compra da Camiseta Salve Regina.',
        '',
        'Produto: Camiseta Salve Regina, preta',
        'Tamanho: G',
        'Quantidade: 1 unidade',
        'CEP para cotação de frete: ' + formattedZip,
        '',
        'Preço anunciado: ' + money(productPriceCents) + ' (preliminar).'
      ];
      if (option) {
        const freightCents = Math.round(option.shippingCost * 100);
        estimatedTotal.textContent = 'Total estimado: ' +
          money(productPriceCents + freightCents) +
          ' (produto + frete, sujeito a confirmação).';
        lines.push('Transportadora consultada: ' + option.name);
        lines.push('Frete estimado: ' + money(freightCents));
        lines.push('Total estimado: ' + money(productPriceCents + freightCents));
        lines.push('Prazo de transporte informado pela VAVI: ' +
          option.deliveryTime + ' dia(s), além do tempo de produção.');
      } else {
        estimatedTotal.textContent = '';
        lines.push('Frete: pendente de confirmação para o CEP informado.');
      }
      lines.push('', 'Aguardo disponibilidade, preço final, frete e prazo total de produção/entrega.');
      lines.push('Após concordar com o valor final, gostaria de receber o link oficial do Mercado Pago.');
      lines.push('Nenhum pedido ou pagamento foi realizado.');
      const body = lines.join('\n');
      message.value = body;
      copyButton.textContent = copyLabel;
      emailLink.href = 'mailto:' + merchantEmail +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    }

    function clearQuote() {
      choices = [];
      result.hidden = true;
      shippingPanel.hidden = true;
      optionsContainer.replaceChildren();
      estimatedTotal.textContent = '';
      message.value = '';
      emailLink.href = 'mailto:' + merchantEmail;
      copyButton.textContent = copyLabel;
    }
    optionsContainer.addEventListener('change', buildMessage);
    zipInput.addEventListener('input', () => {
      requestVersion += 1;
      pendingRequest?.abort();
      pendingRequest = null;
      currentZip = '';
      clearQuote();
      setLoading(false);
      zipInput.removeAttribute('aria-invalid');
      status.textContent = '';
    });
    zipInput.addEventListener('invalid', () => zipInput.setAttribute('aria-invalid', 'true'));

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const version = ++requestVersion;
      pendingRequest?.abort();
      pendingRequest = null;
      clearQuote();
      setLoading(false);
      const zip = zipInput.value.replace(/\D/g, '');
      if (!/^\d{8}$/.test(zip)) {
        status.textContent = 'Informe um CEP brasileiro válido, com 8 números.';
        zipInput.setAttribute('aria-invalid', 'true');
        zipInput.focus();
        return;
      }
      zipInput.removeAttribute('aria-invalid');
      currentZip = zip;
      pendingRequest = new AbortController();
      const isCurrent = () => version === requestVersion && zipInput.value.replace(/\D/g, '') === zip;
      setLoading(true);
      status.textContent = 'Consultando as opções de entrega para o seu CEP…';
      try {
        const data = await requestJSON(api + '/api/shipping/preview', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({zipCode: zip}),
          cache: 'no-store',
          mode: 'cors'
        }, 16000, pendingRequest);
        if (!isCurrent()) return;
        if (data?.zipCode !== zip || !Array.isArray(data.options)) {
          throw new Error('shipping_invalid');
        }
        choices = data.options.filter(o =>
          o && o.isActive === true &&
          typeof o.id === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(o.id) &&
          typeof o.name === 'string' && o.name.trim() && o.name.length <= 120 &&
          Number.isInteger(o.deliveryTime) && o.deliveryTime >= 0 && o.deliveryTime <= 365 &&
          Number.isFinite(o.shippingCost) && o.shippingCost >= 0 && o.shippingCost <= 10000 &&
          Math.abs(o.shippingCost * 100 - Math.round(o.shippingCost * 100)) <= 0.000001 &&
          !/retirada|retire|pickup/i.test(o.name)
        ).sort((a, b) => a.shippingCost - b.shippingCost);
        if (new Set(choices.map(option => option.id)).size !== choices.length) {
          throw new Error('shipping_conflict');
        }
        if (choices.length) {
          const legend = document.createElement('p');
          legend.textContent = 'Fretes estimados para o CEP ' +
            zip.slice(0,5) + '-' + zip.slice(5) +
            '. Selecione uma opção:';
          optionsContainer.append(legend);
          for (const [index, option] of choices.entries()) {
            const label = document.createElement('label');
            label.className = 'atelier-vavi-shipping-choice';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'vaviShipping';
            input.value = option.id;
            input.checked = index === 0;
            const detail = document.createElement('span');
            detail.textContent = option.name + ' — ' +
              money(Math.round(option.shippingCost * 100)) +
              ' · Transporte: ' + option.deliveryTime + ' dia(s)';
            label.append(input, detail);
            optionsContainer.append(label);
          }
          shippingPanel.hidden = false;

          status.textContent = 'Cotação exibida. A fabricação acrescenta normalmente 3 a 5 dias úteis. O valor final será confirmado antes de cobrar.';
        } else {
          status.textContent = 'Sem opções de frete para este CEP. Você ainda pode solicitar a cotação manualmente.';
        }
      } catch {
        if (!isCurrent()) return;
        clearQuote();
        status.textContent = 'Não foi possível consultar o frete agora. Você pode enviar a mensagem abaixo para solicitar uma cotação, sem cobrança.';
      } finally {
        if (isCurrent()) {
          buildMessage();
          result.hidden = false;
          pendingRequest = null;
          setLoading(false);
        }
      }
    });

    // Só habilita o envio depois de instalar o fluxo assistido; sem JS, use o e-mail.
    submit.disabled = false;

    copyButton.addEventListener('click', async () => {
      const textToCopy = message.value;
      try {
        await navigator.clipboard.writeText(textToCopy);
        if (message.value !== textToCopy || result.hidden) return;
        copyButton.textContent = 'Texto copiado';
      } catch {
        if (message.value !== textToCopy || result.hidden) return;
        message.focus();
        message.select();
        copyButton.textContent = 'Selecione e copie o texto';
      }
    });
  });
})();
