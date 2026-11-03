/* Sacola local da coleção: o servidor (não o navegador) autoriza pagamentos.
   Produtos sem preço final podem ser adicionados para solicitar uma cotação.
   Não guarda dados pessoais, não cria pedido nem dispara cobrança. */
(() => {
  'use strict';
  const CART_KEY = 'douglasShopCart_v2';
  const CATALOG_URL = '/content/shop-cart-catalog.json';
  const API = 'https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const MAX_QTY = 10, MAX_TOTAL = 30;
  const money = cents => new Intl.NumberFormat('pt-BR', {
    style:'currency', currency:'BRL'
  }).format(cents / 100);
  let catalog = new Map();
  let ready = false;
  let multiReady = false;
  let readySkus = new Set();
  const email = 'douglas.assumpcao27@gmail.com';

  function rawCart() {
    try {
      const data = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function rows() {
    const validated = [], byKey = new Map();
    for (const item of rawCart().slice(0, 40)) {
      if (!item || typeof item.id !== 'string' || typeof item.variant !== 'string' ||
          !Number.isInteger(item.qty) || item.qty < 1) continue;
      const product = catalog.get(item.id);
      const variation = product?.variants?.find(v => v.code === item.variant);
      if (!variation) continue;
      const key = product.id + ':' + variation.code;
      const existing = byKey.get(key);
      if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + Math.min(MAX_QTY,item.qty));
      else if (validated.length < 15) {
        const row = {id:product.id, variant:variation.code, qty:Math.min(MAX_QTY,item.qty)};
        byKey.set(key,row); validated.push(row);
      }
    }
    return validated;
  }
  function persist(next) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(next)); }
    catch { notify('O navegador não conseguiu guardar a sacola.'); return false; }
    document.dispatchEvent(new Event('douglas-cart-change'));
    return true;
  }
  function count(cart = rows()) { return cart.reduce((sum,item) => sum + item.qty, 0); }
  function notify(message, showCartLink = false) {
    const target = document.getElementById('shop-cart-feedback') ||
                   document.getElementById('cart-feedback');
    if (!target) return;
    target.textContent = message;
    if (showCartLink) {
      const link = document.createElement('a');
      link.href = '/pages/cart.html';
      link.className = 'shop-cart-feedback-link';
      link.textContent = 'Ver carrinho e continuar →';
      target.append(' ', link);
    }
  }
  function updateCount() {
    const total = count();
    document.querySelectorAll('[data-cart-count]').forEach(node => {
      node.textContent = String(total);
      node.hidden = total === 0;
    });
  }
  function add(id, variantCode, amount = 1) {
    const product = catalog.get(id);
    const variant = product?.variants.find(v => v.code === variantCode);
    if (!product || !variant || !Number.isInteger(amount) || amount < 1) {
      notify('Escolha uma variação válida.'); return false;
    }
    const cart = rows();
    const found = cart.find(item => item.id === id && item.variant === variantCode);
    if (found) {
      if (found.qty + amount > MAX_QTY) {
        notify('Máximo de 10 unidades por variação.'); return false;
      }
      found.qty += amount;
    } else {
      if (cart.length >= 15) { notify('A sacola atingiu o limite de modelos.'); return false; }
      cart.push({id,variant:variantCode,qty:amount});
    }
    if (count(cart) > MAX_TOTAL) { notify('Máximo de 30 itens por sacola.'); return false; }
    if (!persist(cart)) return false;
    notify(product.title + ' adicionado ao carrinho.', true);
    updateCount();
    return true;
  }
  function updateQty(id,variant,qty) {
    const next = rows().filter(x => !(x.id === id && x.variant === variant && qty <= 0));
    const row = next.find(x => x.id === id && x.variant === variant);
    if (row && qty > 0) row.qty = Math.min(MAX_QTY,qty);
    if (persist(next)) { renderCart(); updateCount(); }
  }
  function make(tag, className, textValue) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  }
  function makeButton(label, action, disabled = false) {
    const button = make('button','cart-quantity-button',label);
    button.type = 'button'; button.disabled = disabled;
    button.addEventListener('click', action);
    return button;
  }
  function draftMessage(cart) {
    const lines = ['Olá! Gostaria de consultar a disponibilidade e o valor final dos itens da coleção Salve Regina:', ''];
    for (const item of cart) {
      const product = catalog.get(item.id);
      const variant = product.variants.find(v => v.code === item.variant);
      lines.push('• ' + product.title + ' — ' + variant.label + ' — ' + item.qty + ' unidade(s)' +
        '');
      lines.push('  ' + (variant.priceCents === null ? 'Preço de venda pendente de confirmação'
        : 'Preço informado: ' + money(variant.priceCents) + ' por unidade'));
    }
    const freight=window.CartShipping?.getQuote(cart);
    if (freight) {
      const sum=cart.reduce((total,item)=>{
        const variant=catalog.get(item.id)?.variants.find(v=>v.code===item.variant);
        return total+(Number.isInteger(variant?.priceCents)?variant.priceCents*item.qty:0);
      },0);
      lines.push('', 'CEP: '+freight.zipCode,
        (freight.provisional?'Frete provisório (':'Frete estimado (')+
          freight.shippingName+'): '+money(freight.shippingCents),
        'Total estimado dos produtos + frete: '+money(sum+freight.shippingCents),
        'Transporte estimado: '+freight.deliveryDays+' dia(s), além do prazo de produção.');
    }
    lines.push('', 'Favor confirmar disponibilidade, preço de venda, produção e frete antes do pagamento.',
      'Esta mensagem é uma consulta, não um pedido pago.');
    return lines.join('\n');
  }
  function renderCart() {
    const target = document.getElementById('cart-root');
    if (!target) return;
    target.replaceChildren();
    const cart = rows();
    if (!cart.length) {
      window.CartShipping?.invalidate();
      const section = make('div','cart-empty');
      section.append(make('p','', 'Sua sacola está vazia.'));
      const link = make('a','cart-action','Conhecer os produtos');
      link.href = '/pages/loja.html#catalogo';
      section.append(link);target.append(section);return;
    }
    let knownTotal = 0, hasPending = false;
    const wrap = make('div','cart-checkout-layout');
    const list = make('div','cart-items');
    const listHeading=make('div','cart-items-heading');
    listHeading.append(
      make('h2','','Produtos no carrinho'),
      make('span','cart-items-count',count(cart)+' '+(count(cart)===1?'unidade':'unidades'))
    );
    list.append(listHeading);
    for (const item of cart) {
      const product = catalog.get(item.id);
      const variant = product.variants.find(v => v.code === item.variant);
      const row = make('article','cart-item');
      const img = make('img','cart-thumb');img.src = product.image;
      img.alt = product.title;img.loading = 'lazy';img.width=90;img.height=90;
      const content = make('div','cart-item-content');
      const category = make('p','cart-product-category',
        product.category==='camisetas'?'Camiseta':
        product.category==='canecas'?'Caneca':
        product.category==='ecobags'?'Ecobag':'Coleção Salve Regina');
      content.append(category,make('h3','',product.title),
        make('p','cart-variant','Variação: '+variant.label));
      if (product.status === 'preparation') content.append(make('p','cart-state','Em preparação · não disponível para compra automática'));
      if (product.status === 'consultation') content.append(make('p','cart-state',
        readySkus.has(variant.sku)?'Compra online disponível · 1 unidade por pedido':'Sob consulta · sem cobrança'));
      if (variant.priceCents === null) {
        hasPending = true;content.append(make('p','cart-amount','Preço final a confirmar'));
      } else {
        knownTotal += variant.priceCents * item.qty;
        content.append(make('p','cart-amount',money(variant.priceCents)+' por unidade'+(product.id==='camiseta-salve-regina'?'':' · sujeito a confirmação')));
      }
      const details=make('div','cart-line-details');
      details.append(make('span','','Quantidade e opções'));
      if(Number.isInteger(variant.priceCents)) {
        details.append(make('strong','cart-line-total',
          'Subtotal: '+money(variant.priceCents*item.qty)));
      }
      content.append(details);
      const qty = make('div','cart-quantity');
      const minus = makeButton('−',()=>updateQty(item.id,item.variant,item.qty-1));
      minus.setAttribute('aria-label','Diminuir quantidade de '+product.title);
      const amount = make('span','cart-quantity-number',String(item.qty));
      const plus = makeButton('+',()=>updateQty(item.id,item.variant,item.qty+1),item.qty>=MAX_QTY||count(cart)>=MAX_TOTAL);
      plus.setAttribute('aria-label','Aumentar quantidade de '+product.title);
      const remove=makeButton('Remover',()=>updateQty(item.id,item.variant,0));
      remove.className='cart-remove';
      qty.append(minus,amount,plus,remove);content.append(qty);
      row.append(img,content);list.append(row);
    }
    const aside = make('aside','cart-summary');
    aside.append(make('p','cart-summary-overline','Seu pedido'));
    aside.append(make('h2','','Resumo da compra'));
    const summaryRow=(className,label,value)=>{
      const line=make('div','cart-summary-row '+className);
      const caption=make('span','',label);
      const amount=make('strong','',value);
      line.append(caption,amount);
      aside.append(line);
      return {caption,amount};
    };
    summaryRow('cart-items-meta','Itens',String(count(cart)));
    summaryRow('cart-estimate','Subtotal dos produtos',
      knownTotal>0 ? money(knownTotal) : 'A confirmar');
    const freight=summaryRow('cart-freight','Frete','A calcular');
    const total=summaryRow('cart-total','Total com frete','A calcular');
    const shippingSlot=make('section','cart-shipping-slot');
    shippingSlot.setAttribute('aria-label','Calcular frete do carrinho');
    aside.append(shippingSlot);
    if (hasPending) aside.append(make('p','cart-disclaimer',
      'Há peças sem preço de venda definido. Nenhum total final pode ser calculado agora.'));
    aside.append(make('p','cart-disclaimer',
      'O frete e o valor total são reconferidos antes do pagamento. Produtos em preparação exigem consulta.'));
    const single = cart.length === 1 && cart[0].qty === 1;
    const exactShirt = single && cart[0].id === 'camiseta-salve-regina';
    const directSku = single
      ? catalog.get(cart[0].id)?.variants?.find(v=>v.code===cart[0].variant)?.sku
      : null;
    const direct = Boolean(ready && single && readySkus.has(directSku));
    const multiple=Boolean(ready && multiReady && !single && !hasPending &&
      cart.every(item=>{
        const sku=catalog.get(item.id)?.variants?.find(v=>v.code===item.variant)?.sku;
        return readySkus.has(sku);
      }));
    let multiPayButton=null;
    if (direct) {
      const pay = make('a','cart-action cart-action-primary',
        'Finalizar compra com Mercado Pago →');
      pay.href = exactShirt
        ? '/pages/checkout-salve-regina.html?size=' + encodeURIComponent(cart[0].variant)
        : '/pages/checkout-salve-regina.html?sku=' + encodeURIComponent(directSku);
      pay.addEventListener('click',()=>{
        const quote=window.CartShipping?.getQuote(cart);
        try {
          if(quote) sessionStorage.setItem('douglasCheckoutDeliveryDraft_v1',
            JSON.stringify({
              size:exactShirt?cart[0].variant:'UNICO',
              sku:directSku,
              zipCode:quote.zipCode,
              shippingOptionId:quote.shippingOptionId
            }));
          else sessionStorage.removeItem('douglasCheckoutDeliveryDraft_v1');
        } catch {}
      });
      aside.append(pay, make('p','cart-payment-note',
        'Na próxima etapa você informará o CEP, escolherá o frete, revisará o total e seguirá para o Mercado Pago.'));
    } else if(multiple){
      multiPayButton=makeButton('Finalizar compra →',()=>{
        // O cliente pode avançar mesmo sem consultar frete nesta tela:
        // a próxima página solicita o CEP e a API recalcula a cotação.
        const quote=window.CartShipping?.getQuote(cart);
        try{
          if(quote)sessionStorage.setItem('douglasMultiCheckoutDeliveryDraft_v1',
            JSON.stringify({zipCode:quote.zipCode,shippingOptionId:quote.shippingOptionId,
              items:cart.map(x=>[x.id,x.variant,x.qty])}));
          else sessionStorage.removeItem('douglasMultiCheckoutDeliveryDraft_v1');
        }catch{}
        window.location.assign('/pages/checkout-carrinho.html');
      },false);
      multiPayButton.className='cart-action cart-action-primary';
      aside.append(multiPayButton,make('p','cart-payment-note',
        'Confira a entrega e o endereço na próxima etapa. O valor será consultado novamente antes da cobrança.'));
    } else {
      // Nunca apresentar um botão "Finalizar compra" inerte.
      // Compras ainda não homologadas seguem para o atendimento sem cobrança.
      const unavailable=cart.map(item=>{
        const product=catalog.get(item.id);
        const variant=product?.variants?.find(v=>v.code===item.variant);
        return {product,variant};
      }).filter(({variant})=>!readySkus.has(variant?.sku));
      const names=unavailable.map(({product,variant})=>
        product.title+' ('+variant.label+')').join('; ');
      const assisted=make('a','cart-action cart-action-primary',
        'Consultar este pedido pelo WhatsApp →');
      assisted.href='https://wa.me/5511978038063?text='+
        encodeURIComponent(draftMessage(cart));
      assisted.target='_blank';assisted.rel='noopener noreferrer';
      const explanation=make('p','cart-payment-note',
        !ready
          ? 'O pagamento automático está temporariamente indisponível. O WhatsApp é apenas para atendimento, não é o checkout da loja.'
          : names
            ? 'O pagamento automático ainda não foi liberado para: '+names+
              '. O frete pode ser consultado; para comprar agora, solicite atendimento.'
            : 'Este carrinho exige conferência comercial antes do pagamento. O WhatsApp serve apenas para atendimento.');
      explanation.id='cart-payment-explanation';
      aside.append(assisted,explanation);
    }
    const request=make('a','cart-action cart-action-secondary','Solicitar cotação por e-mail');
    request.href='mailto:'+email+'?subject='+encodeURIComponent('Consulta de compra — Coleção Salve Regina')+
      '&body='+encodeURIComponent(draftMessage(cart));
    aside.append(request);
    // Mantém o atendimento via WhatsApp que já existia no carrinho antigo.
    // Abre apenas uma mensagem pré-preenchida; jamais envia sem ação do cliente.
    const whatsapp=make('a','cart-action cart-action-secondary','Consultar pelo WhatsApp');
    whatsapp.href='https://wa.me/5511978038063?text='+encodeURIComponent(draftMessage(cart));
    whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';
    if(direct || multiple)aside.append(whatsapp);
    const shippingItems=cart.map(item=>{
      const variant=catalog.get(item.id)?.variants?.find(v=>v.code===item.variant);
      return {sku:variant?.sku,quantity:item.qty};
    });
    window.CartShipping?.mount(shippingSlot,{
      cart,sku:directSku,items:shippingItems,
      subtotalCents:knownTotal,onUpdate:()=>{
      const quote=window.CartShipping?.getQuote(cart);
      freight.caption.textContent=quote
        ? (quote.provisional?'Frete provisório':'Frete estimado')+
          ' · '+quote.shippingName
        : 'Frete';
      freight.amount.textContent=quote ? money(quote.shippingCents) : 'A calcular';
      total.caption.textContent=quote && quote.provisional
        ? 'Total orientativo com frete' : 'Total com frete';
      total.amount.textContent=quote && !hasPending
        ? money(knownTotal+quote.shippingCents)
        : 'A calcular';
      // O botão de checkout não depende da cotação antecipada na sacola.
      request.href='mailto:'+email+'?subject='+encodeURIComponent('Consulta de compra — Coleção Salve Regina')+
        '&body='+encodeURIComponent(draftMessage(cart));
      whatsapp.href='https://wa.me/5511978038063?text='+encodeURIComponent(draftMessage(cart));
    }});
    const explanation=make('div','cart-trust');
    explanation.append(
      make('strong','','Como funciona sua compra'),
      make('p','','1. Revise os produtos e escolha a entrega pelo CEP.'),
      make('p','','2. Confira o valor total e informe os dados de envio no checkout, quando liberado.'),
      make('p','','3. O pagamento é feito no ambiente seguro do Mercado Pago. O pedido só é confirmado após validação do pagamento.')
    );
    aside.append(explanation);
    const help=make('a','cart-terms-link','Entregas, trocas e privacidade');
    help.href='/pages/condicoes-da-loja.html';
    aside.append(help);
    const shopMore=make('a','cart-continue-shopping','← Continuar comprando');
    shopMore.href='/pages/loja.html#catalogo';
    aside.append(shopMore);
    const clear=makeButton('Limpar sacola',()=>{
      if (window.confirm('Remover todos os itens da sacola?')) {
        persist([]);renderCart();updateCount();
      }
    });
    clear.className='cart-clear';aside.append(clear);
    wrap.append(list,aside);target.append(wrap);
  }
  async function checkReady() {
    try {
      const res=await fetch(API+'/api/checkout/live/readiness',{
        cache:'no-store',mode:'cors',signal:AbortSignal.timeout(8000)
      });
      if (!res.ok) return false;
      const body=await res.json();
      readySkus=new Set(Array.isArray(body?.availableSkus)
        ? body.availableSkus.filter(x=>typeof x==='string'):[]);
      multiReady=body?.multiCheckoutEnabled===true;
      return body?.checkoutEnabled===true;
    } catch { return false; }
  }
  async function init() {
    try {
      const response=await fetch(CATALOG_URL,{cache:'no-store'});
      if (!response.ok) throw Error('catalog');
      const body=await response.json();
      if (!Array.isArray(body.products)) throw Error('catalog');
      catalog=new Map(body.products.map(p=>[p.id,p]));
    } catch {
      notify('A sacola está temporariamente indisponível. Entre em contato pela página de contato.');
      const root=document.getElementById('cart-root');
      if (root) root.textContent='Não foi possível carregar o catálogo. Volte à loja e tente novamente.';
      return;
    }
    const shop=document.querySelector('.shop-redesign');
    if (shop) {
      shop.querySelectorAll('.shop-product-card [data-cart-size]').forEach(select => {
        const productId = select.closest('.shop-product-card')?.querySelector('[data-cart-add]')?.dataset.cartAdd;
        const product = catalog.get(productId);
        const price = select.closest('.shop-product-card')?.querySelector('.shop-price strong');
        if (!product || !price) return;
        const updatePrice = () => {
          const variation = product.variants.find(v => v.code === select.value);
          if (variation && Number.isInteger(variation.priceCents) && price.firstChild) {
            price.firstChild.textContent = money(variation.priceCents) + ' ';
          }
        };
        select.addEventListener('change', updatePrice);
        updatePrice();
      });
      shop.addEventListener('click', event => {
        const button=event.target.closest('[data-cart-add], [data-cart-buy]');
        if (!button) return;
        const variant=button.dataset.cartVariant ||
          button.closest('.shop-product-card')?.querySelector('[data-cart-size]')?.value;
        const goCart=button.hasAttribute('data-cart-buy');
        const added=add(button.dataset.cartAdd || button.dataset.cartBuy,variant);
        if(goCart && added) window.location.assign('/pages/cart.html');
      });
    }
    document.addEventListener('douglas-cart-change',()=>{updateCount();renderCart();});
    window.addEventListener('storage', event=>{
      if(event.key===CART_KEY){updateCount();renderCart();}
    });
    window.Cart = {
      add:(id,variant='unico',qty=1)=>add(id,variant,qty),
      get:()=>rows().map(x=>({...x})),
      remove:(id,variant)=>updateQty(id,variant,0),
      clear:()=>{persist([]);renderCart();},
    };
    document.dispatchEvent(new Event('douglas-cart-ready'));
    updateCount();renderCart();
    if (shop) {
      // A vitrine só mostra compra direta quando o servidor autorizar cobranças.
      ready=await checkReady();
      if (ready) {
        const shirt=shop.querySelector('.shop-product-card[data-category="camisetas"]');
        const select=shirt?.querySelector('[data-cart-size]');
        const addButton=shirt?.querySelector('[data-cart-add="camiseta-salve-regina"]');
        if (select && addButton) {
          const buy=document.createElement('a');
          buy.className='shop-cart-buy-now';
          buy.textContent='Comprar agora com Mercado Pago →';
          const updateLink=()=>{
            const allowed=readySkus.has('salve-regina-preta-'+select.value.toLowerCase());
            buy.hidden=!allowed;
            if(allowed)buy.href='/pages/checkout-salve-regina.html?size='+encodeURIComponent(select.value);
            if(state)state.textContent=allowed
              ? 'Compra online liberada · frete e total confirmados no checkout'
              : 'Frete sob consulta · pagamento deste tamanho ainda não liberado';
          };
          select.addEventListener('change',updateLink);
          addButton.insertAdjacentElement('afterend',buy);
          const state=shirt.querySelector('.shop-product-state');
          updateLink();
        }
      }
    }
    if(shop && ready){
      for(const product of catalog.values()){
        if(product.id==='camiseta-salve-regina' || !Array.isArray(product.variants))continue;
        const variant=product.variants[0];
        if(!readySkus.has(variant?.sku))continue;
        const button=shop.querySelector('[data-cart-add="'+product.id+'"]');
        const card=button?.closest('.shop-product-card');
        if(!button || !card)continue;
        const buy=document.createElement('a');
        buy.className='shop-cart-buy-now';
        buy.href='/pages/checkout-salve-regina.html?sku='+encodeURIComponent(variant.sku);
        buy.textContent='Comprar agora com Mercado Pago →';
        button.insertAdjacentElement('afterend',buy);
        const state=card.querySelector('.shop-product-state');
        if(state)state.textContent='Compra online liberada · frete e total no checkout';
      }
    }
    if (document.getElementById('cart-root')) {
      ready=await checkReady();renderCart();
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
