/* Vitrine em prévia. Não realiza pagamentos e não chama APIs externas. */
(async () => {
  const grid = document.getElementById('products');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');
  if (!grid || !empty || !count) return;
  try {
    const response = await fetch('../data/vavi-catalogo.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Catálogo indisponível');
    const catalog = await response.json();
    const items = Array.isArray(catalog.products) ? catalog.products.filter(p => p && p.enabled === true && p.verified === true && p.name && p.image && Number.isFinite(p.price) && p.price > 0) : [];
    count.textContent = items.length ? items.length + (items.length === 1 ? ' produto' : ' produtos') : 'Coleção em preparação';
    empty.hidden = items.length > 0;
    const formatter = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
    for (const product of items) {
      const article = document.createElement('article');
      article.className = 'product';
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.name;
      image.loading = 'lazy';
      const copy = document.createElement('div');
      copy.className = 'product-content';
      const title = document.createElement('h3');
      title.textContent = product.name;
      const description = document.createElement('p');
      description.textContent = product.description || '';
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = formatter.format(product.price);
      const notice = document.createElement('span');
      notice.className = 'closed';
      notice.textContent = 'Prévia: compra ainda não disponível';
      copy.append(title, description, price, notice);
      article.append(image, copy);
      grid.append(article);
    }
  } catch (error) {
    count.textContent = 'Coleção em preparação';
    empty.hidden = false;
    console.error('Não foi possível carregar o catálogo da prévia.');
  }
})();
