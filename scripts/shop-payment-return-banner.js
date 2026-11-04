/* Mensagem local após confirmação verificada no retorno da InfinitePay.
   Não consulta nem modifica pedidos ou pagamentos. */
(() => {
  'use strict';
  function init() {
    const key='douglasCheckoutConfirmedReturn_v1';
    let verified=false;
    try {verified=sessionStorage.getItem(key)==='1';sessionStorage.removeItem(key);}catch {}
    if(!verified)return;
    const main=document.querySelector('main');
    if(!main)return;
    const banner=document.createElement('div');
    banner.className='shop-return-confirmation';
    banner.setAttribute('role','status');
    const text=document.createElement('span');
    text.textContent='✓  Pagamento confirmado. Obrigado por comprar na Douglas Assumpção!';
    const close=document.createElement('button');
    close.type='button';close.setAttribute('aria-label','Fechar aviso');
    close.textContent='×';close.addEventListener('click',()=>banner.remove());
    banner.append(text,close);
    main.prepend(banner);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
