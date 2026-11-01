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
        (product.vaviDesign ? ' (ref. ' + product.vaviDesign + ')' : ''));
      lines.push('  ' + (variant.priceCents === null ? 'Preço de venda pendente de confirmação'
        : 'Preço preliminar: ' + money(variant.priceCents) + ' por unidade'));
    }
    const freight=window.CartShipping?.getQuote(cart);
    if (freight) {
      const sum=cart.reduce((total,item)=>{
        const variant=catalog.get(item.id)?.variants.find(v=>v.code===item.variant);
        return total+(Number.isInteger(variant?.priceCents)?variant.priceCents*item.qty:0);
      },0);
      lines.push('', 'CEP: '+freight.zipCode,
        'Frete estimado ('+freight.shippingName+'): '+money(freight.shippingCents),
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
      if (product.status === 'consultation') content.append(make('p','cart-state','Sob consulta · sem cobrança'));
      if (variant.priceCents === null) {
        hasPending = true;content.append(make('p','cart-amount','Preço final a confirmar'));
      } else {
        knownTotal += variant.priceCents * item.qty;
        content.append(make('p','cart-amount',money(variant.priceCents)+' por unidade · preliminar'));
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
    aside.append(make('p','','Itens: '+count(cart)));
    aside.append(make('p','cart-estimate',knownTotal>0
      ? 'Subtotal dos produtos: '+money(knownTotal)
      : 'Preços finais ainda não definidos'));
    const freightLine=make('p','cart-freight','Frete: a calcular');
    const totalLine=make('p','cart-total','Total com frete: a calcular');
    aside.append(freightLine,totalLine);
    const shippingSlot=make('section','cart-shipping-slot');
    shippingSlot.setAttribute('aria-label','Calcular frete do carrinho');
    aside.append(shippingSlot);
    if (hasPending) aside.append(make('p','cart-disclaimer',
      'Há peças sem preço de venda definido. Nenhum total final pode ser calculado agora.'));
    aside.append(make('p','cart-disclaimer',
      'Preços preliminares. Frete e valor final reconferidos pelo servidor antes de qualquer pagamento.'));
    const exactShirt = cart.length === 1 &&
      cart[0].id === 'camiseta-salve-regina' && cart[0].qty === 1;
    if (exactShirt && ready) {
      const pay = make('a','cart-action cart-action-primary',
        'Finalizar compra com Mercado Pago →');
      pay.href = '/pages/checkout-salve-regina.html?size=' + encodeURIComponent(cart[0].variant);
      pay.addEventListener('click',()=>{
        const quote=window.CartShipping?.getQuote(cart);
        try {
          if(quote) sessionStorage.setItem('douglasCheckoutDeliveryDraft_v1',
            JSON.stringify({size:cart[0].variant,zipCode:quote.zipCode,
              shippingOptionId:quote.shippingOptionId}));
          else sessionStorage.removeItem('douglasCheckoutDeliveryDraft_v1');
        } catch {}
      });
      aside.append(pay, make('p','cart-payment-note',
        'Na próxima etapa você informará o CEP, escolherá o frete, revisará o total e seguirá para o Mercado Pago.'));
    } else {
      const blocked = make('button','cart-action cart-action-disabled',
        'Finalizar compra');
      blocked.type = 'button';
      blocked.disabled = true;
      blocked.setAttribute('aria-describedby','cart-payment-explanation');
      const explanation = make('p','cart-payment-note',
        exactShirt
          ? 'Pagamento online aguardando a aprovação final do produto e da loja. Nenhuma cobrança será feita.'
          : 'Compra online ainda indisponível para esta seleção. Por enquanto, apenas uma camiseta por pedido pode seguir ao checkout após aprovação.');
      explanation.id = 'cart-payment-explanation';
      aside.append(blocked, explanation);
    }
    const request=make('a','cart-action cart-action-secondary','Solicitar cotação por e-mail');
    request.href='mailto:'+email+'?subject='+encodeURIComponent('Consulta de compra — Coleção Salve Regina')+
      '&body='+encodeURIComponent(draftMessage(cart));
    aside.append(request);
    // Mantém o atendimento via WhatsApp que já existia no carrinho antigo.
    // Abre apenas uma mensagem pré-preenchida; jamais envia sem ação do cliente.
    const whatsapp=make('a','cart-action cart-action-secondary','Consultar pelo WhatsApp');
    whatsapp.href='https://wa.me/5511979038063?text='+encodeURIComponent(draftMessage(cart));
    whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';
    aside.append(whatsapp);
    window.CartShipping?.mount(shippingSlot,{cart,subtotalCents:knownTotal,onUpdate:()=>{
      const quote=window.CartShipping?.getQuote(cart);
      freightLine.textContent=quote
        ? 'Frete estimado ('+quote.shippingName+'): '+money(quote.shippingCents)
        : 'Frete: a calcular';
      totalLine.textContent=quote && !hasPending
        ? 'Total estimado com frete: '+money(knownTotal+quote.shippingCents)
        : 'Total com frete: a calcular';
      request.href='mailto:'+email+'?subject='+encodeURIComponent('Consulta de compra — Coleção Salve Regina')+
        '&body='+encodeURIComponent(draftMessage(cart));
      whatsapp.href='https://wa.me/5511979038063?text='+encodeURIComponent(draftMessage(cart));
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
          const updateLink=()=>{buy.href='/pages/checkout-salve-regina.html?size='+encodeURIComponent(select.value);};
          select.addEventListener('change',updateLink);
          updateLink();
          addButton.insertAdjacentElement('afterend',buy);
          const state=shirt.querySelector('.shop-product-state');
          if(state) state.textContent='Compra online liberada · frete e total confirmados no checkout';
        }
      }
    }
    if (document.getElementById('cart-root')) {
      ready=await checkReady();renderCart();
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
