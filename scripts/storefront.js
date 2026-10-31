/* Apresentação local do catálogo: não cria carrinhos, pedidos ou pagamentos. */
(() => {
  'use strict';
  const root = document.querySelector('.shop-redesign');
  const search = root?.querySelector('[data-shop-search]');
  const query = root?.querySelector('#shop-query');
  const grid = root?.querySelector('#shop-product-grid');
  const availability = root?.querySelector('#shop-availability');
  const status = root?.querySelector('#shop-results');
  const empty = root?.querySelector('[data-shop-empty]');
  const label = root?.querySelector('[data-shop-filter-label]');
  const heading = root?.querySelector('#shop-catalog-title');
  if (![root, search, query, grid, availability, status, empty, label, heading].every(Boolean)) return;
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const items = [...grid.querySelectorAll('[data-shop-item]')].map(node => ({
    node, category: node.dataset.category, availability: node.dataset.availability,
    text: normalize(node.textContent)
  }));
  // O livro continua sendo gerado pelo catálogo existente, com suas próprias lojas.
  const books = grid.querySelector('.atelier-catalog');
  if (books) items.push({node: books, category: 'livros', availability: 'partner',
    text: normalize(books.textContent), count: books.querySelectorAll('.atelier-product').length});
  const categories = [...root.querySelectorAll('[data-shop-category]')];
  const names = {all: 'Todo o catálogo', camisetas: 'Camisetas', canecas: 'Canecas',
    ecobags: 'Ecobags', moletons: 'Moletons', livros: 'Livros'};
  let category = 'all';
  function render() {
    const words = normalize(query.value).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of items) {
      const visible = (category === 'all' || item.category === category) &&
        (availability.value === 'all' || item.availability === availability.value) &&
        words.every(word => item.text.includes(word));
      item.node.hidden = !visible;
      if (visible) count += item.count ?? 1;
    }
    empty.hidden = count > 0;
    label.textContent = names[category];
    status.textContent = count === 1 ? '1 produto encontrado' : count + ' produtos encontrados';
    for (const link of categories) {
      if (link.dataset.shopCategory === category) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
  function showCatalog() {
    heading.focus({preventScroll: true});
    root.querySelector('#catalogo').scrollIntoView({block: 'start'});
  }
  categories.forEach(link => link.addEventListener('click', event => {
    // Preserva abrir em nova aba e o destino HTML quando não há JavaScript.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    category = link.dataset.shopCategory;
    query.value = '';
    availability.value = 'all';
    render();
    showCatalog();
  }));
  query.addEventListener('input', render);
  availability.addEventListener('change', render);
  search.addEventListener('submit', event => { event.preventDefault(); render(); showCatalog(); });
  root.querySelectorAll('[data-shop-reset]').forEach(button => button.addEventListener('click', () => {
    category = 'all'; query.value = ''; availability.value = 'all'; render(); showCatalog();
  }));
  function openDetail(hash, focus = false) {
    if (!/^#produto-(camiseta|caneca|ecobag|moletom)$/.test(hash)) return;
    const detail = document.getElementById(hash.slice(1));
    if (!detail) return;
    detail.open = true;
    if (focus) detail.querySelector('summary').focus({preventScroll: true});
    detail.scrollIntoView({block: 'start'});
  }
  root.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#produto-"]');
    if (!link || link.hasAttribute('data-shop-category') || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    openDetail(link.getAttribute('href'), true);
  });
  window.addEventListener('hashchange', () => openDetail(location.hash));
  search.hidden = false;
  root.querySelector('[data-shop-tools]').hidden = false;
  render();
  openDetail(location.hash);
})();
