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
    cart: '<path d="M2 3h3l3 13h11l3-9H6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
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

    const onShopPage=document.body.classList.contains('shop-shared-shell');
    const homeShortcut=document.createElement('a');
    homeShortcut.href='/index.html';homeShortcut.className='mobile-sacred-home-link';
    homeShortcut.innerHTML=icon('home')+'<span>Início</span>';
    homeShortcut.setAttribute('aria-label','Ir para a página inicial do site');
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
    const cartLink=document.createElement('a');
    cartLink.href='/pages/cart.html';cartLink.className='mobile-sacred-cart-link';
    cartLink.setAttribute('aria-label','Abrir carrinho');
    cartLink.innerHTML=icon('cart')+'<span>Carrinho</span><b class="mobile-sacred-cart-count" hidden aria-hidden="true">0</b>';
    if(/\/pages\/cart\.html$/.test(PAGE))cartLink.setAttribute('aria-current','page');

    const actions=document.createElement('div');actions.className='mobile-sacred-actions';
    if(onShopPage)actions.append(shopLink,cartLink);
    else actions.append(shopLink,installBtn);
    header.append(menuBtn,brand,actions);

    if(onShopPage){
      // Busca acessível nas páginas de catálogo, produto e carrinho.
      // Usa o mesmo parâmetro q do catálogo; nenhum endpoint adicional.
      menuBtn.setAttribute('aria-label','Abrir menu da loja');
      const toolbar=document.createElement('form');
      toolbar.className='mobile-sacred-shop-toolbar';
      toolbar.action='/pages/loja.html#catalogo';
      toolbar.method='get';
      toolbar.setAttribute('role','search');
      toolbar.setAttribute('aria-label','Pesquisar produtos da loja');
      toolbar.innerHTML='<label class="mobile-sacred-shop-toolbar-label" for="mobile-shop-query">Pesquisar no catálogo</label>'+
        '<input id="mobile-shop-query" type="search" name="q" placeholder="Buscar camisetas, canecas e mais…" autocomplete="off" maxlength="100">'+
        '<button type="submit" aria-label="Buscar produtos">'+icon('search')+'</button>';
      toolbar.querySelector('input').value=(new URLSearchParams(location.search).get('q')||'').slice(0,100);
      header.append(toolbar);

      // O mesmo formato validado pelo carrinho real da loja.
      const badge=cartLink.querySelector('.mobile-sacred-cart-count');
      function refreshCartCount(){
        let count=0;
        try {
          const rows=JSON.parse(localStorage.getItem('douglasShopCart_v2')||'[]');
          if(Array.isArray(rows)){
            count=Math.min(30,rows.reduce((sum,row)=>sum+(row &&
              typeof row.id==='string' && typeof row.variant==='string' &&
              Number.isInteger(row.qty) && row.qty>0 ? Math.min(row.qty,10) : 0),0));
          }
        } catch (_) {}
        badge.textContent=String(count);
        badge.hidden=count===0;
        cartLink.setAttribute('aria-label',count? 'Abrir carrinho, '+count+' itens':'Abrir carrinho');
      }
      refreshCartCount();
      document.addEventListener('douglas-cart-change',refreshCartCount);
      window.addEventListener('storage',event=>{if(event.key==='douglasShopCart_v2')refreshCartCount();});
      window.addEventListener('pageshow',refreshCartCount);
    }
    document.body.insertBefore(header,document.body.firstChild);

    const drawer=document.createElement('dialog');
    drawer.id='mobile-sacred-drawer';drawer.className='mobile-sacred-drawer';
    drawer.setAttribute('aria-label','Menu de navegação');
    drawer.innerHTML='<div class="mobile-sacred-drawer-head">'+
      '<div><p class="mobile-sacred-overline">Música sacra · Arte & tradição</p>'+
      '<h2>Menu</h2></div>'+
      '<button type="button" class="mobile-sacred-close" aria-label="Fechar menu">×</button></div>';
    const scroll=document.createElement('div');scroll.className='mobile-sacred-menu-scroll';
    // O menu móvel mostra somente a navegação litúrgica: os demais
    // destinos continuam acessíveis por seus próprios links/páginas.
    const menuLabel=document.createElement('p');
    menuLabel.className='mobile-sacred-menu-caption';
    menuLabel.textContent='Repertório litúrgico';
    scroll.append(menuLabel);
    const groupsHost=document.createElement('nav');groupsHost.className='mobile-sacred-groups';
    groupsHost.setAttribute('aria-label',onShopPage?'Navegação da loja':'Tempos litúrgicos e ordinário da Missa');
    if(onShopPage){
      drawer.classList.add('mobile-sacred-shop-drawer');
      drawer.querySelector('h2').textContent='Menu da loja';
      menuLabel.textContent='Explore a loja';
      groupsHost.classList.add('mobile-sacred-shop-nav');
      for(const [name,url] of [
        ['Todos os produtos','/pages/loja.html#catalogo'],
        ['Coleção Salve Regina','/pages/colecao-salve-regina.html'],
        ['Meu carrinho','/pages/cart.html'],
        ['Entregas e trocas','/pages/condicoes-da-loja.html'],
        ['Fale conosco','/pages/contato.html'],
        ['Página inicial do site','/index.html']
      ]){
        const a=link(name,url,'mobile-sacred-shop-nav-link');
        if(PAGE==='/pages/cart.html' && url==='/pages/cart.html')a.setAttribute('aria-current','page');
        groupsHost.append(a);
      }
    }
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
      const order=['Tempo Comum','Advento','Natal','Quaresma','Páscoa','Festas e Solenidades','Ordinário da missa'];
      const candidates=[...source.children];
      candidates.sort((a,b)=>{
        const title=li=>safeText(li.querySelector('summary')||li).toLowerCase();
        const rank=li=>{const idx=order.findIndex(name=>name.toLowerCase()===title(li));return idx===-1?99:idx;};
        return rank(a)-rank(b);
      });
      candidates.forEach((li,index)=>{
        const summary=li.querySelector('details > summary');
        if(!summary) return;
        const items=[...li.querySelectorAll('details ul a[href]')];
        if(!items.length) return;
        const details=document.createElement('details');
        details.className='mobile-sacred-category';
        const summaryNew=document.createElement('summary');
        const categoryName=safeText(summary);
        if(HOME) {
          // Título inteiro em uma única linha tipográfica, sem inicial separada.
          // Evita espaços artificiais e melhora a leitura no menu estreito.
          const label=document.createElement('span');
          label.className='mobile-sacred-menu-label';
          label.textContent=categoryName;
          summaryNew.append(label);
        } else summaryNew.textContent=categoryName;
        summaryNew.setAttribute('aria-label','Expandir '+categoryName);
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
    if(!onShopPage){
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
        ? 'Abra este site no Safari, toque no botão Compartilhar (quadrado com seta para cima) e escolha “Adicionar à Tela de Início”. Ative “Abrir como App da Web”, se aparecer, e confirme em “Adicionar”.'
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
        welcome.className='mobile-sacred-welcome mobile-sacred-art-gallery';
        welcome.setAttribute('aria-label','Arte sacra da página inicial');
        const artworks=[
          {src:'/assets/img/mobile/home-maria-jose-mobile-sem-faixas-20261105.svg',name:'Nossa Senhora e São José',alt:'Iluminura medieval de Nossa Senhora e São José com cruz, oração e moldura gótica dourada completa.',layout:'manuscript'},
          {src:'/assets/img/mobile/mobile-home-maria.webp',name:'Nossa Senhora com o Menino Jesus',alt:'Nossa Senhora com o Menino Jesus em uma moldura gótica dourada, diante de uma imagem mariana escurecida.'},
          {src:'/assets/img/mobile/mobile-home-agnus-dei.webp',name:'Agnus Dei',alt:'Cordeiro Pascal diante de um ícone escurecido de Cristo, em moldura de quatro lóbulos com detalhes dourados.'}
        ];
        const frames=artworks.map((art,i)=>{
          const figure=document.createElement('figure');
          figure.className='mobile-sacred-art-frame'+(i===0?' is-active':'')+(art.layout==='manuscript'?' is-manuscript':'');
          figure.setAttribute('aria-hidden',String(i!==0));
          if(i!==0)figure.inert=true;
          const img=document.createElement('img');
          img.src=art.src;img.alt=art.alt;img.decoding='async';
          img.loading='eager';
          img.fetchPriority=i===0?'high':'low';
          img.width=art.layout==='manuscript'?941:844;img.height=art.layout==='manuscript'?1672:1500;
          figure.append(img);
          welcome.append(figure);
          return figure;
        });
        const controls=document.createElement('div');
        controls.className='mobile-sacred-art-controls';
        controls.setAttribute('role','group');
        controls.setAttribute('aria-label','Escolher uma das imagens da página inicial');
        const dots=artworks.map((art,i)=>{
          const button=document.createElement('button');
          button.type='button';button.className='mobile-sacred-art-dot';
          button.setAttribute('aria-label','Ver arte: '+art.name);
          button.setAttribute('aria-pressed',String(i===0));
          button.title=art.name;controls.append(button);
          return button;
        });
        const status=document.createElement('p');
        status.className='mobile-sacred-art-status';
        status.setAttribute('aria-live','polite');
        status.textContent='Imagem 1 de '+artworks.length+': '+artworks[0].name;
        welcome.append(controls,status);
        let selected=0;
        function selectArtwork(index) {
          const next=(index+artworks.length)%artworks.length;
          if(next===selected)return;
          selected=next;
          frames.forEach((frame,i)=>{
            const active=i===selected;
            frame.classList.toggle('is-active',active);
            frame.setAttribute('aria-hidden',String(!active));
            frame.inert=!active;
            dots[i].setAttribute('aria-pressed',String(active));
          });
          status.textContent='Imagem '+(selected+1)+' de '+artworks.length+': '+artworks[selected].name;
        }
        dots.forEach((button,i)=>{
          button.addEventListener('click',()=>selectArtwork(i));
          button.addEventListener('keydown',event=>{
            if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;
            event.preventDefault();
            const next=(i+(event.key==='ArrowRight'?1:-1)+dots.length)%dots.length;
            selectArtwork(next);dots[next].focus();
          });
        });
        // Troca por gesto horizontal, sem rolagem vertical da home.
        let touchX=null,touchY=null;
        welcome.addEventListener('touchstart',event=>{
          if(event.touches.length!==1)return;
          touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;
        },{passive:true});
        welcome.addEventListener('touchend',event=>{
          if(touchX===null||touchY===null||event.changedTouches.length!==1)return;
          const deltaX=event.changedTouches[0].clientX-touchX;
          const deltaY=event.changedTouches[0].clientY-touchY;
          touchX=null;touchY=null;
          if(Math.abs(deltaX)>=45&&Math.abs(deltaX)>Math.abs(deltaY)*1.2){
            selectArtwork(selected+(deltaX<0?1:-1));
          }
        },{passive:true});
        welcome.addEventListener('touchcancel',()=>{touchX=null;touchY=null;},{passive:true});
        main.insertBefore(welcome,main.firstChild);
      }
    }

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();