/* Acessibilidade do menu nas páginas de repertório, leitura e apoio. */
(() => {
  'use strict';
  const nav = document.getElementById('side-nav');
  const menu = document.getElementById('menu-btn');
  const outside = [...document.querySelectorAll('.site-header, main, .wrap, .site-footer, .editorial-skip')];
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

})();
