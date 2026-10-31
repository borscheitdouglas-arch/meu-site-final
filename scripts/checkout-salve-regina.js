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
  const error=text=>{notice.textContent=text;notice.classList.add('warning');};
  const fallback=document.createElement('a');
  fallback.href='/pages/loja.html#colecao-salve-regina';
  fallback.textContent='Solicitar compra por e-mail';
  const unavailable=()=>{error('Pagamento automático ainda não disponível. Use a consulta assistida na loja.');notice.append(' ',fallback);};
  const getJson=async(url,options={})=>{
    const response=await fetch(url,{cache:'no-store',mode:'cors',
      signal:AbortSignal.timeout(18000),...options});
    const data=await response.json();
    if(!response.ok)throw new Error(data?.error||'service_unavailable');
    return data;
  };
  async function init(){
    let readiness;
    try {readiness=await getJson(API+'/api/checkout/live/readiness');}
    catch {unavailable();return;}
    if(readiness?.checkoutEnabled!==true){unavailable();return;}
    notice.textContent='Confira seus dados e selecione o frete antes de pagar.';
    container.hidden=false;
    container.innerHTML=`
      <form id="sale-checkout">
        <fieldset>
          <legend>Entrega</legend>
          <label>CEP <input name="zipCode" autocomplete="postal-code" inputmode="numeric" maxlength="9" placeholder="00000-000" required></label>
          <button type="button" id="ship-quote" class="secondary">Consultar frete</button>
          <div id="ship-choices" hidden></div>
          <p id="ship-feedback" role="status"></p>
        </fieldset>
        <fieldset>
          <legend>Dados do comprador</legend>
          <label>Nome completo <input name="name" autocomplete="name" maxlength="160" required></label>
          <label>E-mail <input name="email" type="email" autocomplete="email" maxlength="200" required></label>
          <label>Telefone com DDD <input name="phone" autocomplete="tel" inputmode="tel" required></label>
          <label>CPF <input name="taxId" inputmode="numeric" maxlength="14" required></label>
        </fieldset>
        <fieldset>
          <legend>Endereço</legend>
          <label>Rua/Avenida <input name="street" maxlength="180" autocomplete="address-line1" required></label>
          <label>Número <input name="number" maxlength="30" required></label>
          <label>Complemento <input name="complement" maxlength="120" autocomplete="address-line2"></label>
          <label>Bairro <input name="neighborhood" maxlength="90" required></label>
          <label>Cidade <input name="city" maxlength="90" autocomplete="address-level2" required></label>
          <label>Estado (UF) <input name="state" maxlength="2" autocomplete="address-level1" required></label>
        </fieldset>
        <div class="total">
          <p>Produto: <strong>R$ 109,90</strong></p>
          <p>Frete: <strong id="freight-amount">Selecione uma opção</strong></p>
          <p>Total: <strong id="checkout-total">A calcular</strong></p>
        </div>
        <label class="confirm"><input name="confirm" type="checkbox" required> Concordo com os dados da compra e estou ciente da fabricação sob demanda e do prazo de transporte.</label>
        <p class="hint">O endereço será protegido no servidor e utilizado para o envio. Dados de cartão são informados apenas no Mercado Pago.</p>
        <button type="submit" class="pay" id="pay-now" disabled>Ir para pagamento seguro</button>
        <p id="payment-feedback" role="status"></p>
      </form>`;
    const form=container.querySelector('form');
    const zip=form.elements.zipCode,quoteButton=form.querySelector('#ship-quote');
    const choices=form.querySelector('#ship-choices'),shipFeedback=form.querySelector('#ship-feedback');
    const freightAmount=form.querySelector('#freight-amount'),total=form.querySelector('#checkout-total');
    const pay=form.querySelector('#pay-now'),payStatus=form.querySelector('#payment-feedback');
    let options=[],quotedZip='';
    function resetQuote(){
      options=[];quotedZip='';choices.hidden=true;choices.replaceChildren();
      freightAmount.textContent='Selecione uma opção';total.textContent='A calcular';
      pay.disabled=true;
    }
    zip.addEventListener('input',resetQuote);
    function selected(){
      const radio=choices.querySelector('input[name="shippingOption"]:checked');
      return options.find(o=>o.id===radio?.value);
    }
    choices.addEventListener('change',()=>{
      const o=selected();
      if(!o)return;
      const cents=Math.round(o.shippingCost*100);
      freightAmount.textContent=format(cents);
      total.textContent=format(10990+cents);
      pay.disabled=false;
    });
    quoteButton.addEventListener('click',async()=>{
      const code=normalize(zip.value);
      resetQuote();
      if(!/^\d{8}$/.test(code)){shipFeedback.textContent='Informe um CEP com 8 números.';zip.focus();return;}
      quoteButton.disabled=true;shipFeedback.textContent='Consultando frete...';
      try {
        const data=await getJson(API+'/api/shipping/preview',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({zipCode:code})
        });
        if(normalize(zip.value)!==code)return;
        options=(Array.isArray(data.options)?data.options:[]).filter(o=>
          o && o.isActive===true && typeof o.id==='string' &&
          typeof o.name==='string' && Number.isFinite(o.shippingCost) &&
          o.shippingCost>=0 && Number.isInteger(o.deliveryTime) &&
          !/retirada|retire|pickup/i.test(o.name)
        );
        if(!options.length){shipFeedback.textContent='Não há frete disponível para este CEP.';return;}
        quotedZip=code;
        options.forEach((o,i)=>{
          const label=document.createElement('label');
          label.className='shipping-choice';
          const input=document.createElement('input');
          input.name='shippingOption';input.type='radio';input.value=o.id;input.checked=i===0;
          const caption=document.createElement('span');
          caption.textContent=o.name+' — '+format(Math.round(o.shippingCost*100))+
            ' · Transporte: '+o.deliveryTime+' dia(s)';
          label.append(input,caption);choices.append(label);
        });
        choices.hidden=false;choices.dispatchEvent(new Event('change'));
        shipFeedback.textContent='Frete consultado; valor e disponibilidade serão reconferidos no servidor ao pagar.';
      }catch{
        shipFeedback.textContent='Não foi possível consultar o frete. Volte à loja e solicite uma cotação.';
      }finally{quoteButton.disabled=false;}
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      if(normalize(zip.value)!==quotedZip||!selected()){
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
            items:[{sku:'salve-regina-preta-g',quantity:1}],buyer
          })
        });
        const u=new URL(data.checkoutUrl);
        if(u.protocol!=='https:'||!['mercadopago.com.br','www.mercadopago.com.br',
          'mercadopago.com','www.mercadopago.com'].includes(u.hostname))
          throw new Error('provider_url_invalid');
        window.location.assign(u.href);
      }catch{
        payStatus.textContent='Não foi possível iniciar o pagamento. Nenhuma cobrança foi concluída. Revise os dados ou entre em contato.';
        pay.disabled=false;quoteButton.disabled=false;
      }
    });
  }
  init();
})();
