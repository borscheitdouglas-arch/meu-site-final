/* Carrossel com reprodução automática, toque e controles acessíveis. */
(async () => {
  const root = document.getElementById('recent-content-carousel');
  if (!root) return;
  const track = root.querySelector('.lit-carousel-track');
  const dots = root.querySelector('.lit-carousel-dots');
  try {
    const response = await fetch('content/home-carousel.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Catálogo indisponível');
    const items = await response.json();
    if (!Array.isArray(items) || !items.length || !items.every(item =>
      typeof item.title === 'string' && /^pages\/[\w-]+\.html$/.test(item.url) &&
      typeof item.image === 'string' && item.image.startsWith('/assets/img/'))) throw new Error('Catálogo inválido');
    const cards = items.map(item => {
      const card = document.createElement('article');
      card.className = 'lit-card';
      const img = document.createElement('img');
      img.className = 'home-card-image'; img.src = item.image; img.alt = ''; img.loading = 'lazy';
      const content = document.createElement('div'); content.className = 'lit-card-content';
      for (const [tag, value, className] of [['span',item.category,'lit-eyebrow'],['h3',item.title,''],['p',item.description,'']]) {
        const el = document.createElement(tag); el.textContent = value; el.className = className; content.append(el);
      }
      const actions = document.createElement('div'); actions.className = 'lit-card-actions';
      const link = document.createElement('a'); link.href = item.url; link.className = 'btn'; link.textContent = 'Conhecer o canto';
      actions.append(link); content.append(actions); card.append(img,content); return card;
    });
    track.replaceChildren(...cards);
  } catch (_) {
    // Os destaques escritos no HTML continuam disponíveis se o catálogo falhar.
    track.querySelectorAll('.lit-card').forEach(card => {
      const match = card.style.getPropertyValue('--bg-image').match(/url\(['"]?(.*?)['"]?\)/);
      if (match && !card.querySelector('img')) { const img = document.createElement('img'); img.src = match[1]; img.alt = ''; img.className = 'home-card-image'; card.prepend(img); }
    });
  }
  const cards = [...track.children];
  const controls = document.createElement('div'); controls.className = 'home-carousel-controls';
  const previous = root.querySelector('.prev'), next = root.querySelector('.next');
  const status = document.createElement('span'); status.className = 'home-status'; status.setAttribute('aria-live','polite');
  controls.append(previous,dots,next,status); root.append(controls);
  let index = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function sync() {
    index = Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
    [...dots.children].forEach((dot,i) => { dot.classList.toggle('active',i === index); dot.setAttribute('aria-pressed',String(i === index)); });
    cards.forEach((card,i) => { card.classList.toggle('is-active', i === index); card.querySelectorAll('a').forEach(a => { a.tabIndex = i === index ? 0 : -1; }); });
  }
  function go(i, animate = true, announce = true) {
    const destination = (i + cards.length) % cards.length;
    track.scrollTo({left: destination * track.clientWidth, behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant'});
    if (!animate || reducedMotion.matches) sync();
    if (animate && announce) status.textContent = `${destination+1} de ${cards.length}: ${cards[destination].querySelector('h3').textContent}`;
  }
  dots.replaceChildren(...cards.map((card,i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'lit-dot';
    button.setAttribute('aria-label',`Mostrar ${card.querySelector('h3').textContent}`); button.addEventListener('click',() => go(i)); return button;
  }));
  previous.addEventListener('click',() => go(index-1)); next.addEventListener('click',() => go(index+1));
  track.addEventListener('scroll',sync,{passive:true});
  root.addEventListener('keydown',event => {
    const keys = {ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:cards.length-1};
    if (event.key in keys) { event.preventDefault(); go(keys[event.key]); }
  });
  let hovered = false, visible = false, timer;
  function schedule() {
    clearTimeout(timer);
    const stopped = reducedMotion.matches || hovered || !visible || document.hidden || root.contains(document.activeElement);
    root.classList.toggle('is-playing', !stopped);
    if (!stopped && cards.length > 1) timer = setTimeout(() => {
      go(index + 1, true, false);
      schedule();
    }, 8000);
  }
  root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  root.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => setTimeout(schedule, 0));
  root.addEventListener('click', schedule);
  track.addEventListener('scroll', schedule, {passive:true});
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', schedule);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold: .2}).observe(root);
  new ResizeObserver(() => go(index, false, false)).observe(track);
  sync();
})();
