/* Vitrine em prévia: catálogo verificado e sacola local. Não cobra e não envia dados à VAVI. */
(() => {
  'use strict';
  const STORAGE_KEY = 'douglas-vavi-cart-draft-v1';
  const MAX_UNITS = 10;
  const money = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
  const el = (id) => document.getElementById(id);
  const grid = el('products');
  const empty = el('empty');
  const count = el('count');
  const cartPanel = el('cart-panel');
  const backdrop = el('cart-backdrop');
  const openCartButton = el('open-cart');
  const closeCartButton = el('close-cart');
  const cartItems = el('cart-items');
  const cartEmpty = el('cart-empty');
  const cartTotal = el('cart-total');
  const cartCount = el('cart-count');
  if (!grid || !cartPanel) return;
  let products = [];
  let cart = [];
  let previousFocus = null;

  function isValidProduct(p) {
    return p && p.enabled === true && p.verified === true &&
      typeof p.id === 'string' && p.id.length > 0 &&
      typeof p.name === 'string' && p.name.length > 0 &&
      typeof p.image === 'string' && p.image.startsWith('../assets/') &&
      Array.isArray(p.variants) && p.variants.some(isValidVariant);
  }
  function isValidVariant(v) {
    return v && typeof v.sku === 'string' && v.sku.length > 0 &&
      typeof v.label === 'string' && v.label.length > 0 &&
      v.available === true && typeof v.price === 'number' &&
      Number.isFinite(v.price) && v.price > 0;
  }
  function findSelection(productId, sku) {
    const product = products.find(p => p.id === productId);
    const variant = product?.variants?.find(v => v.sku === sku && isValidVariant(v));
    return product && variant ? {product, variant} : null;
  }
  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function readCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(item => typeof item?.id === 'string' && typeof item?.sku === 'string' && Number.isInteger(item.qty))
        .map(item => ({id: item.id, sku: item.sku, qty: Math.max(1, Math.min(MAX_UNITS, item.qty))}))
        .filter(item => findSelection(item.id, item.sku));
    } catch (_) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (_) { /* storage pode ser bloqueado */ }
  }
  function renderCart() {
    cartItems.replaceChildren();
    let total = 0;
    let number = 0;
    for (const item of cart) {
      const selected = findSelection(item.id, item.sku);
      if (!selected) continue;
      const {product, variant} = selected;
      total += variant.price * item.qty;
      number += item.qty;
      const row = create('article', 'cart-item');
      row.append(create('h3', '', product.name), create('p', '', variant.label + ' · ' + money.format(variant.price)));
      const controls = create('div', 'cart-item-controls');
      const decrease = create('button', '', '−');
      decrease.type = 'button';
      decrease.setAttribute('aria-label', 'Diminuir quantidade de ' + product.name);
      decrease.disabled = item.qty <= 1;
      decrease.addEventListener('click', () => changeQty(item, -1));
      const qty = create('span', '', String(item.qty));
      qty.setAttribute('aria-label', 'Quantidade');
      const increase = create('button', '', '+');
      increase.type = 'button';
      increase.setAttribute('aria-label', 'Aumentar quantidade de ' + product.name);
      increase.disabled = item.qty >= MAX_UNITS;
      increase.addEventListener('click', () => changeQty(item, +1));
      const remove = create('button', 'remove', 'Remover');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        cart = cart.filter(entry => entry !== item);
        saveCart();
        renderCart();
      });
      controls.append(decrease, qty, increase, remove);
      row.append(controls);
      cartItems.append(row);
    }
    cartCount.textContent = String(number);
    cartTotal.textContent = money.format(total);
    cartEmpty.hidden = number > 0;
  }
  function changeQty(item, change) {
    item.qty = Math.min(MAX_UNITS, Math.max(1, item.qty + change));
    saveCart();
    renderCart();
  }
  function renderProducts() {
    grid.replaceChildren();
    for (const product of products) {
      const variants = product.variants.filter(isValidVariant);
      const article = create('article', 'product');
      const img = create('img', 'product-image');
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      const content = create('div', 'product-content');
      content.append(create('h3', '', product.name), create('p', '', product.description || 'Produto personalizado sob demanda.'));
      const price = create('div', 'product-price', money.format(Math.min(...variants.map(v => v.price))));
      const form = create('form', 'product-form');
      const variationLabel = create('label', '', 'Modelo / variação');
      const variation = create('select');
      variation.name = 'variation';
      variation.required = true;
      for (const option of variants) {
        const node = create('option', '', option.label + ' — ' + money.format(option.price));
        node.value = option.sku;
        variation.append(node);
      }
      variationLabel.append(variation);
      variation.addEventListener('change', () => {
        const selected = variants.find(v => v.sku === variation.value);
        if (selected) price.textContent = money.format(selected.price);
      });
      const qtyLabel = create('label', '', 'Quantidade');
      const qty = create('input');
      qty.type = 'number';
      qty.min = '1';
      qty.max = String(MAX_UNITS);
      qty.step = '1';
      qty.value = '1';
      qty.required = true;
      qtyLabel.append(qty);
      const add = create('button', 'add-button', 'Adicionar à sacola');
      add.type = 'submit';
      form.append(variationLabel, qtyLabel, add);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const quantity = Number(qty.value);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_UNITS) return;
        const sku = variation.value;
        if (!findSelection(product.id, sku)) return;
        const existing = cart.find(item => item.id === product.id && item.sku === sku);
        if (existing) existing.qty = Math.min(MAX_UNITS, existing.qty + quantity);
        else cart.push({id: product.id, sku, qty: quantity});
        saveCart();
        renderCart();
        openCart();
      });
      content.append(price, form, create('span', 'product-note', 'Sacola de prévia. Pagamentos desativados.'));
      article.append(img, content);
      grid.append(article);
    }
    count.textContent = products.length ? products.length + (products.length === 1 ? ' produto' : ' produtos') : 'Lançamento em preparação';
    empty.hidden = products.length > 0;
  }
  function openCart() {
    previousFocus = document.activeElement;
    cartPanel.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add('cart-open');
    openCartButton.setAttribute('aria-expanded', 'true');
    closeCartButton.focus();
  }
  function closeCart() {
    cartPanel.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove('cart-open');
    openCartButton.setAttribute('aria-expanded', 'false');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }
  openCartButton.addEventListener('click', openCart);
  closeCartButton.addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', event => {
    if (cartPanel.hidden) return;
    if (event.key === 'Escape') closeCart();
    if (event.key === 'Tab') {
      const focusables = [...cartPanel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')];
      if (!focusables.length) return;
      if (event.shiftKey && document.activeElement === focusables[0]) {
        event.preventDefault(); focusables[focusables.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusables[focusables.length - 1]) {
        event.preventDefault(); focusables[0].focus();
      }
    }
  });
  fetch('../data/vavi-catalogo.json', {cache:'no-store'})
    .then(response => { if (!response.ok) throw new Error('Catálogo indisponível'); return response.json(); })
    .then(catalog => {
      products = Array.isArray(catalog.products) ? catalog.products.filter(isValidProduct) : [];
      cart = readCart();
      renderProducts();
      renderCart();
    })
    .catch(() => {
      products = [];
      cart = [];
      count.textContent = 'Lançamento em preparação';
      empty.hidden = false;
      renderCart();
      console.warn('O catálogo de produtos personalizados não está disponível.');
    });
})();
