/* Experiência mobile litúrgica: cabeçalho, repertório por tempos e instalação.
 * Ativada até 767px; não altera a estrutura desktop nem transações da loja.
 */
(() => {
  'use strict';
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const HOME = location.pathname === '/' || location.pathname === '/index.html';
  const SHOP = /\/pages\/loja\.html$/.test(location.pathname);
  const PAGE = location.pathname;
  const ICONS = {
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    shop: '<path d="M4 9h16l-1.5 12h-13L4 9Z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    install: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 7v9m-4.5-4.5h9"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    cross: '<path d="M12 3v18M5 10h14"/>',
    search: '<circle cx="10.6" cy="10.6" r="6.2"/><path d="m15.4 15.4 5 5"/>'
  };
  const icon = key => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[key] + '</svg>';
  const link = (name,url,className='') => {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = name;
    if(className) a.className=className;
    return a;
  };
  const safeText = element => element.textContent.replace(/\s+/g,' ').trim();
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent=event; });
  function init() {
    if(!document.body || document.getElementById('mobile-sacred-header')) return;
    document.body.classList.add('mobile-app-active','mobile-sacred-active');

    // Manifesto visível apenas no celular; não interfere no domínio ou no checkout.
    if(!document.querySelector('link[rel="manifest"]')) {
      const manifest=document.createElement('link');
      manifest.rel='manifest';manifest.href='/manifest.webmanifest';
      document.head.append(manifest);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const meta=document.createElement('meta');
      meta.name='apple-mobile-web-app-capable';meta.content='yes';document.head.append(meta);
    }
    if(!document.querySelector('link[rel="apple-touch-icon"]')) {
      const touch=document.createElement('link');
      touch.rel='apple-touch-icon';touch.href='/assets/img/icone.png';document.head.append(touch);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
      const title=document.createElement('meta');
      title.name='apple-mobile-web-app-title';title.content='Douglas Assumpção';document.head.append(title);
    }

    const header=document.createElement('header');
    header.id='mobile-sacred-header';header.className='mobile-sacred-header';
    header.setAttribute('aria-label','Navegação mobile');
    const menuBtn=document.createElement('button');
    menuBtn.className='mobile-sacred-menu-trigger';menuBtn.type='button';
    menuBtn.setAttribute('aria-label','Abrir menu completo');
    menuBtn.setAttribute('aria-haspopup','dialog');
    menuBtn.setAttribute('aria-controls','mobile-sacred-drawer');
    menuBtn.setAttribute('aria-expanded','false');
    menuBtn.innerHTML=icon('menu');

    const brand=document.createElement('a');
    brand.href='/index.html';brand.className='mobile-sacred-brand';
    brand.setAttribute('aria-label','Douglas Assumpção — página inicial');
    brand.innerHTML='<img alt="" src="/assets/img/icone.png" width="30" height="30"><span>Douglas<br>Assumpção</span>';
    if(HOME) brand.setAttribute('aria-current','page');

    const shopLink=document.createElement('a');
    shopLink.href='/pages/loja.html';shopLink.className='mobile-sacred-store-link';
    shopLink.innerHTML=icon('shop')+'<span>Loja</span>';
    shopLink.setAttribute('aria-label','Abrir loja');
    if(SHOP) shopLink.setAttribute('aria-current','page');

    const installBtn=document.createElement('button');
    installBtn.type='button';installBtn.className='mobile-sacred-install-trigger';
    installBtn.setAttribute('aria-label','Adicionar este site à tela inicial como aplicativo');
    installBtn.setAttribute('title','Adicionar à tela inicial');
    installBtn.innerHTML=icon('install');
    const actions=document.createElement('div');actions.className='mobile-sacred-actions';
    actions.append(shopLink,installBtn);
    header.append(menuBtn,brand,actions);
    document.body.insertBefore(header,document.body.firstChild);

    const drawer=document.createElement('dialog');
    drawer.id='mobile-sacred-drawer';drawer.className='mobile-sacred-drawer';
    drawer.setAttribute('aria-label','Menu de navegação');
    drawer.innerHTML='<div class="mobile-sacred-drawer-head">'+
      '<div><p class="mobile-sacred-overline">Música sacra · Arte & tradição</p>'+
      '<h2>Menu</h2></div>'+
      '<button type="button" class="mobile-sacred-close" aria-label="Fechar menu">×</button></div>';
    const scroll=document.createElement('div');scroll.className='mobile-sacred-menu-scroll';
    const quick=document.createElement('nav');
    quick.className='mobile-sacred-quick';quick.setAttribute('aria-label','Páginas principais');
    [
      ['Início','/index.html'],['Loja','/pages/loja.html'],
      ['Coleção Salve Regina','/pages/colecao-salve-regina.html'],
      ['Meu carrinho','/pages/cart.html'],
      ['Apoiar o projeto','/pages/doacao.html'],
      ['Contato','/pages/contato.html']
    ].forEach(([name,url])=>quick.append(link(name,url)));
    scroll.append(quick);
    const divider=document.createElement('div');divider.className='mobile-sacred-menu-divider';
    divider.innerHTML='<span>✦</span><strong>Repertório litúrgico</strong><span>✦</span>';
    scroll.append(divider);
    const search=document.createElement('input');
    search.className='mobile-sacred-menu-search';search.type='search';
    search.setAttribute('aria-label','Buscar tempo litúrgico ou canto');
    search.placeholder='Buscar tempo, domingo ou canto…';search.autocomplete='off';
    scroll.append(search);
    const groupsHost=document.createElement('nav');groupsHost.className='mobile-sacred-groups';
    groupsHost.setAttribute('aria-label','Tempos litúrgicos e ordinário da Missa');
    scroll.append(groupsHost);
    drawer.append(scroll);
    document.body.append(drawer);

    const closeBtn=drawer.querySelector('.mobile-sacred-close');
    function openMenu() {
      if(drawer.open) return;
      drawer.showModal();
      menuBtn.setAttribute('aria-expanded','true');
      closeBtn.focus({preventScroll:true});
    }
    function closeMenu() {if(drawer.open) drawer.close();}
    menuBtn.addEventListener('click',openMenu);
    closeBtn.addEventListener('click',closeMenu);
    drawer.addEventListener('click',e=>{if(e.target===drawer) closeMenu();});
    drawer.addEventListener('close',()=>{
      menuBtn.setAttribute('aria-expanded','false');
      menuBtn.focus({preventScroll:true});
    });

    // Reutiliza diretamente a navegação real do site: cada página litúrgica
    // continua responsável por disponibilizar suas próprias partituras.
    const groups=[];
    function populateMenu(source) {
      if(!source || groups.length) return;
      [...source.children].forEach((li,index)=>{
        const summary=li.querySelector('details > summary');
        if(!summary) return;
        const items=[...li.querySelectorAll('details ul a[href]')];
        if(!items.length) return;
        const details=document.createElement('details');
        details.className='mobile-sacred-category';
        const summaryNew=document.createElement('summary');
        const heading=document.createElement('span');heading.textContent=safeText(summary);
        const count=document.createElement('small');count.textContent=String(items.length);
        summaryNew.append(heading,count);
        const choices=document.createElement('div');choices.className='mobile-sacred-choices';
        items.forEach(item=>{
          const href=item.getAttribute('href');
          if(!href || /^(?:javascript:|data:|#)/i.test(href))return;
          choices.append(link(safeText(item),href));
        });
        details.append(summaryNew,choices);groupsHost.append(details);
        groups.push({details,title:safeText(summary),choices:[...choices.children]});
      });
      const loading=groupsHost.querySelector('.mobile-sacred-loading');
      if(loading) loading.remove();
    }
    const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    search.addEventListener('input',()=>{
      const query=normalize(search.value.trim());
      let visible=0;
      groups.forEach(({details,title,choices})=>{
        const all=normalize(title).includes(query);
        let matching=0;
        choices.forEach(a=>{
          const show=!query||all||normalize(a.textContent).includes(query);
          a.hidden=!show;
          if(show)matching++;
        });
        details.hidden=matching===0;
        if(query && matching)details.open=true;
        if(!query)details.open=false;
        visible+=matching;
      });
      let nothing=groupsHost.querySelector('.mobile-sacred-no-results');
      if(!nothing){
        nothing=document.createElement('p');
        nothing.className='mobile-sacred-no-results';
        nothing.textContent='Nenhuma página encontrada. Experimente outra expressão.';
        groupsHost.append(nothing);
      }
      nothing.hidden=visible!==0;
    });
    const nativeSource=document.querySelector('#side-nav > ul');
    if(nativeSource)populateMenu(nativeSource);
    else {
      const loading=document.createElement('p');
      loading.className='mobile-sacred-loading';
      loading.textContent='Carregando os tempos litúrgicos…';
      groupsHost.append(loading);
      fetch('/index.html').then(response=>{
        if(!response.ok)throw new Error('Menu indisponível');
        return response.text();
      }).then(html=>{
        const page=new DOMParser().parseFromString(html,'text/html');
        populateMenu(page.querySelector('#side-nav > ul'));
        if(!groups.length)loading.textContent='Abra a página inicial para consultar o repertório.';
      }).catch(()=>{loading.textContent='Abra a página inicial para consultar o repertório.';});
    }

    // Instruções reais: o Safari do iPhone não fornece um prompt automático.
    const installDialog=document.createElement('dialog');
    installDialog.className='mobile-sacred-install-dialog';
    installDialog.setAttribute('aria-label','Adicionar à tela inicial');
    const installed=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
    const text=installed
      ? 'Você já está utilizando o site pela tela inicial.'
      : ios
        ? 'Abra este site no Safari, toque no botão Compartilhar (quadrado com seta para cima) e escolha “Adicionar à Tela de Início”. Depois, confirme em “Adicionar”.'
        : 'No navegador, abra o menu (⋮ ou Compartilhar) e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”, conforme as opções disponíveis.';
    installDialog.innerHTML='<div class="mobile-sacred-install-panel">'+
      '<button type="button" class="mobile-sacred-install-close" aria-label="Fechar instruções">×</button>'+
      '<div class="mobile-sacred-install-emblem">'+icon('install')+'</div>'+
      '<p class="mobile-sacred-overline">Acesso rápido</p>'+
      '<h2>Seu site como aplicativo</h2>'+
      '<p class="mobile-sacred-install-copy"></p>'+
      '<p class="mobile-sacred-install-note">O site continua sendo o mesmo e não precisa ser baixado de uma loja de aplicativos.</p>'+
      '<button type="button" class="mobile-sacred-install-ok">Entendi</button></div>';
    installDialog.querySelector('.mobile-sacred-install-copy').textContent=text;
    document.body.append(installDialog);
    const showInstallHelp=()=>{if(!installDialog.open)installDialog.showModal();};
    installBtn.addEventListener('click',async()=>{
      if(installEvent){
        const prompt=installEvent;
        installEvent=null;
        try{await prompt.prompt();await prompt.userChoice;}catch(e){showInstallHelp();}
      } else showInstallHelp();
    });
    installDialog.querySelector('.mobile-sacred-install-close').addEventListener('click',()=>installDialog.close());
    installDialog.querySelector('.mobile-sacred-install-ok').addEventListener('click',()=>installDialog.close());
    installDialog.addEventListener('click',e=>{if(e.target===installDialog)installDialog.close();});
    installDialog.addEventListener('close',()=>installBtn.focus({preventScroll:true}));

    if(HOME){
      const main=document.querySelector('main.editorial-main');
      if(main){
        const welcome=document.createElement('section');
        welcome.className='mobile-sacred-welcome';
        welcome.setAttribute('aria-labelledby','mobile-sacred-title');
        welcome.innerHTML='<p class="mobile-sacred-overline">Douglas Assumpção · Música sacra</p>'+
          '<div class="mobile-sacred-welcome-medallion" aria-hidden="true"><span>✦</span><img src="/assets/img/icone.png" alt=""></div>'+
          '<h1 id="mobile-sacred-title">A beleza que conduz à oração.</h1>'+
          '<div class="mobile-sacred-welcome-ornament" aria-hidden="true">✦ ─── ✧ ─── ✦</div>'+
          '<p>Repertório litúrgico, cantos e reflexões para acompanhar cada tempo do ano.</p>'+
          '<div class="mobile-sacred-welcome-actions">'+
          '<button type="button" class="mobile-sacred-explore">Explorar repertório</button>'+
          '<a href="/pages/loja.html">Conhecer a loja</a></div>';
        main.insertBefore(welcome,main.firstChild);
        welcome.querySelector('.mobile-sacred-explore').addEventListener('click',openMenu);
      }
    }

    if(SHOP && document.querySelector('#shop-product-grid')) {
      // A busca no cabeçalho antigo não deve desaparecer junto com ele.
      // Formulário independente que usa o parâmetro q já suportado no catálogo.
      const box=document.createElement('form');
      box.className='mobile-sacred-shop-search';box.method='get';box.action='/pages/loja.html#catalogo';
      box.setAttribute('role','search');box.setAttribute('aria-label','Buscar produtos');
      box.innerHTML='<label for="mobile-shop-query">Buscar na loja</label>'+
        '<div><input id="mobile-shop-query" type="search" name="q" placeholder="Pesquisar produtos…" maxlength="100" autocomplete="off">'+
        '<button type="submit" aria-label="Buscar produtos">'+icon('search')+'</button></div>';
      box.querySelector('input').value=new URLSearchParams(location.search).get('q')||'';
      const shopMain=document.querySelector('main');
      if(shopMain)shopMain.insertBefore(box,shopMain.firstChild);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();