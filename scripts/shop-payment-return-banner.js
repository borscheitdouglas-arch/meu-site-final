/* O checkout retorna à loja, onde esta janela verifica a InfinitePay.
 * Nunca interpreta o retorno do navegador como pagamento aprovado. */
(() => {
 'use strict';
 const KEY='douglasShopPaymentReturn_v2';
 const LEGACY='douglasCheckoutConfirmedReturn_v1';
 const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/infinitepay-confirm';
 const orderPattern=/^ord_[a-f0-9]{32}$/;
 const refPattern=/^[A-Za-z0-9_.:-]{6,120}$/;
 function readReturn() {
   let raw=null, legacy=null;
   try {
     raw=sessionStorage.getItem(KEY);
     sessionStorage.removeItem(KEY);
     legacy=sessionStorage.getItem(LEGACY);
     sessionStorage.removeItem(LEGACY);
   }catch{}
   if(raw) {
     try {
       const value=JSON.parse(raw);
       if(!value || typeof value!=='object' || !Number.isFinite(value.at) ||
          Math.abs(Date.now()-value.at)>10*60*1000) return null;
       if(value.state==='pending')return {state:'pending'};
       if(value.state==='checking' && orderPattern.test(value.order||'') &&
          refPattern.test(value.slug||'') && refPattern.test(value.transaction||'')) return value;
     }catch{}
     return {state:'pending'};
   }
   // Compatibilidade com compras aprovadas pela versão anterior do retorno.
   return legacy==='1'?{state:'legacy-confirmed'}:null;
 }
 function demoRequested() {
   const url=new URL(window.location.href);
   if(url.searchParams.get('visualizar')!=='pos-compra')return false;
   url.searchParams.delete('visualizar');
   window.history.replaceState(window.history.state,'',url.pathname+(url.search||'')+url.hash);
   return true;
 }
 function init() {
   const data=readReturn();
   const preview=demoRequested();
   if(!data&&!preview)return;
   const dialog=document.getElementById('shop-payment-confirmation');
   if(!dialog||typeof dialog.showModal!=='function')return;
   const title=dialog.querySelector('#shop-payment-title');
   const lead=dialog.querySelector('.shop-payment-lead');
   const detail=dialog.querySelector('#shop-payment-description');
   const assurance=dialog.querySelector('.shop-payment-assurance p');
   const icon=dialog.querySelector('.shop-payment-success-icon');
   const close=dialog.querySelector('[data-shop-payment-close]');
   const continueButton=dialog.querySelector('[data-shop-payment-continue]');
   const eyebrow=dialog.querySelector('.shop-payment-eyebrow');
   if(!title||!lead||!detail||!assurance||!icon||!continueButton)return;
   let activeController=null;
   const dismiss=()=>{
     if(activeController)activeController.abort();
     if(dialog.open)dialog.close();
   };
   close?.addEventListener('click',dismiss);
   continueButton.addEventListener('click',dismiss);
   dialog.addEventListener('click',event=>{
     if(event.target!==dialog)return;
     const rect=dialog.getBoundingClientRect();
     if(event.clientX<rect.left||event.clientX>rect.right||
        event.clientY<rect.top||event.clientY>rect.bottom) dismiss();
   });
   dialog.addEventListener('close',()=>activeController?.abort());
   function view(state) {
     dialog.dataset.paymentState=state;
     if(state==='confirmed'){
       title.textContent='Pagamento confirmado!';
       lead.textContent='Muito obrigado pela sua compra.';
       detail.textContent='A InfinitePay confirmou o pagamento e seu pedido foi registrado com sucesso pela loja.';
       assurance.textContent='Seu pedido seguirá para as próximas etapas de preparação. Guarde o comprovante da transação.';
       icon.textContent='✓';
     }else if(state==='preview'){
       eyebrow.textContent='PRÉVIA VISUAL · NENHUM PAGAMENTO REAL';
       title.textContent='Confirmação de compra';
       lead.textContent='Veja como ficará a mensagem ao cliente.';
       detail.textContent='Esta é apenas uma demonstração do novo visual sobre a loja. Nenhum pagamento foi verificado ou confirmado.';
       assurance.textContent='Após uma compra aprovada pela InfinitePay, esta janela exibirá a confirmação real ao cliente.';
       icon.textContent='✦';
     }else if(state==='checking'){
       title.textContent='Conferindo seu pagamento';
       lead.textContent='Estamos verificando a transação com segurança.';
       detail.textContent='Aguarde a resposta oficial da InfinitePay. Esta página não significa que o pagamento já foi aprovado.';
       assurance.textContent='Não tente pagar novamente enquanto a confirmação estiver em andamento.';
       icon.textContent='…';
     }else{
       title.textContent='Pagamento em verificação';
       lead.textContent='Ainda não recebemos a confirmação da compra.';
       detail.textContent='Isso não significa que o pagamento falhou. Você pode continuar navegando na loja enquanto a transação é verificada.';
       assurance.textContent='Antes de repetir o pagamento, confira seu comprovante na InfinitePay ou entre em contato com a loja.';
       icon.textContent='!';
     }
   }
   view(preview?'preview':data?.state==='legacy-confirmed'?'confirmed':data?.state==='checking'?'checking':'pending');
   dialog.showModal();
   continueButton.focus({preventScroll:true});
   if(!data||data.state!=='checking'||preview)return;
   activeController=new AbortController();
   const controller=activeController;
   const timeout=setTimeout(()=>controller.abort(),12000);
   fetch(API,{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({order_nsu:data.order,invoice_slug:data.slug,transaction_nsu:data.transaction}),
     signal:controller.signal
   }).then(async response=>{
     let answer;
     try{answer=await response.json();}catch{throw Error('invalid_response');}
     if(!response.ok||answer?.processed!==true||answer?.orderId!==data.order)
       throw Error('not_confirmed');
     if(dialog.open)view('confirmed');
   }).catch(()=>{
     if(dialog.open)view('pending');
   }).finally(()=>{
     clearTimeout(timeout);
     if(activeController===controller)activeController=null;
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();