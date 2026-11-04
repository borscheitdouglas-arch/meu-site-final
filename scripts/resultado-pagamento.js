/* O retorno do navegador não prova pagamento: somente o Worker confirma a InfinitePay. */
(() => {
  'use strict';
  const page=document.querySelector('.payment-return-panel');
  const title=document.getElementById('result-title');
  const message=document.getElementById('result-message');
  const note=document.getElementById('result-security-note');
  const status=document.getElementById('result-status');
  const symbol=document.getElementById('result-symbol');
  const redirect=document.getElementById('result-redirect');
  const seconds=document.getElementById('result-seconds');
  const caution=document.getElementById('result-payment-caution');
  if(!page||!title||!message||!status||!redirect||!seconds||!note)return;
  const SHOP_URL='/pages/loja.html#catalogo';
  const CONFIRMED_FLAG='douglasCheckoutConfirmedReturn_v1';
  const qs=new URLSearchParams(window.location.search);
  const order=qs.get('order_nsu');
  const slug=qs.get('slug');
  const transaction=qs.get('transaction_nsu');
  const matchOrder=/^ord_[a-f0-9]{32}$/;
  const matchRef=/^[A-Za-z0-9_.:-]{6,120}$/;
  let redirectTimer=null;
  const setState=(state,label,heading,body)=>{
    page.dataset.state=state;
    status.textContent=label;
    title.textContent=heading;
    message.textContent=body;
    symbol.textContent=state==='confirmed'?'✓':state==='pending'?'!':'…';
  };
  function pending(text) {
    if(redirectTimer!==null)clearInterval(redirectTimer);
    redirect.hidden=true;
    note.hidden=false;
    caution.hidden=false;
    setState('pending','Aguardando confirmação','Pagamento em verificação',text);
  }
  if(!matchOrder.test(order||'')||!matchRef.test(slug||'')||
     !matchRef.test(transaction||'')) {
    pending('O retorno ainda não contém todos os dados para confirmar a compra. Você pode voltar à loja, mas confira o comprovante antes de tentar pagar novamente.');
    return;
  }
  setState('checking','Verificando com segurança','Estamos conferindo seu pagamento','Consultando a InfinitePay para verificar a aprovação do pedido.');
  const controller=new AbortController();
  const limit=setTimeout(()=>controller.abort(),12000);
  fetch('https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/infinitepay-confirm',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({order_nsu:order,invoice_slug:slug,transaction_nsu:transaction}),
    signal:controller.signal
  }).then(async response=>{
    let data;
    try {data=await response.json();}catch {throw Error('response_invalid');}
    if(!response.ok||data?.processed!==true||data?.orderId!==order)
      throw Error('unconfirmed');
    setState('confirmed','Pagamento confirmado','Obrigado pela sua compra!',
      'Seu pagamento foi confirmado pela InfinitePay e o pedido foi registrado pela loja. Guarde o comprovante para referência.');
    note.hidden=true;
    caution.hidden=true;
    // O retorno só chega à loja com a mensagem de sucesso após a aprovação
    // confirmada pelo Worker; nenhuma informação da URL libera este fluxo.
    let modalReady=false;
    try {
      sessionStorage.setItem(CONFIRMED_FLAG,'1');
      modalReady=true;
    }catch {}
    if(modalReady) {
      window.location.replace(SHOP_URL);
      return;
    }
    // Sem armazenamento de sessão: manter a confirmação nesta página,
    // sem mostrar uma janela não verificada ao voltar à loja.
    redirect.hidden=true;
  }).catch(()=>{
    pending('Ainda não foi possível confirmar a transação pelo servidor. Isso não significa que o pagamento falhou. Confira o comprovante ou fale com a loja antes de pagar novamente.');
  }).finally(()=>clearTimeout(limit));
})();
