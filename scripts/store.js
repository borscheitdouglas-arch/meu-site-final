(function(){
  const KEY = 'shopProducts_v1';
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]} }
  function makeCard(p){
    const div = document.createElement('article'); div.className='product-card';
    const ribbon = p.badge ? `<div class="ribbon">${p.badge}</div>` : '';
    const stars = (()=>{
      const r = Number(p.rating)||0; const full = Math.round(r); let s=''; for(let i=0;i<5;i++){ s += (i<full)?'â˜…':'â˜†' } return s;
    })();
    const oldPriceHtml = p.oldPrice?` <span class="old">${p.oldPrice}</span>`:'';
    const discountHtml = p.discount?`<span class="discount-pill">${p.discount}</span>`:'';
    div.innerHTML = `
      ${ribbon}
      <img src="${p.cover||'../assets/img/edições-para-o-site/thumbnails.jpg'}" alt="${p.title}">
      <div style="padding:8px 0">
        <div class="meta"><span class="tag">${p.tag||'#PRODUTO'}</span><div class="rating"><span class="stars">${stars}</span><span class="small">${p.rating?Number(p.rating).toFixed(1):''}</span></div></div>
        <h3>${p.title}</h3>
        <p>${p.desc||''}</p>
        <div class="price-row"><div><span class="current">${p.price||''}</span>${oldPriceHtml}</div>${discountHtml}</div>
      </div>
      <div class="actions">
        <a class="btn" href="./produto.html?id=${p.id}">Ver detalhes</a>
        <button class="btn add-to-cart" type="button" onclick="addToCart('${p.id}')">Adicionar ao carrinho</button>
        <a class="btn outline" href="https://wa.me/5511979038063?text=OlÃ¡,%20gostaria%20do%20produto%20${encodeURIComponent(p.title)}" target="_blank">Pedir via WhatsApp</a>
      </div>
    `;
    return div;
  }

  function render(){
    const container = document.querySelector('.products-grid');
    if(!container) return; // nada a fazer
    const products = read();
    if(products.length===0) return; // deixa o HTML estÃ¡tico existente
    container.innerHTML = '';
    products.forEach(p=> container.appendChild(makeCard(p)));
  }

  // Em pÃ¡ginas de produto: renderiza detalhe se houver ?id=...
  function renderProductDetail(){
    const el = document.querySelector('.product-detail');
    if(!el) return; const q = new URLSearchParams(location.search); const id = q.get('id');
    if(!id) return; const products = read(); const p = products.find(x=>x.id===id);
    if(!p) return;
    // substitui conteÃºdo do article
    el.innerHTML = `
      <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap">
        <img src="${p.cover||'../assets/img/edições-para-o-site/thumbnails.jpg'}" alt="${p.title}" style="width:360px; height:320px; object-fit:cover; border-radius:8px">
        <div style="flex:1">
          <h1>${p.title}</h1>
          <p class="price" style="font-size:22px;">${p.price||''}</p>
          <p>${p.desc||''}</p>
          <div style="margin-top:16px; display:flex; gap:10px">
            <a class="btn" href="https://wa.me/5511979038063?text=OlÃ¡,%20quero%20mais%20informaÃ§Ãµes%20sobre%20${encodeURIComponent(p.title)}" target="_blank">Pedir via WhatsApp</a>
            <a class="btn outline" href="../pages/loja.html">Voltar Ã  loja</a>
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

(() => {
  const products = window.STORE_PRODUCTS || [];
  const categories = window.STORE_CATEGORIES || [];

  const elements = {
    search: document.getElementById('store-search'),
    categories: document.getElementById('store-categories'),
    subcategories: document.getElementById('store-subcategories'),
    catalog: document.getElementById('store-products'),
    douglas: document.getElementById('store-douglas-products'),
    newest: document.getElementById('store-new-products'),
    sale: document.getElementById('store-sale-products'),
    related: document.getElementById('store-related-products'),
    relatedSection: document.getElementById('store-related-section'),
    summary: document.getElementById('store-results-summary'),
    empty: document.getElementById('store-empty'),
    activeFilters: document.getElementById('store-active-filters'),
    clear: document.getElementById('store-clear-filters')
  };

  if (!elements.catalog || !elements.search) return;

  const state = { category: '', subcategory: '', query: '' };

  const normalize = (value) =>
    String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));

  function productCard(product, includeRelated = true) {
    return `
      <article class="store-card" data-product-id="${escapeHtml(product.id)}">
        <div class="store-card-media">
          <img class="store-card-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" loading="lazy" decoding="async">
          ${product.badge ? `<span class="store-badge">${escapeHtml(product.badge)}</span>` : ''}
        </div>
        <div class="store-card-content">
          <span class="store-category">${escapeHtml(product.categoryLabel)}</span>
          <h3>${escapeHtml(product.title)}</h3>
          <div class="store-subtitle">${escapeHtml(product.subtitle)}</div>
          <p>${escapeHtml(product.description)}</p>
          ${includeRelated ? `<button class="store-related-button" type="button" data-related="${escapeHtml(product.id)}">Ver relacionados</button>` : ''}
          <div class="store-card-footer">
            <span class="store-platform">${product.brand === 'douglas' ? 'Produto autoral' : 'Compra externa'}</span>
            <a class="store-buy-button" href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer sponsored">Comprar</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderCards(element, list, includeRelated = true) {
    element.innerHTML = list.map((product) => productCard(product, includeRelated)).join('');
  }

  function renderCategories() {
    elements.categories.innerHTML = categories.map((category) => `
      <button class="store-category-button" type="button" data-category="${category.id}" aria-pressed="${state.category === category.id}">
        ${escapeHtml(category.label)}
      </button>
    `).join('');
  }

  function renderSubcategories() {
    const category = categories.find((item) => item.id === state.category);

    if (!category) {
      elements.subcategories.innerHTML = '';
      return;
    }

    elements.subcategories.innerHTML = category.subcategories.map(([id, label]) => `
      <button class="store-category-button" type="button" data-subcategory="${id}" aria-pressed="${state.subcategory === id}">
        ${escapeHtml(label)}
      </button>
    `).join('');
  }

  function filteredProducts() {
    const query = normalize(state.query);

    return products.filter((product) => {
      const content = normalize([
        product.title,
        product.subtitle,
        product.description,
        product.categoryLabel,
        product.category,
        product.subcategory
      ].join(' '));

      return (!state.category || product.category === state.category) &&
        (!state.subcategory || product.subcategory === state.subcategory) &&
        (!query || content.includes(query));
    });
  }

  function updateCatalog() {
    const visibleProducts = filteredProducts();

    renderCategories();
    renderSubcategories();
    renderCards(elements.catalog, visibleProducts);

    const filters = [
      state.category && categories.find((item) => item.id === state.category)?.label,
      state.subcategory && categories.flatMap((item) => item.subcategories).find(([id]) => id === state.subcategory)?.[1],
      state.query && `Busca: “${state.query}”`
    ].filter(Boolean);

    elements.activeFilters.textContent = filters.length ? filters.join(' · ') : '';
    elements.summary.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'} em todo o catálogo.`;
    elements.empty.hidden = visibleProducts.length > 0;
    elements.clear.hidden = !filters.length;
  }

  function showRelated(productId) {
    const currentProduct = products.find((product) => product.id === productId);
    if (!currentProduct) return;

    const related = products.filter((product) =>
      product.id !== currentProduct.id && (
        currentProduct.relatedIds?.includes(product.id) ||
        product.subcategory === currentProduct.subcategory ||
        product.category === currentProduct.category
      )
    ).slice(0, 4);

    elements.relatedSection.hidden = related.length === 0;
    renderCards(elements.related, related, false);

    if (related.length) {
      elements.relatedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.addEventListener('click', (event) => {
    const categoryButton = event.target.closest('[data-category]');
    const subcategoryButton = event.target.closest('[data-subcategory]');
    const relatedButton = event.target.closest('[data-related]');

    if (categoryButton) {
      state.category = state.category === categoryButton.dataset.category ? '' : categoryButton.dataset.category;
      state.subcategory = '';
      updateCatalog();
    }

    if (subcategoryButton) {
      state.subcategory = state.subcategory === subcategoryButton.dataset.subcategory ? '' : subcategoryButton.dataset.subcategory;
      updateCatalog();
    }

    if (relatedButton) showRelated(relatedButton.dataset.related);
  });

  elements.search.addEventListener('input', () => {
    state.query = elements.search.value.trim();
    updateCatalog();
  });

  elements.clear.addEventListener('click', () => {
    state.category = '';
    state.subcategory = '';
    state.query = '';
    elements.search.value = '';
    updateCatalog();
  });

  renderCards(elements.douglas, products.filter((product) => product.brand === 'douglas' && product.featured));
  renderCards(elements.newest, products.filter((product) => product.isNew));
  renderCards(elements.sale, products.filter((product) => product.onSale));
  updateCatalog();
})();


