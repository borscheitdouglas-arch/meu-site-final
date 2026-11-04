/* Convite único para conhecer a loja: independente da doação de partituras. */
(() => {
  'use strict';
  if(window.DouglasStoreInviteReady)return;
  window.DouglasStoreInviteReady=true;
  const route=location.pathname.toLowerCase();
  if(/^\/(?:admin|editor)\//.test(route) || /^\/pages\/(?:loja|colecao-salve-regina|produto-loja|produtos-personalizados|cart|checkout(?:-[^/]*)?|resultado-pagamento|admin-[^/]*|homologacao-[^/]*|produto(?:-[^/]*)?|condicoes-da-loja|contato|doacao)\.html$/.test(route))return;
  if(typeof HTMLDialogElement==='undefined'||typeof HTMLDialogElement.prototype.showModal!=='function')return;
  const KEY='douglas_shop_invite_seen_v1';
  const seen=()=>{try{if(localStorage.getItem(KEY)==='1')return true;}catch{}
    try{if(sessionStorage.getItem(KEY)==='1')return true;}catch{} return false;};
  const remember=()=>{try{localStorage.setItem(KEY,'1');return;}catch{}
    try{sessionStorage.setItem(KEY,'1');}catch{}};
  if(seen())return;
  function init(){
    if(seen())return;
    let styleReady=false, attempts=0;
    const sheet=document.createElement('link');
    sheet.rel='stylesheet';sheet.href='/styles/shop-invitation.css?v=20261104-v2';
    sheet.onload=()=>{styleReady=true;};
    document.head.appendChild(sheet);
    const check=()=>{
      if(seen())return;
      if(!styleReady||document.visibilityState==='hidden'||document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([hidden])')){
        if(attempts++<30)setTimeout(check,1500);return;
      }
      const dialog=document.createElement('dialog');
      dialog.className='shop-invitation';
      dialog.setAttribute('aria-labelledby','si-title');
      dialog.setAttribute('aria-describedby','si-description');
      dialog.innerHTML=`<div class="si-frame">
        <button type="button" class="si-close" aria-label="Fechar convite da loja">×</button>
        <div class="si-ornament" aria-hidden="true"><span></span><svg width="34" height="42" viewBox="0 0 34 42"><path d="M17 3v36M5 15h24M13 6h8M13 36h8M7 11v8M27 11v8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m17 10 5 5-5 5-5-5Z" fill="currentColor"/></svg><span></span></div>
        <p class="si-eyebrow">DOUGLAS ASSUMPÇÃO · ARTE & TRADIÇÃO</p>
        <h2 id="si-title">Conheça nossa loja</h2>
        <p class="si-lead">A beleza da fé também no seu dia a dia.</p>
        <p id="si-description">Descubra a coleção <em>Salve Regina</em>: camisetas, canecas e ecobags inspiradas na beleza da música sacra.</p>
        <a class="si-primary" href="/pages/loja.html#catalogo">Visitar a loja <span aria-hidden="true">↗</span></a>
        <a class="si-later" href="/pages/loja.html#catalogo" target="_blank" rel="noopener noreferrer" aria-label="Visitar depois: abrir a loja em uma nova aba">Visitar depois</a>
        <p class="si-signature">Música sacra · Arte · Tradição</p></div>`;
      const close=()=>{if(dialog.open)dialog.close();else dialog.remove();};
      dialog.querySelector('.si-close').addEventListener('click',close);
      // Deixar o navegador abrir a nova aba a partir do clique real.
      // Fechar o modal após a ação padrão, sem navegar a página atual.
      dialog.querySelector('.si-later').addEventListener('click',()=>{
        setTimeout(()=>{
          close();
          // O foco é controlado pelo navegador; tentativa não garantida.
          try{window.focus();}catch{}
        },0);
      });
      dialog.addEventListener('close',()=>dialog.remove(),{once:true});
      let outsideDown=false;
      const outside=e=>{const b=dialog.getBoundingClientRect();return e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom;};
      dialog.addEventListener('pointerdown',e=>{outsideDown=e.target===dialog&&outside(e);});
      dialog.addEventListener('click',e=>{if(outsideDown&&e.target===dialog&&outside(e))close();outsideDown=false;});
      document.body.appendChild(dialog);
      try{dialog.showModal();remember();dialog.querySelector('.si-primary').focus({preventScroll:true});}
      catch{dialog.remove();}
    };
    setTimeout(check,12000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();