(function(){
  const KEY = 'shopProducts_v1';
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]} }
  function makeCard(p){
    const div = document.createElement('article'); div.className='product-card';
    const ribbon = p.badge ? `<div class="ribbon">${p.badge}</div>` : '';
    const stars = (()=>{
      const r = Number(p.rating)||0; const full = Math.round(r); let s=''; for(let i=0;i<5;i++){ s += (i<full)?'★':'☆' } return s;
    })();
    const oldPriceHtml = p.oldPrice?` <span class="old">${p.oldPrice}</span>`:'';
    const discountHtml = p.discount?`<span class="discount-pill">${p.discount}</span>`:'';
    div.innerHTML = `
      ${ribbon}
      <img src="${p.cover||'../assets/img/thumbnails.jpg'}" alt="${p.title}">
      <div style="padding:8px 0">
        <div class="meta"><span class="tag">${p.tag||'#PRODUTO'}</span><div class="rating"><span class="stars">${stars}</span><span class="small">${p.rating?Number(p.rating).toFixed(1):''}</span></div></div>
        <h3>${p.title}</h3>
        <p>${p.desc||''}</p>
        <div class="price-row"><div><span class="current">${p.price||''}</span>${oldPriceHtml}</div>${discountHtml}</div>
      </div>
      <div class="actions">
        <a class="btn" href="./produto.html?id=${p.id}">Ver detalhes</a>
        <button class="btn add-to-cart" type="button" onclick="addToCart('${p.id}')">Adicionar ao carrinho</button>
        <a class="btn outline" href="https://wa.me/5511979038063?text=Olá,%20gostaria%20do%20produto%20${encodeURIComponent(p.title)}" target="_blank">Pedir via WhatsApp</a>
      </div>
    `;
    return div;
  }

  function render(){
    const container = document.querySelector('.products-grid');
    if(!container) return; // nada a fazer
    const products = read();
    if(products.length===0) return; // deixa o HTML estático existente
    container.innerHTML = '';
    products.forEach(p=> container.appendChild(makeCard(p)));
  }

  // Em páginas de produto: renderiza detalhe se houver ?id=...
  function renderProductDetail(){
    const el = document.querySelector('.product-detail');
    if(!el) return; const q = new URLSearchParams(location.search); const id = q.get('id');
    if(!id) return; const products = read(); const p = products.find(x=>x.id===id);
    if(!p) return;
    // substitui conteúdo do article
    el.innerHTML = `
      <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap">
        <img src="${p.cover||'../assets/img/thumbnails.jpg'}" alt="${p.title}" style="width:360px; height:320px; object-fit:cover; border-radius:8px">
        <div style="flex:1">
          <h1>${p.title}</h1>
          <p class="price" style="font-size:22px;">${p.price||''}</p>
          <p>${p.desc||''}</p>
          <div style="margin-top:16px; display:flex; gap:10px">
            <a class="btn" href="https://wa.me/5511979038063?text=Olá,%20quero%20mais%20informações%20sobre%20${encodeURIComponent(p.title)}" target="_blank">Pedir via WhatsApp</a>
            <a class="btn outline" href="../pages/loja.html">Voltar à loja</a>
          </div>
        </div>
      </div>
      <section style="margin-top:18px">
        <h2>Arquivos</h2>
        <p class="small">${p.sheetName||'Sem partitura enviada'}</p>
        ${p.sheet?`<a class="btn" href="${p.sheet}" download="${p.sheetName||'partitura'}">Download da partitura</a>`:''}
      </section>
    `;
  }

  document.addEventListener('DOMContentLoaded', ()=>{ render(); renderProductDetail(); });
})();
