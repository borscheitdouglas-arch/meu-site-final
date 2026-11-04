/* O retorno da InfinitePay redireciona à loja: a confirmação é exibida
 * na janela sobre o catálogo, após a verificação segura pelo Worker. */
(() => {
 'use strict';
 const KEY='douglasShopPaymentReturn_v2';
 const SHOP='/pages/loja.html#catalogo';
 const qs=new URLSearchParams(window.location.search);
 const order=qs.get('order_nsu'),slug=qs.get('slug'),transaction=qs.get('transaction_nsu');
 const correct=/^ord_[a-f0-9]{32}$/.test(order||'') &&
   /^[A-Za-z0-9_.:-]{6,120}$/.test(slug||'') &&
   /^[A-Za-z0-9_.:-]{6,120}$/.test(transaction||'');
 const data=correct
   ? {state:'checking',order,slug,transaction,at:Date.now()}
   : {state:'pending',at:Date.now()};
 try {
   sessionStorage.setItem(KEY,JSON.stringify(data));
   window.location.replace(SHOP);
   return;
 }catch {}
 // Navegadores com armazenamento bloqueado permanecem na tela segura.
 const heading=document.getElementById('result-title');
 const message=document.getElementById('result-message');
 if(heading)heading.textContent='Pagamento em verificação';
 if(message)message.textContent='Não foi possível abrir a verificação na loja neste navegador. Consulte seu comprovante ou entre em contato antes de realizar outro pagamento.';
})();