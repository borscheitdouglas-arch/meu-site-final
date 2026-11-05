/* Interface móvel editorial — menu litúrgico e cabeçalho (novembro/2026).
 * Ativada exclusivamente até 767px. A navegação desktop permanece intacta.
 * Não interfere em pagamentos, frete, carrinho nem download de partituras. */
(() => {
  'use strict';
  const media=window.matchMedia('(max-width: 767px)');
  if(!media.matches) return;
  const pathname=location.pathname.replace(/\/+$/,'')||'/';
  const isHome=pathname==='/'||pathname==='/index.html';
  const isShop=/^\/pages\/(?:loja|produto-loja|colecao-salve-regina|cart|checkout[\w-]*|condicoes-da-loja)\.html$/.test(pathname);
  const paths={
    home:'/index.html',shop:'/pages/loja.html',collection:'/pages/colecao-salve-regina.html',
    cart:'/pages/cart.html',support:'/pages/doacao.html',contact:'/pages/contato.html'
  };
  const icons={
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    shop:'<path d="M5 8h14l-1.2 13H6.2L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    install:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
    home:'<path d="m3 11 9-8 9 8v9H3v-9Z"/><path d="M9 20v-7h6v7"/>',
    cart:'<path d="M2 4h3l3 12h11l2-9H6"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
    close:'<path d="M5 5l14 14M19 5 5 19"/>'
  };
  const svg=name=>'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
  const link=(label,href,className='')=>{
    const a=document.createElement('a');
    a.href=href;a.textContent=label;if(className)a.className=className;
    if(new URL(href,location.origin).pathname===pathname)a.setAttribute('aria-current','page');
    return a;
  };
  function init() {
    if(document.getElementById('mobile-lit-header'))return;
    document.body.classList.add('mobile-app-active','mobile-lit-active');
    media.addEventListener?.('change',e=>{
      document.body.classList.toggle('mobile-app-active',e.matches);
      document.body.classList.toggle('mobile-lit-active',e.matches);
    });
    // A navegação principal do desktop permanece no DOM, mas não na interface móvel.
    const top=document.createElement('header');
    top.id='mobile-lit-header';top.className='mobile-lit-header';
    top.setAttribute('aria-label','Cabeçalho mobile');
    const openMenu=document.createElement('button');
    openMenu.type='button';openMenu.className='mobile-lit-menu-trigger';
    openMenu.setAttribute('aria-label','Abrir menu do site');
    openMenu.setAttribute('aria-controls','mobile-lit-drawer');
    openMenu.setAttribute('aria-expanded','false');
    openMenu.innerHTML=svg('menu');
    const brand=document.createElement('a');
    brand.className='mobile-lit-brand';brand.href=paths.home;
    brand.setAttribute('aria-label','Douglas Assumpção — página inicial');
    brand.innerHTML='<img src="/assets/img/icone.png" width="30" height="30" alt=""/><span>Douglas <em>Assumpção</em></span>';
    const shop=link('LOJA',paths.shop,'mobile-lit-shop');
    shop.setAttribute('aria-label','Ir para a loja');
    shop.innerHTML=svg('shop')+'<span>LOJA</span>';
    const install=document.createElement('button');
    install.type='button';install.className='mobile-lit-install';
    install.setAttribute('aria-label','Adicionar o site à tela inicial');
    install.setAttribute('title','Adicionar à tela inicial');
    install.innerHTML=svg('install');
    top.append(openMenu,brand,shop,install);
    document.body.append(top);

    // Painel lateral semelhante ao aplicativo de referência. Sem atalho "Partituras":
    // cada página litúrgica já oferece seu próprio material para download.
    const drawer=document.createElement('dialog');
    drawer.id='mobile-lit-drawer';drawer.className='mobile-lit-drawer';
    drawer.setAttribute('aria-label','Menu de navegação do site');
    const drawerHead=document.createElement('header');
    drawerHead.className='mobile-lit-drawer-head';
    const drawerBrand=document.createElement('a');drawerBrand.href=paths.home;
    drawerBrand.className='mobile-lit-drawer-brand';
    drawerBrand.innerHTML='<img src="/assets/img/icone.png" alt="" width="38" height="38"/><span>Douglas Assumpção<small>Música sacra · Arte & tradição</small></span>';
    const close=document.createElement('button');
    close.className='mobile-lit-close';close.type='button';close.setAttribute('aria-label','Fechar menu');
    close.innerHTML=svg('close');
    drawerHead.append(drawerBrand,close);
    const scroller=document.createElement('nav');
    scroller.className='mobile-lit-drawer-scroll';
    scroller.setAttribute('aria-label','Tempos litúrgicos e outras páginas');
    const sectionLabel=document.createElement('p');
    sectionLabel.className='mobile-lit-overline';sectionLabel.textContent='NAVEGAÇÃO';
    const homeLink=link('Início',paths.home,'mobile-lit-main-link');
    const groupTitle=document.createElement('p');groupTitle.className='mobile-lit-overline';
    groupTitle.textContent='REPERTÓRIO LITÚRGICO';
    const seasons=document.createElement('div');seasons.className='mobile-lit-seasons';
    const extrasLabel=document.createElement('p');extrasLabel.className='mobile-lit-overline';
    extrasLabel.textContent='OUTRAS ÁREAS';
    const extras=document.createElement('div');extras.className='mobile-lit-extras';
    [
      ['Loja',paths.shop],['Coleção Salve Regina',paths.collection],
      ['Meu carrinho',paths.cart],['Apoiar o projeto',paths.support],
      ['Contato',paths.contact]
    ].forEach(([title,href])=>extras.append(link(title,href,'mobile-lit-main-link')));
    const flourish=document.createElement('div');
    flourish.className='mobile-lit-flourish';flourish.setAttribute('aria-hidden','true');flourish.textContent='✦';
    scroller.append(sectionLabel,homeLink,groupTitle,seasons,extrasLabel,extras,flourish);
    drawer.append(drawerHead,scroller);
    document.body.append(drawer);
    function populateSeasons(source) {
      if(!source||seasons.children.length)return false;
      const items=[...source.querySelectorAll(':scope > li')];
      items.forEach(li=>{
        const summary=li.querySelector('details > summary');
        if(!summary)return;
        const links=[...li.querySelectorAll('details ul a[href]')];
        if(!links.length)return;
        const detail=document.createElement('details');
        detail.className='mobile-lit-season';
        const head=document.createElement('summary');
        head.textContent=summary.textContent.replace(/\s+/g,' ').trim();
        const sub=document.createElement('div');sub.className='mobile-lit-season-children';
        links.forEach(a=>{
          const href=a.getAttribute('href');
          if(!href||/^(?:javascript:|data:)/i.test(href))return;
          const label=a.textContent.replace(/\s+/g,' ').trim();
          const item=link(label,href,'mobile-lit-page-link');
          if(item.hasAttribute('aria-current'))detail.open=true;
          sub.append(item);
        });
        if(sub.children.length){detail.append(head,sub);seasons.append(detail);}
      });
      return seasons.children.length>0;
    }
    if(!populateSeasons(document.querySelector('#side-nav > ul'))) {
      // Algumas páginas de loja usam navegação própria, sem o menu litúrgico no HTML.
      const loading=document.createElement('p');loading.className='mobile-lit-loading';
      loading.textContent='Carregando tempos litúrgicos…';seasons.append(loading);
      fetch('/index.html',{credentials:'same-origin'})
        .then(response=>{if(!response.ok)throw new Error('Menu não encontrado');return response.text();})
        .then(html=>{
          const source=new DOMParser().parseFromString(html,'text/html').querySelector('#side-nav > ul');
          loading.remove();
          if(!populateSeasons(source))throw new Error('Menu vazio');
        })
        .catch(()=>{loading.textContent='Abra a página inicial para consultar os tempos litúrgicos.';seasons.append(loading);});
    }
    function openDrawer() {
      if(drawer.open)return;
      drawer.showModal();
      openMenu.setAttribute('aria-expanded','true');
      close.focus({preventScroll:true});
    }
    function closeDrawer(){
      if(drawer.open)drawer.close();
    }
    openMenu.addEventListener('click',openDrawer);
    close.addEventListener('click',closeDrawer);
    drawer.addEventListener('close',()=>{
      openMenu.setAttribute('aria-expanded','false');
      if(media.matches&&openMenu.isConnected)openMenu.focus({preventScroll:true});
    });
    drawer.addEventListener('click',e=>{
      if(e.target!==drawer)return;
      const bounds=drawer.getBoundingClientRect();
      if(e.clientX>bounds.right)closeDrawer();
    });

    // Botão Adicionar à Tela Inicial: mostra prompt nativo quando suportado,
    // ou instruções específicas do navegador sem prometer instalação automática.
    const installDialog=document.createElement('dialog');
    installDialog.id='mobile-lit-install-dialog';installDialog.className='mobile-lit-install-dialog';
    installDialog.setAttribute('aria-labelledby','mobile-lit-install-title');
    installDialog.innerHTML=
      '<div class="mobile-lit-install-inner">'+
      '<button type="button" class="mobile-lit-install-close" aria-label="Fechar">×</button>'+
      '<img src="/assets/img/icone.png" alt="" width="66" height="66">'+
      '<p class="mobile-lit-overline">ACESSO RÁPIDO</p>'+
      '<h2 id="mobile-lit-install-title">Seu site como aplicativo</h2>'+
      '<p id="mobile-lit-install-message"></p>'+
      '<button class="mobile-lit-install-done" type="button">Entendi</button>'+
      '</div>';
    document.body.append(installDialog);
    installDialog.querySelector('.mobile-lit-install-close').addEventListener('click',()=>installDialog.close());
    installDialog.querySelector('.mobile-lit-install-done').addEventListener('click',()=>installDialog.close());
    installDialog.addEventListener('click',event=>{if(event.target===installDialog)installDialog.close();});
    let deferredPrompt=null;
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();deferredPrompt=event;
    });
    window.addEventListener('appinstalled',()=>{deferredPrompt=null;});
    function standalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
    install.addEventListener('click',async()=>{
      if(standalone()){
        installDialog.querySelector('#mobile-lit-install-message').textContent='O site já está aberto como aplicativo na sua tela inicial.';
        installDialog.showModal();return;
      }
      if(deferredPrompt) {
        const prompt=deferredPrompt;deferredPrompt=null;
        try {await prompt.prompt();await prompt.userChoice;return;}catch(_) {}
      }
      const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||
        (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      const msg=isIOS
        ?'No Safari, toque em Compartilhar (quadrado com uma seta para cima), escolha “Adicionar à Tela de Início” e confirme em “Adicionar”.'
        :'No menu do navegador (geralmente ⋮), selecione “Instalar aplicativo” ou “Adicionar à tela inicial”, caso a opção esteja disponível.';
      installDialog.querySelector('#mobile-lit-install-message').textContent=msg;
      installDialog.showModal();
    });
    // Metadados de instalação complementares às páginas existentes.
    if(!document.querySelector('link[rel="manifest"]')){
      const manifest=document.createElement('link');manifest.rel='manifest';
      manifest.href='/manifest.webmanifest';document.head.append(manifest);
    }
    if(!document.querySelector('link[rel="apple-touch-icon"]')){
      const icon=document.createElement('link');icon.rel='apple-touch-icon';
      icon.href='/assets/img/icone.png';document.head.append(icon);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
      const m=document.createElement('meta');m.name='apple-mobile-web-app-capable';
      m.content='yes';document.head.append(m);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-title"]')){
      const m=document.createElement('meta');m.name='apple-mobile-web-app-title';
      m.content='Douglas Assumpção';document.head.append(m);
    }

    if(isHome){
      const main=document.querySelector('main.editorial-main');
      if(main){
        const intro=document.createElement('section');
        intro.className='mobile-lit-home-intro';
        intro.setAttribute('aria-label','Apresentação');
        intro.innerHTML='<p class="mobile-lit-home-eyebrow">DOUGLAS ASSUMPÇÃO · MÚSICA SACRA</p>'+
          '<div class="mobile-lit-home-ornament" aria-hidden="true">✦</div>'+
          '<h1>A beleza do canto que eleva a alma.</h1>'+
          '<p>Um espaço dedicado à música sacra, às partituras litúrgicas e à tradição da Igreja.</p>'+
          '<a class="mobile-lit-home-cta" href="#destaques">Explorar o repertório <span aria-hidden="true">↓</span></a>'+
          '<span class="mobile-lit-home-motto">Ad Maiorem Dei Gloriam</span>';
        main.insertBefore(intro,main.firstChild);
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();