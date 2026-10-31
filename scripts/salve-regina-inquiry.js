/* Pré-cotação assistida, sem pagamento: preços são indicativos até confirmação pelo vendedor. */
(() => {
  'use strict';
  const merchantEmail = 'douglas.assumpcao27@gmail.com';
  const api = 'https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const productPriceCents = 10990; // Preço preliminar exibido na vitrine, nunca um valor de cobrança.
  const money = cents => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(cents / 100);
  // O checkout não aparece na loja até o servidor declarar a liberação.
  fetch(api + '/api/checkout/live/readiness', {
    method:'GET',mode:'cors',cache:'no-store',signal:AbortSignal.timeout(6000)
  }).then(response=>response.ok?response.json():null).then(data=>{
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
  document.querySelectorAll('[data-vavi-inquiry]').forEach(form => {
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
    }
    optionsContainer.addEventListener('change', buildMessage);
    zipInput.addEventListener('input', () => {
      clearQuote();
      status.textContent = '';
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const zip = zipInput.value.replace(/\D/g, '');
      if (!/^\d{8}$/.test(zip)) {
        clearQuote();
        status.textContent = 'Informe um CEP brasileiro válido, com 8 números.';
        zipInput.focus();
        return;
      }
      currentZip = zip;
      clearQuote();
      submit.disabled = true;
      status.textContent = 'Consultando as opções de frete na VAVI…';
      try {
        const response = await fetch(api + '/api/shipping/preview', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({zipCode: zip}),
          cache: 'no-store',
          mode: 'cors',
          signal: AbortSignal.timeout(16000)
        });
        if (!response.ok) throw new Error('shipping_unavailable');
        const data = await response.json();
        if (zipInput.value.replace(/\D/g, '') !== zip) return;
        if (data?.zipCode !== zip || !Array.isArray(data.options)) {
          throw new Error('shipping_invalid');
        }
        choices = data.options.filter(o =>
          o && o.isActive === true &&
          typeof o.id === 'string' && typeof o.name === 'string' &&
          Number.isInteger(o.deliveryTime) &&
          Number.isFinite(o.shippingCost) && o.shippingCost >= 0 &&
          !/retirada|retire|pickup/i.test(o.name)
        ).sort((a, b) => a.shippingCost - b.shippingCost);
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
        status.textContent = 'Frete automático indisponível no momento. A solicitação será enviada para cotação manual, sem cobrança.';
      } finally {
        if (zipInput.value.replace(/\D/g, '') === zip) {
          buildMessage();
          result.hidden = false;
        }
        submit.disabled = false;
      }
    });

    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(message.value);
        copyButton.textContent = 'Texto copiado';
      } catch {
        message.focus();
        message.select();
        copyButton.textContent = 'Selecione e copie o texto';
      }
    });
  });
})();
