/* Checkout de várias peças: o backend confere valores, frete e disponibilidade.
   O navegador não controla preços, estoque, nem liberação comercial. */
(()=>{
'use strict';
const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
const status=document.getElementById('checkout-multi-status');
const root=document.getElementById('checkout-multi-container');
const form=document.getElementById('checkout-multi-form');
if(!status||!root||!form)return;
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const digits=x=>String(x||'').replace(/\D/g,'');
const totalEl=document.getElementById('checkout-multi-total');
const subtotalEl=document.getElementById('checkout-multi-subtotal');
const freightEl=document.getElementById('checkout-multi-freight');
const choices=document.getElementById('checkout-multi-shipping-options');
const quoteStatus=document.getElementById('checkout-multi-shipping-status');
const payStatus=document.getElementById('checkout-multi-pay-status');
const quoteButton=document.getElementById('checkout-multi-quote');
const payButton=document.getElementById('checkout-multi-pay');
const zip=form.elements.zipCode;
let items=[],details=[],subtotal=0,options=[],quotedZip='',currentSelection='',doingRequest=false,quoteTimer=null,quoteToken=0;
const fail=text=>{
  status.textContent=text;
  status.classList.add('warning');
  root.hidden=true;
  const link=document.createElement('a');link.href='/pages/cart.html';
  link.textContent=' Voltar ao carrinho';status.append(link);
};
const request=async(path,body)=>{
  const res=await fetch(API+path,{
    mode:'cors',cache:'no-store',
    ...(body?{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(18000)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'service_unavailable');
  return data;
};
function resetQuotes(){
  quoteToken++;
  options=[];quotedZip='';currentSelection='';
  choices.hidden=true;choices.replaceChildren();
  payButton.disabled=true;freightEl.textContent='A calcular';totalEl.textContent='A calcular';
  payStatus.textContent='O pagamento será liberado após calcular o frete para seu CEP.';
}
function updateTotal(){
  const choice=options.find(x=>x.id===currentSelection);
  if(!choice)return;
  const freight=Math.round(choice.shippingCost*100);
  freightEl.textContent=money(freight);
  totalEl.textContent=money(subtotal+freight);
  payButton.disabled=false;
}
async function quoteFreight(preferredId=''){
  if(quoteTimer!==null){clearTimeout(quoteTimer);quoteTimer=null;}
  resetQuotes();
  const token=quoteToken;
  const code=digits(zip.value);
  if(!/^\d{8}$/.test(code)){
    quoteStatus.textContent='Informe um CEP com 8 números.';
    payStatus.textContent='Informe o CEP de entrega para calcular o total.';
    zip.focus();return;
  }
  quoteButton.disabled=true;quoteStatus.textContent='Consultando transportadoras…';
  doingRequest=true;
  try{
    const result=await request('/api/shipping/cart-preview',{zipCode:code,items});
    // Descarta cotações anteriores quando o usuário modifica o CEP.
    if(token!==quoteToken||digits(zip.value)!==code)return;
    const same=result.items?.length===items.length &&
      result.items.every((x,i)=>x.sku===items[i].sku&&x.quantity===items[i].quantity);
    if(!same||result.checkoutEnabled!==false||result.provisional!==true||
       result.zipCode!==code||!Array.isArray(result.options))
      throw new Error('shipping_unavailable');
    const valid=result.options.filter(x=>x&&x.isActive===true &&
      typeof x.id==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(x.id) &&
      typeof x.name==='string'&&x.name.length>0&&x.name.length<=120 &&
      !/retirada|retire|pickup/i.test(x.name) &&
      Number.isFinite(x.shippingCost)&&x.shippingCost>=0&&x.shippingCost<=10000 &&
      Math.abs(x.shippingCost*100-Math.round(x.shippingCost*100))<0.000001 &&
      Number.isInteger(x.deliveryTime)&&x.deliveryTime>=0&&x.deliveryTime<=365);
    if(!valid.length||new Set(valid.map(x=>x.id)).size!==valid.length)
      throw new Error('shipping_unavailable');
    options=valid;
    quotedZip=code;
    currentSelection=valid.find(x=>x.id===preferredId)?.id||valid[0].id;
    const cheapest=Math.min(...valid.map(x=>x.shippingCost));
    choices.hidden=false;
    const legend=document.createElement('legend');legend.textContent='Opções disponíveis';
    choices.append(legend);
    for(const option of valid){
      const label=document.createElement('label');label.className='shipping-choice';
      const input=document.createElement('input');
      input.type='radio';input.name='shippingOption';input.value=option.id;
      input.checked=option.id===currentSelection;
      input.addEventListener('change',()=>{currentSelection=option.id;updateTotal();});
      const title=document.createElement('span');
      title.textContent=option.name+' · '+option.deliveryTime+' dias úteis de transporte · '+
        money(Math.round(option.shippingCost*100))+
        (option.shippingCost===cheapest?' (menor frete)':'');
      label.append(input,title);choices.append(label);
    }
    updateTotal();
    quoteStatus.textContent='Frete calculado. O valor será reconfirmado no servidor antes do pagamento.';
    payStatus.textContent='Frete e total calculados. Confira os dados e avance para o pagamento seguro.';
  }catch(e){
    if(token!==quoteToken)return;
    options=[];quotedZip='';currentSelection='';
    choices.hidden=true;choices.replaceChildren();payButton.disabled=true;
    quoteStatus.textContent='Não foi possível calcular o frete para este CEP. Clique em Calcular frete para tentar novamente.';
    payStatus.textContent='Pagamento indisponível enquanto não houver uma cotação de frete válida.';
  }finally{
    if(token===quoteToken){quoteButton.disabled=false;doingRequest=false;}
  }
}
async function init(){
  try{
    const [ready,cat]=await Promise.all([
      request('/api/checkout/live/readiness'),
      fetch('/content/shop-cart-catalog.json',{cache:'no-store'}).then(r=>{
        if(!r.ok)throw Error('catalog');return r.json();
      })
    ]);
    if(ready.checkoutEnabled!==true||ready.multiCheckoutEnabled!==true)
      return fail('O pagamento de vários produtos ainda não está habilitado. As cotações de frete continuam disponíveis no carrinho.');
    if(!Array.isArray(cat.products))throw Error('catalog');
    const catalog=new Map(cat.products.map(p=>[p.id,p]));
    const raw=JSON.parse(localStorage.getItem('douglasShopCart_v2')||'[]');
    if(!Array.isArray(raw)||!raw.length||raw.length>15)
      return fail('Seu carrinho não contém uma combinação válida.');
    const merged=new Map();
    for(const x of raw){
      if(!x||typeof x.id!=='string'||typeof x.variant!=='string'||
          !Number.isInteger(x.qty)||x.qty<1||x.qty>10)
        return fail('Os itens do carrinho precisam ser revistos.');
      const p=catalog.get(x.id);const v=p?.variants?.find(v=>v.code===x.variant);
      if(!v||!Number.isSafeInteger(v.priceCents)||v.priceCents<=0 ||
        !ready.availableSkus?.includes(v.sku))
        return fail('Este carrinho contém um produto que ainda não está liberado para pagamento.');
      const n=(merged.get(v.sku)?.quantity||0)+x.qty;
      if(n>10)return fail('Máximo de dez unidades da mesma variação.');
      merged.set(v.sku,{sku:v.sku,quantity:n,p,v});
    }
    details=[...merged.values()];
    if(details.length>15||details.reduce((sum,x)=>sum+x.quantity,0)>30)
      return fail('A quantidade ultrapassa o limite do carrinho.');
    if(details.length===1&&details[0].quantity===1)
      return fail('Para comprar uma única peça, escolha a opção de pagamento na página do produto.');
    items=details.map(x=>({sku:x.sku,quantity:x.quantity}));
    subtotal=details.reduce((sum,x)=>sum+x.v.priceCents*x.quantity,0);
    subtotalEl.textContent=money(subtotal);
    const display=document.getElementById('checkout-multi-items');
    for(const line of details){
      // Visual do item; os valores e a elegibilidade continuam validados no servidor.
      const item=document.createElement('article');item.className='checkout-product';
      const thumb=document.createElement('img');thumb.className='checkout-item-image';
      thumb.src=line.p.image;thumb.alt='';thumb.loading='lazy';thumb.width=88;thumb.height=88;
      const info=document.createElement('div');info.className='checkout-item-details';
      const title=document.createElement('strong');title.className='checkout-item-name';
      title.textContent=line.p.title;
      const variation=document.createElement('span');variation.className='checkout-item-variation';
      variation.textContent='Variação: '+line.v.label;
      const quantity=document.createElement('span');quantity.className='checkout-item-quantity';
      quantity.textContent='Quantidade: '+line.quantity;
      info.append(title,variation,quantity);
      const cost=document.createElement('strong');cost.className='checkout-item-price';
      cost.textContent=money(line.v.priceCents*line.quantity);
      item.append(thumb,info,cost);display.append(item);
    }
    root.hidden=false;status.textContent='Revise a entrega e os dados antes do pagamento.';
    let draft=null;
    try{
      const saved=sessionStorage.getItem('douglasMultiCheckoutDeliveryDraft_v1');
      sessionStorage.removeItem('douglasMultiCheckoutDeliveryDraft_v1');
      if(saved)draft=JSON.parse(saved);
    }catch{}
    if(draft && /^\d{8}$/.test(draft.zipCode||'') &&
      JSON.stringify(draft.items)===JSON.stringify(raw.map(x=>[x.id,x.variant,x.qty]))){
      zip.value=draft.zipCode.slice(0,5)+'-'+draft.zipCode.slice(5);
      // CEP herdado do carrinho: iniciar também a busca automática do endereço.
      zip.dispatchEvent(new Event('change',{bubbles:true}));
      quoteFreight(draft.shippingOptionId).catch(()=>{});
    }else if(/^\d{8}$/.test(digits(zip.value))){
      // Também cobre CEP preenchido pelo navegador após voltar ao checkout.
      scheduleFreight();
    }else{
      quoteStatus.textContent='Informe seu CEP: o frete será calculado automaticamente.';
      payStatus.textContent='O pagamento será liberado após escolher a entrega.';
    }
  }catch(e){
    fail('A disponibilidade do pagamento não pôde ser verificada. Volte ao carrinho.');
  }
}
function scheduleFreight(){
  // Sair do campo CEP não pode apagar uma cotação já válida.
  if(quotedZip && digits(zip.value)===quotedZip && options.length)return;
  if(quoteTimer!==null){clearTimeout(quoteTimer);quoteTimer=null;}
  resetQuotes();
  // Recalcular a cotação automaticamente quando o CEP estiver completo.
  const code=digits(zip.value);
  if(!/^\d{8}$/.test(code)){
    quoteStatus.textContent='Informe um CEP de 8 números para calcular o frete.';
    return;
  }
  if(!items.length){
    quoteStatus.textContent='Carregando os produtos do pedido…';
    return;
  }
  quoteStatus.textContent='CEP completo. Consultando frete automaticamente…';
  payStatus.textContent='Consultando transportadoras para calcular o total.';
  const scheduledToken=quoteToken;
  quoteTimer=setTimeout(()=>{
    quoteTimer=null;
    if(scheduledToken===quoteToken && digits(zip.value)===code)quoteFreight();
  },550);
}
zip.addEventListener('input',scheduleFreight);
zip.addEventListener('change',scheduleFreight);
quoteButton.addEventListener('click',()=>quoteFreight());
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(doingRequest||!form.reportValidity()||!currentSelection||
    quotedZip!==digits(zip.value)||!items.length)return;
  payButton.disabled=true;payStatus.textContent='Conferindo produtos, endereço e frete…';
  const buyer={};
  for(const name of ['name','email','phone','taxId','street','number',
    'complement','neighborhood','city','state']){
      buyer[name]=String(form.elements[name]?.value||'').trim();
  }
  buyer.zipCode=quotedZip;
  try{
    const data=await request('/api/checkout/live',{
      zipCode:quotedZip,items,shippingOptionId:currentSelection,buyer
    });
    const quote=options.find(x=>x.id===currentSelection);
    const expected=subtotal+Math.round(quote.shippingCost*100);
    if(!Number.isSafeInteger(data.totalCents)||data.totalCents!==expected){
      resetQuotes();
      quoteStatus.textContent='A cotação mudou. Calcule o frete novamente antes de pagar.';
      payStatus.textContent='O valor do pedido foi atualizado pelo servidor. Nenhum pagamento foi iniciado.';
      return;
    }
    const target=new URL(data.checkoutUrl);
    if(target.protocol!=='https:'||
      !['checkout.infinitepay.com.br','pay.infinitepay.io'].includes(target.hostname))
      throw Error('bad_checkout_url');
    payStatus.textContent='Abrindo o ambiente seguro da InfinitePay…';
    window.location.assign(target.href);
  }catch(e){
    // Falhas do gateway NÃO invalidam a cotação de frete já aceita.
    // O servidor só marca o pedido como aguardando pagamento após criar
    // e salvar o link seguro, e não cobra pelo formulário do nosso site.
    const details={
      infinitepay_auth_failed:'A InfinitePay não autorizou a integração da loja. Não foi possível abrir o pagamento. Avise o responsável pela loja.',
      infinitepay_request_rejected:'A InfinitePay recusou a solicitação de pagamento. O frete e o total foram preservados. A loja precisa revisar os dados da integração.',
      infinitepay_provider_unavailable:'A InfinitePay está temporariamente indisponível. Seu frete permanece calculado. Tente novamente mais tarde.',
      infinitepay_connection_failed:'Não foi possível conectar à InfinitePay agora. O frete continua calculado; tente novamente.',
      infinitepay_response_invalid:'O endereço de pagamento recebido não passou na verificação de segurança. Nenhum redirecionamento foi realizado.',
      checkout_persistence_failed:'A loja não conseguiu registrar o pagamento com segurança. Não tente pagar novamente até revisar a situação com a loja.',
      bad_checkout_url:'O endereço de pagamento não passou na verificação de segurança.'
    };
    payStatus.textContent=details[e?.message]||
      'Não foi possível iniciar o pagamento. O frete e o total continuam calculados. Confira a mensagem ou entre em contato com a loja.';
  }finally{payButton.disabled=!options.length;}
});
init();
})();