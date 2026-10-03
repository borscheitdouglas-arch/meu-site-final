(function(){
  const CART_KEY = 'shopCart_v1';
  const PROD_KEY = 'shopProducts_v1';

  function readCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY)||'[]')}catch(e){return[]} }
  function writeCart(v){ localStorage.setItem(CART_KEY, JSON.stringify(v)) }
  function readProducts(){ try{return JSON.parse(localStorage.getItem(PROD_KEY)||'[]')}catch(e){return[]} }

  function findProduct(id){ const p = readProducts().find(x=>x.id===id); return p || null }

  function addToCart(id, qty=1){
    const p = findProduct(id); if(!p){ alert('Produto não encontrado no catálogo.'); return }
    const cart = readCart(); const idx = cart.findIndex(i=>i.id===id);
    if(idx===-1) cart.push({id:id, title:p.title, price:p.price, qty:qty}); else cart[idx].qty += qty;
    writeCart(cart); showMiniToast('Adicionado ao carrinho');
  }

  function removeFromCart(id){ let cart = readCart(); cart = cart.filter(i=>i.id!==id); writeCart(cart); }

  function clearCart(){ localStorage.removeItem(CART_KEY); }

  function priceNumber(value){
    let amount = String(value || '').replace(/[^0-9,.]/g, '');
    if(amount.includes(',')) amount = amount.replace(/\./g, '').replace(',', '.');
    const number = Number(amount);
    return Number.isFinite(number) ? number : 0;
  }

  function cartTotal(){ return readCart().reduce((sum, item) => sum + priceNumber(item.price) * (item.qty || 1), 0); }

  function showMiniToast(msg){
    let t = document.getElementById('mini-toast');
    if(!t){ t = document.createElement('div'); t.id='mini-toast'; t.style.position='fixed'; t.style.right='18px'; t.style.bottom='18px'; t.style.background='rgba(0,0,0,0.8)'; t.style.color='#fff'; t.style.padding='10px 14px'; t.style.borderRadius='8px'; t.style.zIndex=9999; document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity=1; setTimeout(()=>{ t.style.transition='opacity .8s'; t.style.opacity=0 },1600);
  }

  // expose to global for inline onclick
  window.addToCart = addToCart;

  // cart page rendering
  function renderCartPage(){
    const el = document.getElementById('cart-root'); if(!el) return;
    const cart = readCart(); if(cart.length===0){ el.innerHTML = '<p class="small">Carrinho vazio.</p>'; return }
    let html = '<div class="cart-list">'; let total = 0;
    for(const it of cart){ html += `<div class="cart-item" style="display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="flex:1">
          <strong>${it.title}</strong>
          <div class="small">Qtd: ${it.qty}</div>
        </div>
        <div style="text-align:right">
          <div class="small">${it.price}</div>
        </div>
      </div>`;
      total += priceNumber(it.price) * (it.qty||1);
    }
    html += '</div>';
    html += `<div style="margin-top:12px;text-align:right"><strong>Total: R$ ${total.toFixed(2).replace('.',',')}</strong></div>`;
    html += `<div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><a class="btn" id="whatsCheckout" href="#">Enviar pedido via WhatsApp</a><button class="btn outline" id="clearCartBtn">Limpar carrinho</button></div>`;
    el.innerHTML = html;
    document.getElementById('clearCartBtn').addEventListener('click', ()=>{ if(confirm('Limpar carrinho?')){ clearCart(); renderCartPage(); showMiniToast('Carrinho limpo'); } });
    document.getElementById('whatsCheckout').addEventListener('click', (ev)=>{
      ev.preventDefault(); const cart = readCart(); if(cart.length===0){ alert('Carrinho vazio'); return }
      let msg = 'Olá, gostaria de fazer um pedido:\n'; cart.forEach(it=> msg += `- ${it.title} x${it.qty} (${it.price})\n`);
      msg += `\nTotal: R$ ${cartTotal().toFixed(2).replace('.',',')}\n`;
      const wa = `https://wa.me/5511979038063?text=${encodeURIComponent(msg)}`; window.open(wa,'_blank');
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // if on cart page
    renderCartPage();
    // expose helpers
    window.Cart = { add: addToCart, remove: removeFromCart, clear: clearCart, get: readCart };
  });

})();
