/* Frete no carrinho: estimativa VAVI apenas para 1 camiseta validada.
   Nenhum preço de frete enviado pelo navegador autoriza cobrança; o checkout reconfere no servidor. */
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
      zipCode: state.quotedZip, sku: state.sku, shippingOptionId: option.id,
      shippingName: option.name, shippingCents: Math.round(option.shippingCost * 100),
      deliveryDays: option.deliveryTime
    };
  }
  function mount(root, {cart, subtotalCents, onUpdate}) {
    if (!root) return;
    root.replaceChildren();
    const key = keyFor(cart);
    if (state && state.key !== key) invalidate();

    root.append(make('h3','cart-shipping-title','Calcular frete da compra'));
    const eligible = cart.length === 1 &&
      cart[0].id === 'camiseta-salve-regina' &&
      cart[0].qty === 1 && ['P','M','G','GG','XG'].includes(cart[0].variant);
    if (!eligible) {
      root.append(make('p','cart-shipping-help',
        'O frete automático ainda não está validado para esta combinação de itens. A VAVI precisa confirmar o pacote e o custo de envio; solicite uma cotação antes de pagar.'));
      onUpdate?.();
      return;
    }

    const sku = 'salve-regina-preta-' + cart[0].variant.toLowerCase();
    if (!state) state = {key, sku, zip:'', quotedZip:'', options:[], selected:''};
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
      'Valores da transportadora para uma camiseta. Prazo de fabricação à parte. O preço do frete será reconferido no checkout antes de qualquer cobrança.');
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
      optionsRoot.append(make('legend','','Escolha a entrega'));
      for (const option of local.options) {
        const line=make('label','cart-shipping-choice');
        const radio=make('input');
        radio.type='radio'; radio.name='shippingOption'; radio.value=option.id;
        radio.checked=option.id===local.selected;
        radio.addEventListener('change',()=>{
          if(!radio.checked)return;
          local.selected=option.id;
          draw();
        });
        const name=make('span','',
          option.name+' — '+money(Math.round(option.shippingCost*100))+
          ' · transporte em '+option.deliveryTime+' dia(s)');
        line.append(radio,name);optionsRoot.append(line);
      }
      optionsRoot.append(make('p','cart-shipping-estimate',
        'Total estimado da compra: '+money(subtotalCents+quote.shippingCents)));
      onUpdate?.();
    }
    input.addEventListener('input',()=>{
      stopRequest();
      local.zip=input.value;
      local.quotedZip='';local.options=[];local.selected='';
      status.textContent='';
      button.disabled=false;
      draw();
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const zipCode=digits(input.value);
      stopRequest();
      local.quotedZip='';local.options=[];local.selected='';
      draw();
      if (!/^\d{8}$/.test(zipCode)) {
        status.textContent='Informe um CEP válido com 8 números.';
        input.focus();return;
      }
      const id=sequence;
      controller=new AbortController();
      const currentController=controller;
      button.disabled=true;
      status.textContent='Consultando o frete na VAVI...';
      try {
        const response=await fetch(API+'/api/shipping/preview',{
          method:'POST',mode:'cors',cache:'no-store',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({zipCode,sku}),
          signal:AbortSignal.any([currentController.signal,AbortSignal.timeout(15000)])
        });
        const data=await response.json();
        if (id!==sequence || state!==local || digits(input.value)!==zipCode) return;
        if (!response.ok || data?.sku!==sku || data?.zipCode!==zipCode ||
            !Array.isArray(data.options)) throw new Error('shipping_unavailable');
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
        status.textContent='Cotação disponível. Escolha o frete para visualizar o total.';
        draw();
      } catch(error) {
        if(location.hostname==='127.0.0.1') window.__cartShippingDebug=String(error?.message||'unknown');
        if(id!==sequence || state!==local)return;
        local.quotedZip='';local.options=[];local.selected='';
        status.textContent='Frete indisponível para este CEP neste momento. Solicite uma cotação antes de pagar.';
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
