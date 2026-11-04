/* Navegação mobile de Douglas Assumpção.
 * Exclusiva de smartphones. Reutiliza os links litúrgicos reais do site,
 * sem alterar cabeçalho desktop, frete, carrinho ou checkout.
 */
(() => {
  'use strict';
  const smallScreen = window.matchMedia('(max-width: 767px)');
  if (!smallScreen.matches) return;
  const PATH = location.pathname.replace(/\/+$/, '') || '/';
  const HOME = PATH === '/' || PATH === '/index.html';
  const CART = /\/pages\/(?:cart|checkout[\w-]*)\.html$/.test(PATH);
  const SHOP = /\/pages\/(?:loja|colecao-salve-regina|produto-loja|produto-[\w-]+|condicoes-da-loja)\.html$/.test(PATH);
  const REPERTOIRE = /\/pages\/(?:advento|natal|quaresma|pascoa|tempo-comum|kyrie|gloria|sanctus|agnus-dei|pater-noster|ad-libitum|solenidade)[\w-]*\.html$/.test(PATH);
  const ICONS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    music: '<path d="M9 18V5l12-2v13"/><ellipse cx="6" cy="19" rx="3" ry="2"/><ellipse cx="18" cy="17" rx="3" ry="2"/>',
    store: '<path d="M4 9h16l-1.5 12h-13L4 9Z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    cart: '<path d="M2 3h3l3 13h11l3-9H6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/>',
    heart: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  const makeLink = (label, href) => {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = href;
    return a;
  };
  function init() {
    if (!document.body || document.getElementById('mobile-app-bar')) return;
    document.body.classList.add('mobile-app-active');

    const bar = document.createElement('nav');
    bar.id = 'mobile-app-bar';
    bar.className = 'mobile-app-bar';
    bar.setAttribute('aria-label', 'Navegação rápida para celular');
    const items = [
      {label:'Início',href:'/index.html',icon:'home',active:HOME},
      {label:'Partituras',drawer:'repertoire',icon:'music',active:REPERTOIRE},
      {label:'Loja',href:'/pages/loja.html',icon:'store',active:SHOP && !CART},
      {label:'Sacola',href:'/pages/cart.html',icon:'cart',active:CART},
      {label:'Menu',drawer:'menu',icon:'menu',active:false}
    ];
    items.forEach(item => {
      const node = document.createElement(item.href ? 'a' : 'button');
      if (item.href) node.href = item.href;
      else { node.type = 'button'; node.setAttribute('aria-haspopup', 'dialog'); node.dataset.mobileOpen = item.drawer; node.setAttribute('aria-expanded','false'); }
      node.innerHTML = icon(item.icon) + '<span>' + item.label + '</span>';
      node.setAttribute('aria-label', item.label === 'Sacola' ? 'Abrir meu carrinho' : item.label);
      if (item.active) {
        if (node.tagName === 'A') node.setAttribute('aria-current','page');
        else node.setAttribute('aria-pressed','true');
      }
      if (item.icon === 'cart') {
        const badge = document.createElement('span');
        badge.className = 'mobile-app-badge';
        badge.setAttribute('aria-label','Itens no carrinho');
        badge.hidden = true;
        node.append(badge);
      }
      bar.append(node);
    });
    document.body.append(bar);

    function newDrawer(id,title,eyebrow) {
      const dialog = document.createElement('dialog');
      dialog.id = 'mobile-app-' + id;
      dialog.className = 'mobile-app-drawer';
      dialog.setAttribute('aria-label', title);
      const head = document.createElement('div'); head.className = 'mobile-app-sheet-head';
      const name = document.createElement('div');
      const eyebrowNode = document.createElement('p'); eyebrowNode.className = 'mobile-app-eyebrow'; eyebrowNode.textContent = eyebrow;
      const titleNode = document.createElement('h2'); titleNode.textContent = title;
      name.append(eyebrowNode,titleNode);
      const close = document.createElement('button');close.type='button';close.className='mobile-app-sheet-close';close.setAttribute('aria-label','Fechar painel');close.textContent='×';
      head.append(name,close);
      const scroll = document.createElement('div'); scroll.className = 'mobile-app-sheet-scroll';
      dialog.append(head,scroll);
      document.body.append(dialog);
      close.addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',e=>{if(e.target===dialog) dialog.close();});
      dialog.addEventListener('close',()=> {
        bar.querySelectorAll('[data-mobile-open]').forEach(button=>button.setAttribute('aria-expanded','false'));
        if (lastOpener && lastOpener.isConnected) lastOpener.focus({preventScroll:true});
      });
      return {dialog,scroll};
    }
    let lastOpener = null;
    const repertoire = newDrawer('repertoire','Encontre seu canto','Biblioteca de música sacra');
    const menu = newDrawer('menu','Explore o site','Douglas Assumpção');

    function openDrawer(which,opener) {
      const chosen = which==='menu'?menu:repertoire;
      const other = which==='menu'?repertoire:menu;
      if (other.dialog.open) other.dialog.close();
      if (!chosen.dialog.open) {
        lastOpener = opener || document.activeElement;
        chosen.dialog.showModal();
        const button = bar.querySelector('[data-mobile-open="'+which+'"]');
        if (button) button.setAttribute('aria-expanded','true');
        const input = chosen.dialog.querySelector('input');
        if (input) input.focus({preventScroll:true});
        else chosen.dialog.querySelector('.mobile-app-sheet-close')?.focus({preventScroll:true});
      }
    }

    const searchLabel = document.createElement('label');
    searchLabel.className = 'mobile-app-sheet-label';
    searchLabel.htmlFor = 'mobile-app-filter';
    searchLabel.textContent = 'Buscar por tempo, domingo ou canto';
    const search = document.createElement('input');
    search.id='mobile-app-filter';search.type='search';search.className='mobile-app-filter';
    search.placeholder='Ex.: Advento, Kyrie, 3º domingo';search.autocomplete='off';
    repertoire.scroll.append(searchLabel,search);
    const categories = document.createElement('div');categories.className='mobile-app-categories';categories.setAttribute('aria-label','Tempos e categorias');
    const groupsRoot = document.createElement('div');
    repertoire.scroll.append(categories,groupsRoot);
    const groups = [];
    const liturgicalNav = document.querySelector('#side-nav > ul');
    if (liturgicalNav) {
      [...liturgicalNav.children].forEach((li,index) => {
        const summary = li.querySelector('details > summary');
        if (!summary) return;
        const title = summary.textContent.replace(/\s+/g,' ').trim();
        const anchors = [...li.querySelectorAll('details ul a[href]')];
        if (!anchors.length) return;
        const group = document.createElement('section');
        group.className='mobile-app-group';
        group.id='mobile-app-group-'+index;
        const h = document.createElement('h3');h.textContent=title;
        const links = document.createElement('div');links.className='mobile-app-group-links';
        anchors.forEach(source=>{
          const label=source.textContent.replace(/\s+/g,' ').trim();
          const href=source.getAttribute('href');
          if(!href || href.startsWith('#') || /^(?:javascript:|data:)/i.test(href))return;
          links.append(makeLink(label,href));
        });
        if(!links.children.length)return;
        group.append(h,links);groupsRoot.append(group);
        groups.push({title,group,links:[...links.children]});
        const chip = document.createElement('button');chip.type='button';chip.textContent=title;
        chip.addEventListener('click',()=>{
          search.value='';filter('');
          group.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
        });
        categories.append(chip);
      });
    }
    const empty = document.createElement('p');
    empty.className='mobile-app-empty';empty.hidden=true;
    empty.textContent='Não encontramos essa expressão no repertório. Experimente outro termo.';
    groupsRoot.append(empty);
    const normalize = str=>str.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    function filter(term) {
      const value=normalize(term);
      let visible=0;
      groups.forEach(({title,group,links})=>{
        let found=0;
        const groupMatch=normalize(title).includes(value);
        links.forEach(a=>{
          const show=!value||groupMatch||normalize(a.textContent).includes(value);
          a.hidden=!show;if(show){found++;visible++;}
        });
        group.hidden=found===0;
      });
      empty.hidden=visible!==0;
    }
    search.addEventListener('input',()=>filter(search.value));
    if(!groups.length) {
      const fallback=document.createElement('p');fallback.className='mobile-app-empty';
      fallback.textContent='A biblioteca está disponível pelo menu do site.';
      groupsRoot.append(fallback);
    }

    const menuLinks = document.createElement('div');menuLinks.className='mobile-app-menu-links';
    [
      ['Início','/index.html'],
      ['Loja online','/pages/loja.html'],
      ['Coleção Salve Regina','/pages/colecao-salve-regina.html'],
      ['Meu carrinho','/pages/cart.html'],
      ['Apoie a música sacra','/pages/doacao.html'],
      ['Contato','/pages/contato.html']
    ].forEach(([label,href])=>menuLinks.append(makeLink(label,href)));
    const toRepertoire = document.createElement('button');
    toRepertoire.type='button';toRepertoire.textContent='Explorar todas as partituras';
    toRepertoire.addEventListener('click',()=>{
      menu.dialog.close();
      openDrawer('repertoire',bar.querySelector('[data-mobile-open="repertoire"]'));
    });
    menuLinks.insertBefore(toRepertoire,menuLinks.children[1]);
    menu.scroll.append(menuLinks);
    document.addEventListener('click',event=>{
      const trigger=event.target.closest('[data-mobile-open]');
      if(!trigger) return;
      event.preventDefault();
      openDrawer(trigger.dataset.mobileOpen,trigger);
    });

    if (HOME) {
      const main=document.querySelector('main.editorial-main');
      if(main) {
        const welcome=document.createElement('section');
        welcome.className='mobile-app-welcome';
        welcome.setAttribute('aria-label','Acesso rápido');
        welcome.innerHTML='<p class="mobile-app-eyebrow">Música sacra · Arte & tradição</p>'+
          '<h2>O que deseja explorar?</h2><p>Partituras, cantos e criações inspiradas na beleza da fé.</p>'+
          '<div class="mobile-app-quick-grid">'+
          '<button type="button" data-mobile-open="repertoire">'+icon('music')+'<span>Partituras</span></button>'+
          '<a href="/pages/loja.html">'+icon('store')+'<span>Nossa loja</span></a>'+
          '<a href="/pages/colecao-salve-regina.html">'+icon('book')+'<span>Salve Regina</span></a>'+
          '<a href="/pages/doacao.html">'+icon('heart')+'<span>Apoiar o projeto</span></a>'+
          '</div>';
        main.insertBefore(welcome,main.firstChild);
      }
    }

    function updateCartCount() {
      let count=0;
      try {
        const rows=JSON.parse(localStorage.getItem('douglasShopCart_v2')||'[]');
        if(Array.isArray(rows)) {
          count=Math.min(30,rows.reduce((sum,row)=>
            sum+(row&&typeof row.id==='string'&&typeof row.variant==='string'&&
            Number.isInteger(row.qty)&&row.qty>0?Math.min(row.qty,10):0),0));
        }
      } catch (_) {}
      const badge=bar.querySelector('.mobile-app-badge');
      if(badge){badge.textContent=String(count);badge.hidden=count===0;}
    }
    updateCartCount();
    document.addEventListener('douglas-cart-change',updateCartCount);
    window.addEventListener('storage',event=>{if(event.key==='douglasShopCart_v2')updateCartCount();});

    // O menu litúrgico tradicional continua funcionando; a barra fica fora do foco
    // enquanto ele estiver aberto e não compete com suas camadas.
    const nativeMenu=document.getElementById('side-nav');
    if(nativeMenu) {
      const sync=()=>{
        const open=nativeMenu.classList.contains('open');
        bar.inert=open;
        if(open) {
          if(menu.dialog.open)menu.dialog.close();
          if(repertoire.dialog.open)repertoire.dialog.close();
        }
      };
      new MutationObserver(sync).observe(nativeMenu,{attributes:true,attributeFilter:['class']});
      sync();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();