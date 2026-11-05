/* A loja e o checkout usam esta mesma camada mobile, sem tocar no desktop. */
(() => {
  const phone = window.matchMedia('(max-width: 767px)');
  function loadMobileApp() {
    if (!phone.matches || document.getElementById('mobile-app-shell-css')) return;
    const style = document.createElement('link');
    style.id = 'mobile-app-shell-css';
    style.rel = 'stylesheet';
    style.href = '/styles/mobile-app-shell.css?v=20261105-mobile-menu-spectral-v17';
    document.head.appendChild(style);
    const script = document.createElement('script');
    script.id = 'mobile-app-shell-script';
    script.src = '/scripts/mobile-app-shell.js?v=20261105-mobile-menu-spectral-v17';
    document.body.appendChild(script);
  }
  loadMobileApp();
  if (phone.addEventListener) phone.addEventListener('change', loadMobileApp);
})();

/* Navegação compartilhada da loja; não altera pedidos, fretes ou pagamentos. */
(() => {
  'use strict';
  function init() {
    const header = document.querySelector('.shop-shared-header');
    if (!header) return;
    // Acessos diretos para a página principal e a vitrine.
    if (!header.querySelector('.shop-header-shortcuts')) {
      const shortcuts=document.createElement('nav');
      shortcuts.className='shop-header-shortcuts';
      shortcuts.setAttribute('aria-label','Navegação rápida');
      for(const [label,href] of [['Início','/index.html'],['Loja','/pages/loja.html']]){
        const link=document.createElement('a');
        link.href=href;link.textContent=label;
        if(location.pathname===href||(href==='/index.html'&&location.pathname==='/'))link.setAttribute('aria-current','page');
        shortcuts.append(link);
      }
      const searchAnchor=header.querySelector('.shop-search');
      if(searchAnchor)header.insertBefore(shortcuts,searchAnchor);
      else header.append(shortcuts);
    }
    const search = header.querySelector('.shop-search');
    if (search) search.hidden = false;
    // A busca enviada de outra página usa o filtro já existente no catálogo.
    const query = new URLSearchParams(location.search).get('q');
    const input = header.querySelector('input[name="q"]');
    if (document.getElementById('shop-product-grid') && query !== null && input) {
      input.value = query.slice(0,100);
      input.dispatchEvent(new Event('input', {bubbles:true}));
    }
    // As páginas com menu editorial mantêm seu próprio menu lateral.
    const button = header.querySelector('#menu-btn');
    if (button && !document.getElementById('side-nav')) {
      const drawer = document.createElement('dialog');
      drawer.className = 'shop-shell-dialog';
      drawer.id = 'shop-shell-menu';
      drawer.setAttribute('aria-label','Menu da loja');
      const close = document.createElement('button');
      close.type = 'button'; close.className = 'shop-shell-close';
      close.textContent = 'Fechar menu ×';
      const nav = document.createElement('nav');
      nav.setAttribute('aria-label','Navegação da loja');
      for (const [label,href] of [
        ['Início','/index.html'],['Loja','/pages/loja.html'],
        ['Coleção Salve Regina','/pages/colecao-salve-regina.html'],
        ['Meu carrinho','/pages/cart.html'],
        ['Entregas e trocas','/pages/condicoes-da-loja.html'],
        ['Contato','/pages/contato.html']
      ]) {
        const link = document.createElement('a');
        link.href = href; link.textContent = label; nav.append(link);
      }
      drawer.append(close,nav); document.body.append(drawer);
      button.setAttribute('aria-controls',drawer.id);
      button.setAttribute('aria-expanded','false');
      button.addEventListener('click',() => { drawer.showModal(); button.setAttribute('aria-expanded','true'); });
      close.addEventListener('click',() => drawer.close());
      drawer.addEventListener('close',() => { button.setAttribute('aria-expanded','false'); button.focus(); });
      drawer.addEventListener('click',event => {
        if (event.target === drawer && event.clientX > drawer.getBoundingClientRect().right) drawer.close();
      });
    }
    function updateCount() {
      let count = 0;
      try {
        const rows = JSON.parse(localStorage.getItem('douglasShopCart_v2') || '[]');
        if (Array.isArray(rows)) count = Math.min(30,rows.reduce((sum,row) =>
          sum + (row && typeof row.id === 'string' && typeof row.variant === 'string' &&
          Number.isInteger(row.qty) && row.qty > 0 ? Math.min(row.qty,10) : 0),0));
      } catch {}
      header.querySelectorAll('[data-cart-count]').forEach(badge => {
        badge.textContent = String(count); badge.hidden = count === 0;
      });
    }
    updateCount();
    document.addEventListener('douglas-cart-change',updateCount);
    window.addEventListener('storage',event => { if (event.key === 'douglasShopCart_v2') updateCount(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
