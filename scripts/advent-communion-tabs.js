/* Abas acessíveis da Comunhão do 2º Domingo do Advento. */
(() => {
  'use strict';
  const root = document.querySelector('[data-chant-tabs]');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  if (panels.some(panel => !panel)) return;

  function activate(index, focus = false) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    });
    if (focus) tabs[index].focus();
  }
  function selectFromHash() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const destinations = ['partitura', 'preparacao-do-canto', 'sobre-o-canto'];
    const direct = panels.findIndex(panel => panel.id === hash);
    const index = direct >= 0 ? direct : destinations.indexOf(hash);
    if (index >= 0) activate(index);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i));
    tab.addEventListener('keydown', event => {
      let next = i;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(next, true);
    });
  });
  selectFromHash();
  window.addEventListener('hashchange', selectFromHash);
})();
