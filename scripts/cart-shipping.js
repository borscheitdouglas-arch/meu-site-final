/* Frete do carrinho inteiro: combinações e quantidades, somente
   estimativas consultadas na VAVI. Sem checkout para volumes não homologados. */
(() => {
  'use strict';
  const API = 'https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const money = cents => new Intl.NumberFormat('pt-BR', {
    style:'currency', currency:'BRL'
  }).format(cents / 100);
  const digits = value => String(value || '').replace(/\D/g, '');
  const keyFor = cart => JSON.stringify(cart.map(x => [x.id, x.variant, x.qty]));
  const make = (tag, name, text) => {
    const node = document.createElement(tag);
    if (name) node.className = name;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let state = null, sequence = 0, controller = null;

  function stopRequest() {
    sequence++;
    if (controller) controller.abort();
    controller = null;
  }
  function invalidate() {
    stopRequest();
    state = null;
  }
  function quoteFor(cart) {
    if (!state || state.key !== keyFor(cart) || !/^\d{8}$/.test(state.quotedZip)) return null;
    const option = state.options.find(x => x.id === state.selected);
    if (!option) return null;
    return {
      zipCode: state.quotedZip, sku: state.sku, provisional:state.provisional===true,
      shippingOptionId: option.id,
      shippingName: option.name, shippingCents: Math.round(option.shippingCost * 100),
      deliveryDays: option.deliveryTime
    };
  }
  function mount(root, {cart, sku, items, subtotalCents, onUpdate}) {
    if (!root) return;
    root.replaceChildren();
    const key = keyFor(cart);
    if (state && state.key !== key) invalidate();

    root.append(make('h3','cart-shipping-title','Forma de entrega'));
    root.append(make('p','cart-shipping-description',
      'Informe o CEP e compare transportadoras, valores e prazos antes de pagar.'));
    const multiple=cart.length!==1 || cart[0]?.qty!==1;
    const validSku = code => typeof code==='string' &&
      (/^salve-regina-preta-(p|m|g|gg|xg)$/.test(code) ||
       /^caneca-salve-regina-(preta|pb)$/.test(code) ||
       /^ecobag-salve-regina-(m|g)$/.test(code));
    const eligible=Array.isArray(items) && items.length===cart.length &&
      items.length>=1 && items.length<=15 &&
      items.reduce((n,x)=>n+x.quantity,0)<=30 &&
      items.every((x,i)=>validSku(x.sku) &&
        Number.isInteger(x.quantity) && x.quantity>=1 && x.quantity<=10 &&
        x.quantity===cart[i].qty) &&
      (multiple || (typeof sku==='string' && sku===items[0].sku));
    if (!eligible) {
      root.append(make('p','cart-shipping-help',
        'Há um produto sem cadastro de frete nesta sacola. Consulte o atendimento para obter uma cotação.'));
      onUpdate?.();
      return;
    }

    if (!state) state = {key, sku, zip:'', quotedZip:'', options:[], selected:'',provisional:false};
    const local = state;
    const form = make('form','cart-shipping-form');
    const label = make('label','','CEP de entrega');
    const input = make('input');
    input.name='zipCode'; input.required=true; input.type='text';
    input.setAttribute('inputmode','numeric');
    input.setAttribute('autocomplete','postal-code');
    input.setAttribute('maxlength','9'); input.setAttribute('pattern','[0-9]{5}-?[0-9]{3}');
    input.placeholder='00000-000'; input.value=local.zip;
    const button=make('button','','Consultar frete');
    button.type='submit';
    label.append(input);
    form.append(label,button);
    const status=make('p','cart-shipping-status');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const optionsRoot=make('fieldset','cart-shipping-options');
    optionsRoot.hidden=true;
    const fineprint=make('p','cart-shipping-help',
      'Prazos informados pela transportadora não incluem a fabricação. A disponibilidade e o valor serão conferidos novamente antes do pagamento.');
    root.append(form,status,optionsRoot,fineprint);

    function draw() {
      optionsRoot.replaceChildren();
      const quote=quoteFor(cart);
      if (!quote) {
        optionsRoot.hidden=true;
        onUpdate?.();
        return;
      }
      optionsRoot.hidden=false;
      optionsRoot.append(make('legend','','Opções disponíveis'));
      const cheapest=Math.min(...local.options.map(x=>x.shippingCost));
      const fastest=Math.min(...local.options.map(x=>x.deliveryTime));
      const estimate=make('p','cart-shipping-estimate');
      for (const option of local.options) {
        const line=make('label','cart-shipping-choice');
        const radio=make('input');
        radio.type='radio'; radio.name='shippingOption'; radio.value=option.id;
        radio.checked=option.id===local.selected;
        const data=make('span','cart-shipping-choice-info');
        const heading=make('strong','',option.name);
        data.append(heading);
        if(option.shippingCost===cheapest) data.append(make('small','cart-shipping-best','Menor valor'));
        else if(option.deliveryTime===fastest) data.append(make('small','cart-shipping-fast','Menor prazo de transporte'));
        data.append(make('small','',option.deliveryTime+' dia(s) úteis estimados de transporte'));
        const amount=make('span','cart-shipping-choice-price',
          option.shippingCost===0?'Grátis':money(Math.round(option.shippingCost*100)));
        radio.addEventListener('change',()=>{
          if(!radio.checked)return;
          local.selected=option.id;
          optionsRoot.querySelectorAll('.cart-shipping-choice').forEach(el=>
            el.classList.toggle('is-selected',el.querySelector('input')?.checked===true));
          estimate.textContent='Produtos + frete: '+money(subtotalCents+Math.round(option.shippingCost*100));
          onUpdate?.();
        });
        line.classList.toggle('is-selected',radio.checked);
        line.append(radio,data,amount);optionsRoot.append(line);
      }
      estimate.textContent='Produtos + frete: '+money(subtotalCents+quote.shippingCents);
      optionsRoot.append(estimate);
      onUpdate?.();
    }
    input.addEventListener('input',()=>{
      stopRequest();
      local.zip=input.value;
      local.quotedZip='';local.options=[];local.selected='';local.provisional=false;
      status.textContent='';
      button.disabled=false;
      draw();
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const zipCode=digits(input.value);
      stopRequest();
      local.quotedZip='';local.options=[];local.selected='';local.provisional=false;
      draw();
      if (!/^\d{8}$/.test(zipCode)) {
        status.textContent='Informe um CEP válido com 8 números.';
        input.focus();return;
      }
      const id=sequence;
      controller=new AbortController();
      const currentController=controller;
      button.disabled=true;
      status.textContent='Consultando as transportadoras...';
      try {
        const response=await fetch(API+(multiple?
          '/api/shipping/cart-preview':'/api/shipping/preview'),{
          method:'POST',mode:'cors',cache:'no-store',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(multiple?{zipCode,items}:{zipCode,sku}),
          signal:AbortSignal.any([currentController.signal,AbortSignal.timeout(15000)])
        });
        const data=await response.json().catch(()=>({}));
        if (id!==sequence || state!==local || digits(input.value)!==zipCode) return;
        if(!response.ok)throw new Error(data?.error||'http_'+response.status);
        const matchItems=multiple?
          Array.isArray(data?.items) && data.items.length===items.length &&
          data.items.every((x,i)=>x.sku===items[i].sku &&
            x.quantity===items[i].quantity) &&
          data.provisional===true && data.checkoutEnabled===false:
          data?.sku===sku;
        if(!matchItems || data?.zipCode!==zipCode ||
            !Array.isArray(data.options))throw new Error('shipping_unavailable');
        const options=data.options.filter(x=>x && x.isActive===true &&
          typeof x.id==='string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(x.id) &&
          typeof x.name==='string' && x.name.length>0 && x.name.length<=120 &&
          !/retirada|retire|pickup/i.test(x.name) &&
          Number.isFinite(x.shippingCost) && x.shippingCost>=0 && x.shippingCost<=10000 &&
          Math.abs(x.shippingCost*100-Math.round(x.shippingCost*100))<0.000001 &&
          Number.isInteger(x.deliveryTime) && x.deliveryTime>=0 && x.deliveryTime<=365);
        if(!options.length || new Set(options.map(x=>x.id)).size!==options.length)
          throw new Error('shipping_unavailable');
        local.quotedZip=zipCode;
        local.options=options;
        local.selected=options[0].id;
        local.provisional=data.provisional===true;
        status.textContent=multiple?
          'Estimativa VAVI para todos os itens juntos. Escolha uma opção; a embalagem final ainda exige confirmação.':
          data.provisional===true?
          'Simulação orientativa: embalagem em validação, sem compra disponível.':
          'Cotação disponível. Escolha o frete para visualizar o total.';
        fineprint.textContent=(data.provisional===true?
          'Estimativa de frete: a caixa final ainda não foi confirmada. Esta cotação NÃO autoriza o pagamento. ':'')+
          'Prazos de transporte não incluem fabricação. Valor sujeito a atualização antes de qualquer cobrança.';
        draw();
      } catch(error) {
        if(id!==sequence || state!==local)return;
        local.quotedZip='';local.options=[];local.selected='';local.provisional=false;
        const message=({
          shipping_not_configured:'Configuração do frete incompleta.',
          unavailable_product:'O cadastro logístico desta peça ainda está sendo validado.',
          invalid_sku:'Esta variação ainda não está preparada para o cálculo automático.',
          shipping_product_unverified:'Ainda não há dados de envio confirmados para esta variação.',
          shipping_package_unverified:'A embalagem do pedido precisa ser confirmada para calcular o frete.',
          shipping_provider_unavailable:'A transportadora não respondeu à consulta.',
          origin_not_allowed:'O domínio da loja não foi autorizado na API.',
          http_403:'Acesso à API bloqueado (HTTP 403).'
        })[String(error?.message||'')] || 'Não foi possível concluir a consulta.';
        status.textContent='Frete indisponível para este CEP neste momento. '+message+
          ' Solicite uma cotação antes de pagar.';
        draw();
      } finally {
        if(id===sequence && state===local) {
          controller=null;button.disabled=false;
        }
      }
    });
    draw();
  }
  window.CartShipping={mount,getQuote:quoteFor,invalidate};
})();
