// script.js - funções: carrossel, dark-mode e animações simples

document.addEventListener('DOMContentLoaded', async () => {
  // SIDE NAV: garantir que o markup do menu exista em TODAS as páginas
  const menuBtn = document.getElementById('menu-btn');
  let sideNav = document.getElementById('side-nav');
  let navOverlay = document.getElementById('nav-overlay');

  // tornar o logo um link para a página inicial em todas as páginas
  (function ensureLogoLink(){
    const logo = document.querySelector('.logo');
    if(!logo) return;
    // se houver uma âncora já, atualiza href para raiz
    const existingA = logo.querySelector('a');
    if(existingA){ existingA.setAttribute('href', '/index.html'); return; }
    // caso contrário, envolver o img em <a>
    const img = logo.querySelector('img');
    if(img){
      const a = document.createElement('a');
      a.setAttribute('href','/index.html');
      a.setAttribute('aria-label','Ir para início');
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
    }
  })();

  // tenta injetar o #side-nav e #nav-overlay a partir do index.html caso não existam
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
          // inserir o nav no início do body
          document.body.insertAdjacentHTML('afterbegin', srcNav.outerHTML);
          sideNav = document.getElementById('side-nav');
          // normalizar hrefs do menu para caminhos absolutos relativos à raiz
          try{
            const anchors = sideNav.querySelectorAll('a[href]');
            anchors.forEach(a => {
              const href = a.getAttribute('href');
              if(!href) return;
              // não tocar em anchors internos, anchors mailto/tel ou URLs completas
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
          // criar overlay mínimo se não houver um
          document.body.insertAdjacentHTML('beforeend', '<div id="nav-overlay" class="nav-overlay" hidden></div>');
          navOverlay = document.getElementById('nav-overlay');
        }
        break;
      }catch(err){
        // falha no fetch, tenta próxima opção
        continue;
      }
    }
  }

  await ensureSideNav();

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
    // Scroll apenas o container do carrossel (evita rolar a página inteira)
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
