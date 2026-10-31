/* Solicitação assistida: não cria pagamento, não registra pedido e não envia dados a servidores. */
(() => {
  const merchantEmail = 'magister.douglas@gmail.com';
  document.querySelectorAll('[data-vavi-inquiry]').forEach(form => {
    const status = form.querySelector('[data-vavi-inquiry-status]');
    const result = form.querySelector('[data-vavi-inquiry-result]');
    const message = form.querySelector('[data-vavi-inquiry-message]');
    const emailLink = form.querySelector('[data-vavi-inquiry-email]');
    const copyButton = form.querySelector('[data-vavi-inquiry-copy]');
    const zipInput = form.querySelector('input[name="zipCode"]');
    if (!status || !result || !message || !emailLink || !copyButton || !zipInput) return;

    form.addEventListener('submit', event => {
      event.preventDefault();
      const zip = zipInput.value.replace(/\D/g, '');
      if (!/^\d{8}$/.test(zip)) {
        result.hidden = true;
        status.textContent = 'Informe um CEP brasileiro válido, com 8 números.';
        zipInput.focus();
        return;
      }
      const formattedZip = zip.slice(0, 5) + '-' + zip.slice(5);
      const subject = 'Consulta de compra | Camiseta Salve Regina preta G';
      const body = [
        'Olá! Gostaria de consultar a compra da Camiseta Salve Regina.',
        '',
        'Produto: Camiseta Salve Regina, preta',
        'Tamanho: G',
        'Quantidade: 1 unidade',
        'CEP para cotação de frete: ' + formattedZip,
        '',
        'Preço anunciado: R$ 109,90 (preliminar), mais frete a confirmar.',
        'Aguardo confirmação de disponibilidade, custo final, prazo de produção e entrega.',
        'Após a confirmação, gostaria de receber um link oficial de pagamento do Mercado Pago.',
        '',
        'Se não for possível produzir/entregar, por favor me avise antes de qualquer cobrança.'
      ].join('\n');
      message.value = body;
      emailLink.href = 'mailto:' + merchantEmail +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      result.hidden = false;
      status.textContent = 'Solicitação preparada. Clique em “Enviar por e-mail” e confirme o envio no seu aplicativo. Nenhum pedido ou pagamento foi gerado.';
      result.scrollIntoView({behavior:'smooth', block:'nearest'});
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
