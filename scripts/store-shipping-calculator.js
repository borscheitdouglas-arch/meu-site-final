/* Cotação por CEP para UMA peça. Nunca calcula frete fictício nem cobra.
 * Somente variantes de camiseta já liberadas para consulta pela API.
 * Outros produtos aguardam dados logísticos de produção da VAVI. */
(()=>{
  'use strict';
  const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const PRICES={
    'salve-regina-preta-p':10990,'salve-regina-preta-m':10990,
    'salve-regina-preta-g':10990,'salve-regina-preta-gg':10990,
    'salve-regina-preta-xg':11990
  };
  const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
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
      if(!price){
        status.textContent='Frete automático deste produto ainda não configurado na VAVI. Você pode solicitar o valor pelo atendimento antes de comprar.';
        return;
      }
      const turn=serial,controller=new AbortController();
      abort=controller;button.disabled=true;
      status.textContent='Consultando a transportadora pela VAVI...';
      try{
        const timer=AbortSignal.timeout(14000);
        const signal=AbortSignal.any([controller.signal,timer]);
        const response=await fetch(API+'/api/shipping/preview',{
          method:'POST',mode:'cors',cache:'no-store',signal,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({zipCode:code,sku})
        });
        const data=await response.json();
        if(turn!==serial)return;
        if(!response.ok||data?.sku!==sku||data?.zipCode!==code||
          !Array.isArray(data.options))throw Error('cotacao_indisponivel');
        const options=data.options.filter(o=>o && o.isActive===true &&
          typeof o.name==='string' && o.name.length<=120 &&
          Number.isFinite(o.shippingCost) && o.shippingCost>=0 &&
          Number.isInteger(o.deliveryTime) && o.deliveryTime>=0 &&
          !/retirada|retire|pickup/i.test(o.name));
        if(!options.length)throw Error('sem_opcoes');
        results.hidden=false;
        const title=document.createElement('strong');
        title.textContent='Opções estimadas para 1 unidade';
        results.append(title);
        for(const option of options){
          const line=document.createElement('p');
          const frete=Math.round(option.shippingCost*100);
          line.textContent=option.name+' — Frete '+money(frete)+
            ' · Total estimado '+money(price+frete)+
            ' · Transporte: '+option.deliveryTime+' dia(s)';
          results.append(line);
        }
        const notice=document.createElement('p');
        notice.className='shipping-calculator-fineprint';
        notice.textContent='Prazo de produção não incluído. Valores reconferidos antes de qualquer cobrança. Combinar peças pode mudar o frete.';
        results.append(notice);
        status.textContent='Cotação recebida. Este cálculo não realiza compra nem reserva a produção.';
      }catch(error){
        if(turn!==serial)return;
        status.textContent='Não foi possível obter uma cotação válida neste momento. Consulte o atendimento antes de efetuar uma compra.';
      }finally{if(turn===serial){abort=null;button.disabled=false;}}
    });
  }
})();
