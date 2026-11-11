/* Checkout Pro: disponível apenas após autorização explícita do backend. */
(() => {
  'use strict';
  const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const notice=document.getElementById('checkout-readiness');
  const container=document.getElementById('checkout-container');
  if(!notice||!container)return;
  const format=cents=>new Intl.NumberFormat('pt-BR',{
    style:'currency',currency:'BRL'
  }).format(cents/100);
  const normalize=value=>String(value||'').replace(/\D/g,'');
  // Somente produtos cadastrados pela loja. Query string nunca define preço.
  // Backend valida novamente SKU, preço, aprovação comercial e frete.
  const extras=Object.freeze({
    'caneca-salve-regina-preta':{
      title:'Caneca Salve Regina — Partitura Gregoriana',
      detail:'Caneca com partitura gregoriana',price:4990,
      image:'/assets/img/loja/Salve-Regina/web/caneca-partitura-individual.png'
    },
    'caneca-salve-regina-pb':{
      title:'Caneca Salve Regina — Nossa Senhora',
      detail:'Caneca com arte mariana',price:4990,
      image:'/assets/img/loja/Salve-Regina/web/caneca-nossa-senhora-individual.png'
    },
    'ecobag-salve-regina-m':{
      title:'Ecobag Salve Regina — Tamanho M',
      detail:'Ecobag tamanho M',price:3990,
      image:'/assets/img/loja/Salve-Regina/web/ecobag-480.webp'
    },
    'ecobag-salve-regina-g':{
      title:'Ecobag Salve Regina — Tamanho G',
      detail:'Ecobag tamanho G',price:3990,
      image:'/assets/img/loja/Salve-Regina/web/ecobag-480.webp'
    }
  });
  const params=new URLSearchParams(location.search);
  const requestedSku=params.get('sku');
  const isCorIesu=Boolean(window.DouglasCorIesuPicker?.parseSku(requestedSku));
  const extra=isCorIesu
    ? {title:'Camiseta Cor Iesu Sacratissimum',
       detail:'DTF em duas áreas: medalhão na frente, gravura gótica nas costas',
       price:10990,image:'/assets/img/loja/cor-iesu/costas-modelo-480.webp'}
    : requestedSku && Object.hasOwn(extras,requestedSku)?extras[requestedSku]:null;
  const prices=isCorIesu?{P:10990,M:10990,G:10990,GG:10990}
    : extra?{UNICO:extra.price}:{P:10990,M:10990,G:10990,GG:10990,XG:11990};
  let picker=null;
  const skuForSize=size=>isCorIesu?(picker?.sku()||requestedSku)
    :extra?requestedSku:'salve-regina-preta-'+size.toLowerCase();
  const productLabel=size=>isCorIesu
    ?picker?.label()||'Camiseta Cor Iesu Sacratissimum'
    :extra?extra.title:'Camiseta preta · tamanho '+size;
  // Prévia visual explícita: nenhum campo ativo, requisição de pedido ou cobrança.
  const visualPreview=params.get('preview')==='visual';
  const error=text=>{notice.textContent=text;notice.classList.add('warning');};
  const fallback=document.createElement('a');
  fallback.href='/pages/cart.html';
  fallback.textContent='Voltar ao carrinho';
  const unavailable=()=>{
    error('Não foi possível confirmar a disponibilidade do pagamento agora. Tente novamente mais tarde ou entre em contato com a loja.');
    notice.append(' ',fallback);
  };
  const getJson=async(url,options={})=>{
    const response=await fetch(url,{cache:'no-store',mode:'cors',
      signal:AbortSignal.timeout(18000),...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const problem=new Error(data?.error||'service_unavailable');
      problem.httpStatus=response.status;
      throw problem;
    }
    return data;
  };
  async function init(){
    let readiness;
    try {readiness=await getJson(API+'/api/checkout/live/readiness');}
    catch {if(!visualPreview){unavailable();return;}}
    const previewOnly=visualPreview;
    const corIesuReady=isCorIesu && Array.isArray(readiness?.availableSkus) &&
      readiness.availableSkus.some(s=>window.DouglasCorIesuPicker.parseSku(s));
    if((readiness?.checkoutEnabled!==true ||
        (requestedSku && !extra) ||
        (extra && !isCorIesu && !readiness?.availableSkus?.includes(requestedSku)) ||
        (isCorIesu && !corIesuReady)) &&
        !visualPreview){unavailable();return;}
    notice.textContent=previewOnly
      ? 'PRÉVIA VISUAL — Este checkout está desativado. Os campos são demonstrativos e não é possível fazer pedidos, cotar frete ou pagar.'
      : 'Confira seus dados e selecione o frete antes de pagar.';
    notice.classList.toggle('warning',previewOnly);
    document.body.classList.toggle('checkout-preview',previewOnly);
    const collection=document.querySelector('main > .eyebrow');
    if(collection && isCorIesu)collection.textContent='Coleção Cor Iesu Sacratissimum';
    container.hidden=false;
    container.innerHTML=`
      <form id="sale-checkout" class="checkout-grid">
        <div class="checkout-form-column">
          <section class="checkout-panel" aria-labelledby="product-heading">
            <div class="checkout-section-heading"><span class="checkout-step">1</span><div><p class="checkout-eyebrow">Revise seu produto</p><h2 id="product-heading">Produtos do pedido</h2></div></div>
            <div class="checkout-product">
              <img src="${extra?extra.image:'/assets/img/loja/Salve-Regina/web/camiseta-480.webp'}" width="92" height="92" alt="Produto da loja">
              <div>
                <strong id="checkout-product-name">${extra?extra.title:'Camiseta Salve Regina · Preta'}</strong>
                <p>${extra?extra.detail:'Estampa gregoriana e arte mariana'} · 1 unidade</p>
                ${isCorIesu?'':extra
                  ?'<div class="checkout-fixed-variant"><span>Modelo selecionado</span><strong>1 unidade</strong></div><input type="hidden" name="size" value="UNICO">'
                  :'<label class="checkout-select-label">Tamanho <select name="size" required><option value="P">P</option><option value="M">M</option><option value="G" selected>G</option><option value="GG">GG</option><option value="XG">XG (+ R$ 10,00)</option></select></label>'}
              </div>
            </div>
            ${isCorIesu?window.DouglasCorIesuPicker.render(requestedSku):''}
            <p class="hint">Nesta etapa é possível comprar uma peça por pedido. Para combinar produtos, use a cotação assistida.</p>
          </section>
          <section class="checkout-panel" aria-labelledby="shipping-heading">
            <div class="checkout-section-heading"><span class="checkout-step">2</span><div><p class="checkout-eyebrow">Compare as transportadoras</p><h2 id="shipping-heading">Forma de entrega</h2></div></div>
            <div class="checkout-ship-form">
              <label>CEP de entrega <input name="zipCode" autocomplete="postal-code" inputmode="numeric" maxlength="9" pattern="[0-9]{5}-?[0-9]{3}" placeholder="00000-000" required></label>
              <button type="button" id="ship-quote" class="secondary">Consultar frete</button>
            </div>
            <p id="ship-feedback" role="status" aria-live="polite"></p>
            <div id="ship-choices" hidden aria-label="Transportadoras e prazos"></div>
            <p class="hint">Os prazos exibidos são estimativas de transporte. O prazo de fabricação é informado separadamente. Retirada na fábrica não é oferecida.</p>
          </section>
          <section class="checkout-panel" aria-labelledby="address-heading">
            <div class="checkout-section-heading"><span class="checkout-step">3</span><div><p class="checkout-eyebrow">Envio pela transportadora escolhida</p><h2 id="address-heading">Endereço de entrega</h2></div></div>
            <div class="checkout-field-grid">
              <label class="checkout-field-wide">Rua ou avenida <input name="street" maxlength="180" autocomplete="address-line1" required></label>
              <label>Número <input name="number" maxlength="30" required></label>
              <label>Complemento (opcional) <input name="complement" maxlength="120" autocomplete="address-line2"></label>
              <label>Bairro <input name="neighborhood" maxlength="90" required></label>
              <label>Cidade <input name="city" maxlength="90" autocomplete="address-level2" required></label>
              <label>Estado (UF) <input name="state" maxlength="2" autocomplete="address-level1" placeholder="SP" pattern="[A-Za-z]{2}" required></label>
            </div>
            <p class="hint">O CEP informado acima deve corresponder ao endereço de entrega.</p>
          </section>
          <section class="checkout-panel" aria-labelledby="buyer-heading">
            <div class="checkout-section-heading"><span class="checkout-step">4</span><div><p class="checkout-eyebrow">Para confirmar seu pedido</p><h2 id="buyer-heading">Dados do comprador</h2></div></div>
            <div class="checkout-field-grid">
              <label>Nome completo <input name="name" autocomplete="name" maxlength="160" required></label>
              <label>E-mail <input name="email" type="email" autocomplete="email" maxlength="200" required></label>
              <label>Telefone com DDD <input name="phone" autocomplete="tel" inputmode="tel" required></label>
              <label>CPF <input name="taxId" inputmode="numeric" maxlength="14" required></label>
            </div>
          </section>
        </div>
        <aside class="checkout-sidebar" aria-label="Resumo e pagamento">
          <div class="checkout-summary">
            <p class="checkout-eyebrow">Sua compra</p>
            <h2>Resumo do pedido</h2>
            <div class="total">
              <p>Produto (1 unidade) <strong id="product-amount">${format(extra?extra.price:10990)}</strong></p>
              ${isCorIesu?'<p class="checkout-summary-variant">Cor · tamanho <strong id="checkout-summary-variant"></strong></p>':''}
              <p>Frete <strong id="freight-amount">Selecione uma opção</strong></p>
              <p>Total <strong id="checkout-total">A calcular</strong></p>
            </div>
            <div class="checkout-secure">
              <span aria-hidden="true">✦</span>
              <div><strong>Pagamento seguro pela InfinitePay</strong>
                <p>Você escolherá os meios de pagamento disponíveis, como Pix e cartões, diretamente no ambiente da InfinitePay. Parcelamento e condições dependem do provedor.</p>
              </div>
            </div>
            <label class="confirm"><input name="confirm" type="checkbox" required> Li e concordo com as <a href="/pages/condicoes-da-loja.html" target="_blank" rel="noopener noreferrer">condições de compra, entrega, trocas e privacidade</a>.</label>
            <p class="hint">Seu endereço será protegido no servidor. Dados de cartão não são digitados nesta loja.</p>
            <button type="submit" class="pay" id="pay-now" disabled>Ir para pagamento seguro →</button>
            <p id="payment-feedback" role="status" aria-live="polite"></p>
            <a class="checkout-back-link" href="/pages/cart.html">← Revisar carrinho</a>
          </div>
        </aside>
      </form>`;
    const form=container.querySelector('form');
    if(isCorIesu)picker=window.DouglasCorIesuPicker.mount(form,{
      requestedSku,availableSkus:readiness?.availableSkus
    });
    const size=form.elements.size;
    if(isCorIesu){
      form.querySelector('#checkout-product-name').textContent=picker.label();
      form.querySelector('#checkout-summary-variant').textContent=
        picker.label().replace('Camiseta Cor Iesu Sacratissimum — ','');
    }
    if(!extra){
      // O endpoint já confere somente as variações com frete homologado.
      // Não permitir selecionar tamanhos cuja compra real falharia depois.
      const permitted=new Set(Array.isArray(readiness?.availableSkus)?
        readiness.availableSkus:[]);
      for(const option of size.options){
        option.disabled=!permitted.has(skuForSize(option.value));
      }
      if(![...size.options].some(option=>!option.disabled)){
        unavailable();container.hidden=true;return;
      }
    }
    // A variante escolhida é somente uma preferência visual.
    // O Worker confirma SKU, preço, frete e autorização no D1.
    const requestedSize=params.get('size');
    if(!extra && requestedSize && Object.hasOwn(prices,requestedSize) &&
       [...size.options].some(option=>option.value===requestedSize && !option.disabled)){
      size.value=requestedSize;
    }else if(!extra && size.selectedOptions[0]?.disabled){
      size.value=[...size.options].find(option=>!option.disabled).value;
    }
    // Aproveita somente CEP e preferência de frete escolhidos no carrinho.
    // Não confia no valor antigo: a VAVI será consultada novamente aqui.
    let cartDelivery=null;
    try {
      const saved=previewOnly?null:sessionStorage.getItem('douglasCheckoutDeliveryDraft_v1');
      if(!previewOnly) sessionStorage.removeItem('douglasCheckoutDeliveryDraft_v1');
      if(saved){
        const draft=JSON.parse(saved);
        const matchesProduct=extra
          ? draft?.sku===requestedSku && draft?.size==='UNICO'
          : draft?.size===size.value && (!draft?.sku || draft.sku===skuForSize(size.value));
        if(matchesProduct && /^\d{8}$/.test(draft.zipCode) &&
          typeof draft.shippingOptionId==='string')
          cartDelivery=draft;
      }
    } catch { cartDelivery=null; }
    const selection=document.getElementById('checkout-selection');
    if(selection) selection.textContent=productLabel(size.value)+
      ' · 1 unidade — '+format(prices[size.value])+' + frete';
    const productAmount=form.querySelector('#product-amount');
    const price=()=>prices[size.value];
    const sku=()=>skuForSize(size.value);
    productAmount.textContent=format(price());
    const zip=form.elements.zipCode,quoteButton=form.querySelector('#ship-quote');
    if(cartDelivery) zip.value=cartDelivery.zipCode.slice(0,5)+'-'+cartDelivery.zipCode.slice(5);
    const choices=form.querySelector('#ship-choices'),shipFeedback=form.querySelector('#ship-feedback');
    const freightAmount=form.querySelector('#freight-amount'),total=form.querySelector('#checkout-total');
    const pay=form.querySelector('#pay-now'),payStatus=form.querySelector('#payment-feedback');
    if(previewOnly){
      container.querySelectorAll('input,select,button').forEach(field=>{field.disabled=true;});
      const shipping=container.querySelector('#ship-feedback');
      if(shipping) shipping.textContent='As transportadoras aparecerão aqui após a consulta de frete.';
      const payment=container.querySelector('#payment-feedback');
      if(payment) payment.textContent='Somente visualização. Nenhuma compra ou cobrança é realizada nesta página.';
      const total=container.querySelector('#checkout-total');
      if(total) total.textContent='A confirmar após cotação';
      return;
    }
    // Preenche endereço a partir do CEP, mantendo os campos editáveis.
    window.DouglasCheckoutAddress?.mount(form);
    let options=[],quotedZip='',quotedSku='';
    function resetQuote(){
      options=[];quotedZip='';quotedSku='';choices.hidden=true;choices.replaceChildren();
      freightAmount.textContent='Selecione uma opção';total.textContent='A calcular';
      pay.disabled=true;
    }
    zip.addEventListener('input',resetQuote);
    size.addEventListener('change',()=>{
      if(selection) selection.textContent=productLabel(size.value)+
        ' · 1 unidade — '+format(price())+' + frete';
      productAmount.textContent=format(price());
      if(isCorIesu){
        form.querySelector('#checkout-product-name').textContent=productLabel(size.value);
        form.querySelector('#checkout-summary-variant').textContent=
          productLabel(size.value).replace('Camiseta Cor Iesu Sacratissimum — ','');
        if(!visualPreview){
          const url=new URL(location.href);
          url.searchParams.set('sku',sku());
          url.searchParams.delete('size');
          history.replaceState(null,'',url);
        }
      }
      resetQuote();
      if(isCorIesu)quoteButton.disabled=!picker.isAvailable();
      shipFeedback.textContent=isCorIesu && !picker.isAvailable()
        ? 'Cor e tamanho sob consulta. Escolha uma combinação disponível para calcular o frete.'
        : 'Variação alterada. Consulte novamente o frete.';
    });
    function selected(){
      const radio=choices.querySelector('input[name="shippingOption"]:checked');
      return options.find(o=>o.id===radio?.value);
    }
    choices.addEventListener('change',()=>{
      const o=selected();
      if(!o)return;
      choices.querySelectorAll('.shipping-choice').forEach(line=>
        line.classList.toggle('is-selected',line.querySelector('input')?.checked===true));
      const cents=Math.round(o.shippingCost*100);
      freightAmount.textContent=format(cents);
      total.textContent=format(price()+cents);
      pay.disabled=false;
    });
    quoteButton.addEventListener('click',async()=>{
      if(isCorIesu && !picker.isAvailable()){
        shipFeedback.textContent='Esta cor e tamanho ainda não estão disponíveis para compra online.';
        return;
      }
      const code=normalize(zip.value);
      resetQuote();
      if(!/^\d{8}$/.test(code)){shipFeedback.textContent='Informe um CEP com 8 números.';zip.focus();return;}
      const requestedSku=sku();
      quoteButton.disabled=true;shipFeedback.textContent='Consultando frete...';
      try {
        const data=await getJson(API+'/api/shipping/preview',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({zipCode:code,sku:sku()})
        });
        if(normalize(zip.value)!==code || sku()!==requestedSku)return;
        options=(data.zipCode===code && data.sku===requestedSku &&
          Array.isArray(data.options)?data.options:[]).filter(o=>
          o && o.isActive===true &&
          typeof o.id==='string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(o.id) &&
          typeof o.name==='string' && o.name.length>0 && o.name.length<=120 &&
          Number.isFinite(o.shippingCost) && o.shippingCost>=0 &&
          o.shippingCost<=10000 &&
          Math.abs(o.shippingCost*100-Math.round(o.shippingCost*100))<0.000001 &&
          Number.isInteger(o.deliveryTime) && o.deliveryTime>=0 && o.deliveryTime<=365 &&
          !/retirada|retire|pickup/i.test(o.name)
        );
        if(new Set(options.map(o=>o.id)).size!==options.length)options=[];
        if(!options.length){shipFeedback.textContent='Não há frete disponível para este CEP.';return;}
        quotedZip=code;quotedSku=requestedSku;
        const cheapest=Math.min(...options.map(o=>o.shippingCost));
        const fastest=Math.min(...options.map(o=>o.deliveryTime));
        options.forEach((o,i)=>{
          const label=document.createElement('label');
          label.className='shipping-choice';
          const input=document.createElement('input');
          input.name='shippingOption';input.type='radio';input.value=o.id;
          input.checked=cartDelivery
            ? (options.some(candidate=>candidate.id===cartDelivery.shippingOptionId)
              ? o.id===cartDelivery.shippingOptionId : i===0)
            : i===0;
          label.classList.toggle('is-selected',input.checked);
          const caption=document.createElement('span');
          caption.className='shipping-choice-info';
          const title=document.createElement('strong');
          title.textContent=o.name;
          const time=document.createElement('small');
          time.textContent='Transporte estimado: '+o.deliveryTime+' dia(s) úteis';
          caption.append(title,time);
          if(o.shippingCost===cheapest){
            const mark=document.createElement('small');
            mark.className='shipping-best';
            mark.textContent='Menor valor';
            caption.append(mark);
          }else if(o.deliveryTime===fastest){
            const mark=document.createElement('small');
            mark.textContent='Menor prazo de transporte';
            caption.append(mark);
          }
          const value=document.createElement('strong');
          value.className='shipping-choice-price';
          value.textContent=o.shippingCost===0?'Grátis':format(Math.round(o.shippingCost*100));
          label.append(input,caption,value);choices.append(label);
        });
        choices.hidden=false;choices.dispatchEvent(new Event('change'));
        shipFeedback.textContent='Frete consultado; valor e disponibilidade serão reconferidos no servidor ao pagar.';
      }catch{
        shipFeedback.textContent='Não foi possível consultar o frete. Volte à loja e solicite uma cotação.';
      }finally{quoteButton.disabled=false;}
    });
    if(cartDelivery) quoteButton.click();
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      if(isCorIesu && !picker.isAvailable()){
        payStatus.textContent='Esta cor e tamanho ainda não estão disponíveis para compra online.';
        return;
      }
      if(normalize(zip.value)!==quotedZip||quotedSku!==sku()||!selected()){
        payStatus.textContent='Consulte o frete para o CEP informado antes de pagar.';return;
      }
      pay.disabled=true;quoteButton.disabled=true;
      payStatus.textContent='Preparando checkout seguro...';
      const fields=form.elements;
      const buyer={};
      for(const key of ['name','email','phone','taxId','street','number',
        'complement','neighborhood','city','state']){
        buyer[key]=String(fields[key].value).trim();
      }
      buyer.zipCode=quotedZip;
      try{
        const data=await getJson(API+'/api/checkout/live',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            zipCode:quotedZip,shippingOptionId:selected().id,
            items:[{sku:sku(),quantity:1}],buyer
          })
        });
        const u=new URL(data.checkoutUrl);
        if(u.protocol!=='https:'||!['checkout.infinitepay.com.br','checkout.infinitepay.io','pay.infinitepay.io'].includes(u.hostname))
          throw new Error('provider_url_invalid');
        window.location.assign(u.href);
      }catch(problem){
        const code=String(problem?.message||'');
        const helpful={
          invalid_delivery:'Revise nome, e-mail, telefone com DDD, CPF e endereço de entrega.',
          delivery_zip_mismatch:'O CEP do frete deve ser o mesmo do endereço de entrega.',
          shipping_option_invalid:'Essa opção de frete mudou. Clique em Consultar frete novamente.',
          shipping_provider_unavailable:'Não foi possível confirmar o frete agora. Tente uma nova consulta.',
          live_price_unapproved:'Este produto está temporariamente indisponível. Entre em contato com a loja.',
          live_product_unavailable:'Esta combinação não está aprovada para compra online. Escolha uma peça disponível.',
          payment_provider_unavailable:'A plataforma de pagamento não iniciou o checkout. Tente novamente mais tarde.',
          invalid_order:'Não foi possível confirmar o pedido. Revise a quantidade e a entrega.'
        }[code];
        payStatus.textContent=helpful||
          'Não foi possível abrir o pagamento. Se o problema continuar, informe à loja a etapa em que ocorreu.';
        pay.disabled=false;quoteButton.disabled=false;
      }
    });
  }
  if(requestedSku && !extra && !visualPreview){
    unavailable();
  }else{
    init();
  }
})();
