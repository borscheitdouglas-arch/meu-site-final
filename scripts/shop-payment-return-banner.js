/* Pop-up de agradecimento na própria loja, após retorno validado no servidor.
   Nunca altera o status dos pagamentos, pedidos ou preços. */
(() => {
  'use strict';
  const CONFIRMED_FLAG='douglasCheckoutConfirmedReturn_v1';
  function takeConfirmedReturn() {
    let confirmed=false;
    try {
      confirmed=sessionStorage.getItem(CONFIRMED_FLAG)==='1';
      sessionStorage.removeItem(CONFIRMED_FLAG);
    }catch{}
    return confirmed;
  }
  function init() {
    if(!takeConfirmedReturn())return;
    const dialog=document.getElementById('shop-payment-confirmation');
    if(!dialog || typeof dialog.showModal!=='function')return;
    const dismiss=()=>{if(dialog.open)dialog.close();};
    dialog.querySelector('[data-shop-payment-close]')?.addEventListener('click',dismiss);
    const continueButton=dialog.querySelector('[data-shop-payment-continue]');
    continueButton?.addEventListener('click',dismiss);
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||
         event.clientY<rect.top||event.clientY>rect.bottom) dismiss();
    });
    dialog.showModal();
    continueButton?.focus({preventScroll:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();