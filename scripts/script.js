// script.js - funções: carrossel, dark-mode e animações simples

// Carrega dinamicamente o script do AdSense caso ainda não esteja presente.
(function loadAdSense(){
  try{
    if(document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4057076422969683';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }catch(e){}
})();

document.addEventListener('DOMContentLoaded', async () => {
  // Remover o botão de alternância do modo escuro (🌙) de todas as páginas
  try{
    const darkBtn = document.getElementById('dark-toggle');
    if(darkBtn) darkBtn.parentNode && darkBtn.remove();
  }catch(e){}

  // Insere o cabeçalho padrão a partir do `index.html` caso esteja ausente
  async function ensureHeader(){
    const existing = document.querySelector('.site-header');
    if(existing && existing.querySelector('.header-actions') && existing.querySelector('.header-actions').querySelector('.icon-btn')) return;
    const candidates = ['../index.html','/index.html','index.html'];
    for(const path of candidates){
      try{
        const res = await fetch(path);
        if(!res.ok) continue;
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const srcHeader = doc.querySelector('.site-header');
        if(srcHeader){
          // Remover possível botão dark-toggle do cabeçalho importado
          const imported = srcHeader.cloneNode(true);
          const importedDark = imported.querySelector('#dark-toggle');
          if(importedDark) importedDark.remove();

          if(existing){
            existing.parentNode.replaceChild(imported, existing);
          } else {
            document.body.insertAdjacentElement('afterbegin', imported);
          }
          // normalizar possíveis hrefs relativos
          try{
            const anchors = document.querySelectorAll('.site-header a[href]');
            anchors.forEach(a => {
              const href = a.getAttribute('href');
              if(!href) return;
              if(href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.match(/^https?:\/\//i) || href.startsWith('/')) return;
              try{ const u = new URL(href, location.origin + '/'); a.setAttribute('href', u.pathname + u.search + u.hash); }catch(e){}
            });
          }catch(e){}
        }
        break;
      }catch(err){ continue; }
    }
  }

  // Popular automaticamente a seção de destaques a partir de pages/pages.json
  async function loadAutoHighlights(){
    const container = document.querySelector('.articles');
    if(!container) return;
    try{
      const res = await fetch('/pages/pages.json');
      if(!res.ok) return;
      const items = await res.json();
      if(!Array.isArray(items) || items.length === 0) return;
      // construir HTML simples de cards
      const html = [];
      html.push('<h2>DESTAQUES DA SEMANA</h2>');
      for(const it of items.slice(0,6)){
        const thumb = it.thumb || '/assets/img/thumbnails.jpg';
        const tag = it.tag ? `<small class="tag">${it.tag}</small>` : '';
        const excerpt = it.excerpt ? `<p>${it.excerpt}</p>` : '';
        const downloadIndicator = it.hasPartitura ? `<span class="partitura-indicator">Partitura disponível</span>` : '';
        const actions = `\n<div class="card-actions">\n<a class="btn" href="${it.url}">Abrir matéria</a>\n${downloadIndicator}\n${it.download?`<a class="btn outline" href="${it.download}" download>Baixar partitura</a>`:''}\n</div>`;
        html.push(`<article class="list-card">\n<img src="${thumb}" alt="${it.title}">\n<div class="card-body">\n${tag}\n<h3>${it.title}</h3>\n${excerpt}\n${actions}\n</div>\n</article>`);
      }
      container.innerHTML = html.join('\n');
    }catch(e){ /* silencioso */ }
  }
  // SIDE NAV: garantir que o markup do menu exista em TODAS as pÃ¡ginas
  let menuBtn; // será (re)consultado após possíveis substituições do cabeçalho
  let sideNav = document.getElementById('side-nav');
  let navOverlay = document.getElementById('nav-overlay');

  // tornar o logo um link para a pÃ¡gina inicial em todas as pÃ¡ginas
  (function ensureLogoLink(){
    const logo = document.querySelector('.logo');
    if(!logo) return;
    // se houver uma Ã¢ncora jÃ¡, atualiza href para raiz
    const existingA = logo.querySelector('a');
    if(existingA){ existingA.setAttribute('href', '/index.html'); return; }
    // caso contrÃ¡rio, envolver o img em <a>
    const img = logo.querySelector('img');
    if(img){
      const a = document.createElement('a');
      a.setAttribute('href','/index.html');
      a.setAttribute('aria-label','Ir para inÃ­cio');
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
    }
  })();

  // tenta injetar o #side-nav e #nav-overlay a partir do index.html caso nÃ£o existam
  async function ensureSideNav(){
    if(sideNav && navOverlay) return;
    const candidates = ['../index.html','/index.html','index.html'];
    for(const path of candidates){
      try{
        const res = await fetch(path);
        if(!res.ok) continue;
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const srcNav = doc.getElementById('side-nav');
        const srcOverlay = doc.getElementById('nav-overlay');
        if(srcNav){
          // inserir o nav no inÃ­cio do body
          document.body.insertAdjacentHTML('afterbegin', srcNav.outerHTML);
          sideNav = document.getElementById('side-nav');
          // normalizar hrefs do menu para caminhos absolutos relativos Ã  raiz
          try{
            const anchors = sideNav.querySelectorAll('a[href]');
            anchors.forEach(a => {
              const href = a.getAttribute('href');
              if(!href) return;
              // nÃ£o tocar em anchors internos, anchors mailto/tel ou URLs completas
              if(href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.match(/^https?:\/\//i) || href.startsWith('/')) return;
              try{
                const u = new URL(href, location.origin + '/');
                const abs = u.pathname + u.search + u.hash;
                a.setAttribute('href', abs);
              }catch(e){}
            });
          }catch(e){}
        }
        if(srcOverlay){
          document.body.insertAdjacentHTML('beforeend', srcOverlay.outerHTML);
          navOverlay = document.getElementById('nav-overlay');
        } else if(!navOverlay){
          // criar overlay mÃ­nimo se nÃ£o houver um
          document.body.insertAdjacentHTML('beforeend', '<div id="nav-overlay" class="nav-overlay" hidden></div>');
          navOverlay = document.getElementById('nav-overlay');
        }
        break;
      }catch(err){
        // falha no fetch, tenta prÃ³xima opÃ§Ã£o
        continue;
      }
    }
  }

  await ensureSideNav();
  await ensureHeader();
  await loadAutoHighlights();

  // (re)obter referências a elementos que podem ter sido inseridos/substituídos
  menuBtn = document.getElementById('menu-btn');
  sideNav = document.getElementById('side-nav') || sideNav;
  navOverlay = document.getElementById('nav-overlay') || navOverlay;
  const closeNav = document.getElementById('close-nav');

  function openNav(){
    if(!sideNav) return;
    sideNav.classList.add('open');
    sideNav.setAttribute('aria-hidden','false');
    if(navOverlay) { navOverlay.classList.add('show'); navOverlay.hidden = false; }
    document.body.classList.add('nav-open');
  }
  function closeNavFn(){
    if(!sideNav) return;
    sideNav.classList.remove('open');
    sideNav.setAttribute('aria-hidden','true');
    if(navOverlay) { navOverlay.classList.remove('show'); navOverlay.hidden = true; }
    document.body.classList.remove('nav-open');
  }
  if(menuBtn) menuBtn.addEventListener('click', openNav);
  if(closeNav) closeNav.addEventListener('click', closeNavFn);
  if(navOverlay) navOverlay.addEventListener('click', closeNavFn);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeNavFn(); });

  // CARROSSEL (scroll-snap based)
  const carousel = document.getElementById('carousel');
  const slides = carousel ? Array.from(carousel.querySelectorAll('.slide')) : [];
  const dotsContainer = document.getElementById('carousel-dots');
  let current = 0;

  function buildDots(){
    if(!dotsContainer) return;
    dotsContainer.innerHTML = '';
    slides.forEach((_,i)=>{
      const btn = document.createElement('button');
      if(i===0) btn.classList.add('active');
      btn.addEventListener('click', ()=> goTo(i));
      dotsContainer.appendChild(btn);
    });
  }

  function updateDots(){
    if(!dotsContainer) return;
    const dots = Array.from(dotsContainer.children);
    dots.forEach((d, i)=> d.classList.toggle('active', i===current));
  }

  function goTo(i){
    if(!slides.length || !carousel) return;
    if(i < 0) i = slides.length - 1;
    if(i >= slides.length) i = 0;
    current = i;
    slides.forEach(s => s.classList.toggle('active', false));
    slides[current].classList.add('active');
    updateDots();
    // Scroll apenas o container do carrossel (evita rolar a pÃ¡gina inteira)
    if (carousel && typeof carousel.scrollTo === 'function') {
      const left = slides[current].offsetLeft - carousel.offsetLeft;
      carousel.scrollTo({ left, behavior: 'smooth' });
    } else {
      slides[current].scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    }
  }

  function next(){ goTo((current + 1) % slides.length); }
  function prev(){ goTo((current - 1 + slides.length) % slides.length); }

  if(slides.length) buildDots();

  // autoplay
  let autoplay = slides.length ? setInterval(next, 6000) : null;
  if(carousel){
    carousel.addEventListener('mouseenter', ()=> { if(autoplay) clearInterval(autoplay); });
    carousel.addEventListener('mouseleave', ()=> { if(autoplay) clearInterval(autoplay); autoplay = setInterval(next,6000); });

    // arrows
    const prevBtn = carousel.querySelector('.carousel-arrow.prev');
    const nextBtn = carousel.querySelector('.carousel-arrow.next');
    if(prevBtn) prevBtn.addEventListener('click', prev);
    if(nextBtn) nextBtn.addEventListener('click', next);

    // detect current slide on scroll
    function detectCurrentOnScroll(){
      const center = carousel.scrollLeft + carousel.clientWidth/2;
      let closest = 0; let minDist = Infinity;
      slides.forEach((s, idx)=>{
        const rectCenter = s.offsetLeft + s.offsetWidth/2;
        const dist = Math.abs(center - rectCenter);
        if(dist < minDist){ minDist = dist; closest = idx; }
      });
      if(closest !== current){
        current = closest;
        slides.forEach(s => s.classList.toggle('active', false));
        slides[current].classList.add('active');
        updateDots();
      }
    }
    let scrollTimeout;
    carousel.addEventListener('scroll', ()=>{ clearTimeout(scrollTimeout); scrollTimeout = setTimeout(detectCurrentOnScroll, 80); });
  }

  // click on slide opens link (data-link)
  slides.forEach(s=>{
    s.addEventListener('click', (ev)=>{
      const link = s.dataset.link;
      // decide whether the click should trigger navigation:
      // only navigate when the user clicks on an actionable element inside the slide
      // (an <a>, <button>, the image itself, or the .hero-content area). This
      // prevents accidental navigation when clicking empty/black areas of the slide.
      let shouldNavigate = false;
      if(link){
        const t = ev.target;
        try{
          if(t.closest('a') || t.closest('button')) shouldNavigate = true;
        }catch(e){}
        if(!shouldNavigate){
          if(t.tagName === 'IMG') shouldNavigate = true;
        }
        // do NOT consider clicks on the whole `.hero-content` as implicit navigation
        // (user requested navigation only on explicit controls)
      }
      s.animate([{transform:'scale(0.99)'},{transform:'scale(1)'}],{duration:220});
      if(shouldNavigate) window.location.href = link;
    });
  });

  // keyboard navigation
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') prev();
    if(e.key === 'ArrowRight') next();
  });

  // DARK MODE persistente
  const darkToggle = document.getElementById('dark-toggle');
  const body = document.body;
  const saved = localStorage.getItem('darkmode');
  if(saved === 'on') body.classList.add('dark');

  if(darkToggle) darkToggle.addEventListener('click', ()=>{
    body.classList.toggle('dark');
    localStorage.setItem('darkmode', body.classList.contains('dark') ? 'on' : 'off');
  });

  // efeito hover nas imagens (zoom leve)
  document.querySelectorAll('.card img, .video-card img, .list-card img').forEach(img=>{
    img.style.transition = 'transform .35s ease';
    img.addEventListener('mouseenter', ()=> img.style.transform = 'scale(1.03)');
    img.addEventListener('mouseleave', ()=> img.style.transform = 'scale(1)');
  });

});

// Contribuição voluntária global: todos os links continuam com seus hrefs originais.
// Documentação, extensão e checklist: docs/contribuicao-partituras.md.
(function scoreContributionSystem(){
  'use strict';
  if (window.ScoreContribution || !window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;

  const siteRoot = new URL('../', document.currentScript.src);
  // CONFIGURAÇÃO PIX: dados já publicados em pages/doacao.html.
  // PIX manual: não cria cobranças, não confirma pagamentos e não exige comprovante.
  // Para desativar o PIX, deixe key vazia. Nunca coloque credenciais privadas aqui.
  const PIX = Object.freeze({
    key: 'douglas.assumpcao@hotmail.com',
    qrCode: new URL('assets/img/qrcode-pix-oficial.png', siteRoot).href
  });

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('styles/score-contribution.css', siteRoot).href;
  const stylesReady = new Promise(resolve => {
    const timeout = setTimeout(() => resolve(false), 5000);
    stylesheet.onload = () => { clearTimeout(timeout); resolve(true); };
    stylesheet.onerror = () => { clearTimeout(timeout); resolve(false); };
  });
  document.head.appendChild(stylesheet);

  let dialog, selectedScore, returnFocus, scrollState, closeTimer;
  let requestId = 0;
  let closing = false;
  const resumedDownloads = new WeakSet();
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const get = selector => dialog.querySelector(selector);

  function scoreFromLink(link){
    if (!link || link.closest('[data-score-contribution="off"]') || link.dataset.freeScore === 'false') return null;
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#') || raw.includes('{{')) return null;
    let url;
    try { url = new URL(raw, document.baseURI); } catch (_) { return null; }
    if (!/^(https?:|file:|blob:)$/.test(url.protocol) && !/^data:application\/pdf[;,]/i.test(raw)) return null;
    const explicit = link.hasAttribute('data-free-score');
    const scorePath = /\/assets\/partituras\//i.test(url.pathname);
    const pdf = /\.pdf$/i.test(url.pathname) || /^data:application\/pdf[;,]/i.test(raw);
    const label = /partitura|baixar\s+pdf/i.test(link.textContent);
    if (!explicit && !(link.hasAttribute('download') && (scorePath || pdf || label))) return null;
    // Produtos pagos são excluídos por store.js; o atributo explícito permite gratuitos.
    if (!explicit && link.closest('.product-detail, .product-card')) return null;
    const container = link.closest('.list-card, .white-inner, article');
    const heading = container?.querySelector('h1, h2, h3, strong') || document.querySelector('main h1, h1');
    return Object.freeze({
      id: link.dataset.scoreId || url.pathname,
      name: link.dataset.scoreTitle || heading?.textContent.trim() || document.title,
      url: url.href,
      filename: link.getAttribute('download'),
      target: link.getAttribute('target'),
      rel: link.getAttribute('rel'),
      referrerPolicy: link.getAttribute('referrerpolicy')
    });
  }

  function createModal(){
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'score-contribution';
    dialog.setAttribute('aria-labelledby', 'sc-title');
    dialog.setAttribute('aria-describedby', 'sc-description sc-voluntary');
    dialog.innerHTML = `
      <div class="sc-frame">
        <button type="button" class="sc-close" aria-label="Fechar contribuição">×</button>
        <div class="sc-content">
        <div class="sc-ornament" aria-hidden="true">
          <span></span><svg width="34" height="42" viewBox="0 0 34 42" fill="none" focusable="false">
            <path d="M17 3v36M5 15h24M13 6h8M13 36h8M7 11v8M27 11v8" stroke="currentColor" stroke-width="1.5"/>
            <path d="m17 10 5 5-5 5-5-5Z" fill="currentColor"/>
            <circle cx="17" cy="15" r="2" fill="#783e36"/>
          </svg><span></span>
        </div>
        <p class="sc-eyebrow">Partitura gratuita</p>
        <h2 id="sc-title" tabindex="-1">Apoie este apostolado musical</h2>
        <p class="sc-score-name"></p>
        <p id="sc-description">Esta partitura é disponibilizada gratuitamente.<br>Se este trabalho auxilia sua paróquia, ministério ou oração, você pode colaborar voluntariamente para a produção de novas partituras e gravações.</p>
        <form class="sc-form" novalidate>
          <fieldset class="sc-amounts">
            <legend>Contribuição voluntária</legend>
            <div class="sc-options">
              <label><input type="radio" name="sc-amount" value="5"><span>R$ 5</span></label>
              <label><input type="radio" name="sc-amount" value="10" checked><span>R$ 10</span></label>
              <label><input type="radio" name="sc-amount" value="20"><span>R$ 20</span></label>
              <label><input type="radio" name="sc-amount" value="other"><span>Outro valor</span></label>
            </div>
          </fieldset>
          <div class="sc-custom" hidden>
            <label for="sc-custom-amount">Qual valor deseja oferecer?</label>
            <div class="sc-input-wrap"><span aria-hidden="true">R$</span><input id="sc-custom-amount" type="text" inputmode="decimal" maxlength="13" placeholder="0,00" autocomplete="off" aria-describedby="sc-amount-error"></div>
          </div>
          <p id="sc-amount-error" class="sc-error" role="alert" hidden></p>
          <button type="submit" class="sc-button sc-primary">Contribuir via PIX e baixar</button>
        </form>
        <section class="sc-pix" aria-labelledby="sc-pix-title" hidden>
          <h3 id="sc-pix-title" tabindex="-1">Sua contribuição via PIX</h3>
          <p class="sc-pix-amount"></p>
          <div class="sc-pix-details">
            <p>Escaneie o QR Code ou copie a chave abaixo. Confira o destinatário e ajuste o valor no aplicativo do seu banco.</p>
            <img class="sc-qr" width="152" height="152" alt="QR Code PIX já disponibilizado pelo apostolado">
            <label for="sc-pix-key">Chave PIX · e-mail</label>
            <input id="sc-pix-key" type="text" readonly>
            <button type="button" class="sc-button sc-copy">Copiar chave PIX</button>
          </div>
          <p class="sc-pix-unavailable" hidden>O PIX está temporariamente indisponível. Você pode continuar gratuitamente abaixo.</p>
          <p class="sc-status" role="status" aria-live="polite"></p>
          <p class="sc-manual-note">A transferência é feita no seu banco. Não há confirmação automática e você pode baixar sem aguardar ou enviar comprovante.</p>
          <button type="button" class="sc-back">Voltar aos valores</button>
        </section>
        </div>
        <div class="sc-download-actions">
          <div class="sc-separator"><span>ou</span></div>
          <button type="button" class="sc-button sc-free">Continuar gratuitamente</button>
          <p id="sc-voluntary"><strong>A contribuição é totalmente voluntária.</strong><br>Você pode baixar gratuitamente mesmo sem doar.</p>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    get('.sc-close').addEventListener('click', closeContributionModal);
    get('.sc-free').addEventListener('click', continueFreeDownload);
    get('.sc-form').addEventListener('submit', event => { event.preventDefault(); startPixContribution(); });
    get('.sc-amounts').addEventListener('change', event => selectContributionAmount(event.target.value));
    get('#sc-custom-amount').addEventListener('input', clearAmountError);
    get('.sc-copy').addEventListener('click', copyPixKey);
    get('.sc-back').addEventListener('click', () => {
      get('.sc-pix').hidden = true;
      get('.sc-form').hidden = false;
      get('input[name="sc-amount"]:checked').focus();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeContributionModal(); });
    // Só fecha quando o gesto inteiro ocorre fora, sem interromper seleção de texto.
    const outside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    let backdropDown = false;
    dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog && outside(event); });
    dialog.addEventListener('click', event => {
      if (backdropDown && event.target === dialog && outside(event)) closeContributionModal();
      backdropDown = false;
    });
    dialog.addEventListener('keydown', event => {
      // Impede atalhos do carrossel/menu por trás do dialog. Mantém setas dos radios.
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, input, [tabindex="0"]')]
        .filter(el => !el.disabled && el.getClientRects().length && (el.type !== 'radio' || el.checked));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
  }

  function lockScroll(){
    const properties = ['position', 'top', 'left', 'right', 'width', 'overflow'];
    scrollState = { x: window.scrollX, y: window.scrollY, styles: properties.map(key => [key, document.body.style.getPropertyValue(key), document.body.style.getPropertyPriority(key)]) };
    Object.assign(document.body.style, { position: 'fixed', top: `-${scrollState.y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
  }

  function unlockScroll(){
    if (!scrollState) return;
    scrollState.styles.forEach(([key, value, priority]) => value ? document.body.style.setProperty(key, value, priority) : document.body.style.removeProperty(key));
    const root = document.documentElement.style;
    const behavior = root.getPropertyValue('scroll-behavior');
    const priority = root.getPropertyPriority('scroll-behavior');
    root.setProperty('scroll-behavior', 'auto', 'important');
    window.scrollTo(scrollState.x, scrollState.y);
    behavior ? root.setProperty('scroll-behavior', behavior, priority) : root.removeProperty('scroll-behavior');
    scrollState = null;
  }

  async function openContributionModal(score, trigger){
    const currentRequest = ++requestId;
    const ready = await stylesReady;
    if (currentRequest !== requestId) return;
    // Falha de CSS nunca bloqueia o acesso gratuito nem mostra um modal sem estilo.
    if (!ready) { downloadSelectedScore(score); return; }
    createModal();
    clearTimeout(closeTimer);
    closing = false;
    dialog.classList.remove('sc-closing');
    selectedScore = score;
    returnFocus = trigger || document.activeElement;
    get('.sc-score-name').textContent = score.name;
    get('.sc-form').reset();
    get('.sc-form').hidden = false;
    get('.sc-pix').hidden = true;
    get('.sc-status').textContent = '';
    selectContributionAmount('10');
    if (!dialog.open) { lockScroll(); dialog.showModal(); }
    dialog.scrollTop = 0;
    get('.sc-content').scrollTop = 0;
    get('#sc-title').focus({ preventScroll: true });
  }

  function closeContributionModal(){
    ++requestId;
    if (!dialog?.open || closing) return;
    closing = true;
    selectedScore = null;
    dialog.classList.add('sc-closing');
    closeTimer = setTimeout(() => {
      dialog.close();
      dialog.classList.remove('sc-closing');
      unlockScroll();
      closing = false;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
  }

  function clearAmountError(){
    get('#sc-amount-error').hidden = true;
    get('#sc-custom-amount').removeAttribute('aria-invalid');
  }

  function selectContributionAmount(value){
    if (!['5', '10', '20', 'other'].includes(value)) return;
    get(`input[name="sc-amount"][value="${value}"]`).checked = true;
    get('.sc-custom').hidden = value !== 'other';
    clearAmountError();
    if (value === 'other') get('#sc-custom-amount').focus();
  }

  function contributionCents(){
    const value = get('input[name="sc-amount"]:checked').value;
    if (value !== 'other') return Number(value) * 100;
    const raw = get('#sc-custom-amount').value.trim();
    // Aceita 12,50 / 12.50 / 1.234,56 sem arredondar entradas inválidas.
    const normalized = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const cents = Math.round(Number(normalized) * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  function startPixContribution(){
    if (!selectedScore || closing) return;
    const amountCents = contributionCents();
    if (!amountCents) {
      get('#sc-amount-error').textContent = 'Digite um valor maior que zero, com até duas casas decimais, ou continue gratuitamente.';
      get('#sc-amount-error').hidden = false;
      get('#sc-custom-amount').setAttribute('aria-invalid', 'true');
      get('#sc-custom-amount').focus();
      return;
    }
    // PONTO DE INTEGRAÇÃO FUTURA: enviar { score: selectedScore, amountCents }
    // ao backend de PIX. Manter o download livre; confirmação só via servidor.
    // Neste fluxo manual o arquivo permanece em selectedScore, sem redirecionar.
    get('.sc-form').hidden = true;
    get('.sc-pix').hidden = false;
    get('.sc-pix-amount').textContent = `Valor escolhido: ${money.format(amountCents / 100)}`;
    get('.sc-pix-details').hidden = !PIX.key;
    get('.sc-pix-unavailable').hidden = Boolean(PIX.key);
    get('.sc-manual-note').hidden = !PIX.key;
    get('#sc-pix-key').value = PIX.key;
    const qr = get('.sc-qr');
    qr.hidden = !PIX.qrCode;
    qr.onerror = () => { qr.hidden = true; };
    if (PIX.qrCode) qr.src = PIX.qrCode;
    get('.sc-status').textContent = '';
    get('#sc-pix-title').focus();
  }

  async function copyPixKey(){
    const currentRequest = requestId;
    try {
      await navigator.clipboard.writeText(PIX.key);
      if (currentRequest === requestId && !closing) get('.sc-status').textContent = 'Chave PIX copiada. Faça a transferência no aplicativo do seu banco.';
    } catch (_) {
      if (currentRequest !== requestId || closing) return;
      get('#sc-pix-key').focus();
      get('#sc-pix-key').select();
      get('.sc-status').textContent = 'Selecione e copie a chave acima para usar no aplicativo do seu banco.';
    }
  }

  function downloadSelectedScore(score){
    if (!score) return;
    const link = document.createElement('a');
    link.href = score.url;
    // Mantém inclusive o nome de arquivo dos uploads, target e política de referência.
    if (score.filename !== null) link.setAttribute('download', score.filename);
    if (score.target) link.target = score.target;
    if (score.rel) link.rel = score.rel;
    if (score.referrerPolicy) link.referrerPolicy = score.referrerPolicy;
    resumedDownloads.add(link);
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function continueFreeDownload(){
    if (!selectedScore || closing) return;
    const score = selectedScore;
    closeContributionModal();
    // Executa no próprio gesto do usuário, sem aguardar animação, PIX ou rede.
    downloadSelectedScore(score);
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || resumedDownloads.has(link) || event.defaultPrevented || event.button > 0) return;
    const score = scoreFromLink(link);
    if (!score) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openContributionModal(score, link);
  }, true);

  // Integrações futuras podem abrir o mesmo modal a partir de um link existente.
  window.ScoreContribution = Object.freeze({
    open(link){ const score = scoreFromLink(link); if (score) return openContributionModal(score, link); },
    close: closeContributionModal
  });
})();
