/* Cotação por CEP para UMA peça de cada vez, incluindo canecas e ecobags.
 * Somente apresenta preços efetivamente retornados pela API do frete;
 * a aprovação comercial dos produtos ocorre separadamente no checkout. */
(()=>{
  'use strict';
  const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const PRICES={
    'salve-regina-preta-p':10990,'salve-regina-preta-m':10990,
    'salve-regina-preta-g':10990,'salve-regina-preta-gg':10990,
    'salve-regina-preta-xg':11990,
    'caneca-salve-regina-preta':4990,
    'caneca-salve-regina-pb':4990,
    'ecobag-salve-regina-m':3990,
    'ecobag-salve-regina-g':3990
  };
  const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
  const shippingErrorMessage = code => ({
    'shipping_not_configured':'Configuração de frete da loja incompleta.',
    'shipping_product_unverified':'Os dados de frete desta variação ainda precisam ser confirmados.',
    'shipping_package_unverified':'O pacote deste pedido ainda não está confirmado.',
    'shipping_provider_unavailable':'A transportadora não respondeu à consulta.',
    'origin_not_allowed':'O acesso à API está bloqueado para este endereço da loja.',
    'invalid_zip':'O CEP informado não foi aceito.',
    'invalid_sku':'Esta variação não está cadastrada para cotação.',
    'unavailable_product':'Os dados de produção e transporte desta peça ainda estão em validação.'
  }[code] || 'A consulta de frete não pôde ser concluída.');
  const zip=value=>String(value||'').replace(/\D/g,'');
  for(const root of document.querySelectorAll('[data-shipping-calculator]')){
    const form=root.querySelector('form'),product=form?.elements.product,
      cep=form?.elements.zipCode,button=form?.querySelector('[type="submit"]'),
      status=root.querySelector('[data-shipping-status]'),
      results=root.querySelector('[data-shipping-results]');
    if(!form||!product||!cep||!button||!status||!results)continue;
    let serial=0,abort=null;
    const reset=()=>{
      serial++;abort?.abort();abort=null;
      button.disabled=false;
      status.textContent='';results.replaceChildren();results.hidden=true;
    };
    product.addEventListener('change',reset);
    cep.addEventListener('input',reset);
    form.addEventListener('submit',async event=>{
      event.preventDefault();reset();
      const code=zip(cep.value),sku=product.value,price=PRICES[sku];
      if(!/^\d{8}$/.test(code)){
        status.textContent='Informe um CEP válido com 8 números.';cep.focus();return;
      }
      if(!Number.isInteger(price)){
        status.textContent='Preço e dados de envio deste produto ainda estão pendentes. Consulte o atendimento.';
        return;
      }
      const turn=serial,controller=new AbortController();
      abort=controller;button.disabled=true;
      status.textContent='Consultando as transportadoras...';
      try{
        const timer=AbortSignal.timeout(14000);
        const signal=AbortSignal.any([controller.signal,timer]);
        const response=await fetch(API+'/api/shipping/preview',{
          method:'POST',mode:'cors',cache:'no-store',signal,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({zipCode:code,sku})
        });
        const data=await response.json().catch(()=>({}));
        if(turn!==serial)return;
        if(!response.ok)throw Error(data?.error||'http_'+response.status);
        if(data?.sku!==sku||data?.zipCode!==code||
          !Array.isArray(data.options))throw Error('resposta_invalida');
        const options=data.options.filter(o=>o && o.isActive===true &&
          typeof o.id==='string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(o.id) &&
          typeof o.name==='string' && o.name.length>0 && o.name.length<=120 &&
          Number.isFinite(o.shippingCost) && o.shippingCost>=0 &&
          o.shippingCost<=10000 &&
          Math.abs(o.shippingCost*100-Math.round(o.shippingCost*100))<0.000001 &&
          Number.isInteger(o.deliveryTime) && o.deliveryTime>=0 && o.deliveryTime<=365 &&
          !/retirada|retire|pickup/i.test(o.name));
        if(!options.length || new Set(options.map(o=>o.id)).size!==options.length)
          throw Error('sem_opcoes');
        results.hidden=false;
        const title=document.createElement('strong');
        title.textContent=data.provisional===true?
          'Simulação orientativa de frete — 1 unidade':
          'Opções estimadas para 1 unidade';
        results.append(title);
        for(const option of options){
          const line=document.createElement('p');
          const frete=Math.round(option.shippingCost*100);
          line.textContent=option.name+' — Frete '+money(frete)+
            ' · Total estimado '+money(price+frete)+
            ' · Transporte: '+option.deliveryTime+' dia(s) úteis';
          results.append(line);
        }
        const notice=document.createElement('p');
        notice.className='shipping-calculator-fineprint';
        notice.textContent=(data.provisional===true?
          'Embalagem ainda em validação; frete ilustrativo e produto indisponível para pagamento. ':'')+
          'Prazo de produção não incluído. Valores reconferidos antes de qualquer cobrança. Combinar peças pode mudar o frete.';
        results.append(notice);
        status.textContent=data.provisional===true?
          'Prévia recebida da transportadora. Este produto ainda não está liberado para compra.':
          'Cotação recebida. Este cálculo não realiza compra nem reserva a produção.';
      }catch(error){
        if(turn!==serial)return;
        const code=String(error?.message||'');
        status.textContent='Não foi possível obter uma cotação válida neste momento. '+
          shippingErrorMessage(code)+' Consulte o atendimento antes de efetuar uma compra.';
      }finally{if(turn===serial){abort=null;button.disabled=false;}}
    });
  }
})();
