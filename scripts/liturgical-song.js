/* Recursos opcionais e acessibilidade das páginas de Entrada e Comunhão. */
(() => {
  'use strict';
  const nav = document.getElementById('side-nav');
  const menu = document.getElementById('menu-btn');
  const outside = [...document.querySelectorAll('.site-header, .wrap, .liturgical-footer, .chant-skip')];
  let wasOpen = false;
  function syncMenu() {
    const open = nav.classList.contains('open');
    nav.inert = !open;
    menu.setAttribute('aria-expanded', String(open));
    outside.forEach(element => { element.inert = open; });
    if (open && !wasOpen) document.getElementById('close-nav').focus();
    if (!open && wasOpen) menu.focus();
    wasOpen = open;
  }
  syncMenu();
  new MutationObserver(syncMenu).observe(nav, { attributes: true, attributeFilter: ['class'] });
  nav.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...nav.querySelectorAll('a[href], button, summary')].filter(el => {
      if (!el.getClientRects().length) return false;
      // A closed <details> can still expose layout rects for its hidden links.
      for (let parent = el.parentElement; parent && parent !== nav; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector('summary')?.contains(el)) return false;
      }
      return true;
    });
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const toggle = document.querySelector('[data-preview-target]');
  const preview = document.getElementById('score-preview');
  if (toggle && preview) {
    const frame = preview.querySelector('iframe');
    const closePreview = preview.querySelector('.chant-close-preview');
    toggle.hidden = false;
    function showPreview(open) {
      preview.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Ocultar partitura' : 'Visualizar partitura';
      // Keep native zoom, print and download controls available.
      frame.src = open ? `${toggle.dataset.previewPdf}#page=1&view=FitH` : 'about:blank';
      if (open) {
        preview.focus({ preventScroll: true });
        preview.scrollIntoView({ block: 'start' });
      } else toggle.focus();
    }
    toggle.addEventListener('click', () => showPreview(preview.hidden));
    closePreview.addEventListener('click', () => showPreview(false));
    preview.addEventListener('keydown', event => { if (event.key === 'Escape') showPreview(false); });
    const fullscreen = preview.querySelector('.chant-fullscreen-preview');
    if (fullscreen && document.fullscreenEnabled) {
      fullscreen.hidden = false;
      fullscreen.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement === preview) await document.exitFullscreen();
          else await preview.requestFullscreen();
        } catch (_) {
          // O PDF continua disponível na prévia e no link para abrir em nova aba.
          fullscreen.hidden = true;
        }
      });
      document.addEventListener('fullscreenchange', () => {
        const expanded = document.fullscreenElement === preview;
        fullscreen.textContent = expanded ? 'Sair da tela cheia' : 'Tela cheia';
        fullscreen.setAttribute('aria-pressed', String(expanded));
      });
    }
  }

  // O vídeo e a partitura são independentes; um recurso pode ainda estar pendente.
  const media = document.querySelector('.chant-media');
  if (media && !media.dataset.videoId && !media.querySelector('.chant-pending')) {
    const notice = document.createElement('div');
    notice.className = 'chant-pending';
    const heading = document.createElement('h2');
    heading.id = 'video-title';
    heading.textContent = 'Vídeo em breve';
    const message = document.createElement('p');
    message.textContent = 'No tempo certo, o vídeo será publicado aqui.';
    notice.append(heading, message);
    media.replaceChildren(notice);
  }
  const cover = document.getElementById('video-cover');
  const player = document.getElementById('video-player');
  const play = media?.querySelector('.chant-play');
  const closePlayer = media?.querySelector('.chant-hide-player');
  if (play && closePlayer && cover && player && media.dataset.videoId) {
    play.hidden = false;
    play.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = media.dataset.videoSrc || `https://www.youtube.com/embed/${media.dataset.videoId}`;
      iframe.title = media.dataset.videoTitle;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      player.replaceChildren(iframe);
      cover.hidden = true;
      player.hidden = false;
      closePlayer.hidden = false;
      play.setAttribute('aria-expanded', 'true');
      iframe.focus();
    });
    closePlayer.addEventListener('click', () => {
      player.replaceChildren();
      player.hidden = true;
      cover.hidden = false;
      closePlayer.hidden = true;
      play.setAttribute('aria-expanded', 'false');
      play.focus();
    });
  }

  // Reveal each section once; never hide content while waiting for the observer.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...document.querySelectorAll('.chant-download, .score-details, .chant-bridge, .section-intro, .doctrine-block, .article-sources, .suggestions-column')];
  const revealed = new WeakSet();
  let revealObserver;
  function configureMotion() {
    revealObserver?.disconnect();
    if (reducedMotion.matches) {
      sections.forEach(section => section.classList.remove('chant-enter'));
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const section = entry.target;
        revealed.add(section);
        revealObserver.unobserve(section);
        if (section.contains(document.activeElement)) return;
        section.classList.add('chant-enter');
        section.addEventListener('animationend', () => section.classList.remove('chant-enter'), { once: true });
      });
    }, { threshold: .06, rootMargin: '0px 0px -16px 0px' });
    sections.forEach(section => { if (!revealed.has(section)) revealObserver.observe(section); });
  }
  configureMotion();
  reducedMotion.addEventListener('change', configureMotion);
})();
