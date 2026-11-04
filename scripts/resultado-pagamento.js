/* Retorno do navegador nunca prova pagamento. O Worker consulta a InfinitePay. */
(() => {
  'use strict';
  const title=document.getElementById('result-title');
  const message=document.getElementById('result-message');
  if(!title||!message)return;
  const qs=new URLSearchParams(window.location.search);
  const order=qs.get('order_nsu');
  const slug=qs.get('slug');
  const transaction=qs.get('transaction_nsu');
  const matchOrder=/^ord_[a-f0-9]{32}$/;
  const matchRef=/^[A-Za-z0-9_.:-]{6,120}$/;
  if(!matchOrder.test(order||'')||!matchRef.test(slug||'')||
     !matchRef.test(transaction||'')){
    title.textContent='Acompanhamento do pagamento';
    message.textContent='O retorno ainda não confirma a aprovação. Aguarde a confirmação segura do pedido pela loja. Antes de tentar pagar de novo, consulte suas vendas ou fale com a loja.';
    return;
  }
  title.textContent='Verificando seu pagamento';
  message.textContent='Consultando a InfinitePay. O resultado será confirmado pelo servidor da loja.';
  fetch('https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/infinitepay-confirm',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({order_nsu:order,invoice_slug:slug,transaction_nsu:transaction})
  }).then(async response=>{
    const data=await response.json();
    if(!response.ok||data.processed!==true)throw Error('unconfirmed');
    title.textContent='Pagamento confirmado';
    message.textContent='A InfinitePay confirmou o pagamento e o pedido foi registrado pela loja. Guarde o comprovante e acompanhe as informações enviadas ao seu contato.';
  }).catch(()=>{
    title.textContent='Pagamento em verificação';
    message.textContent='Ainda não foi possível confirmar a transação pelo servidor. Isso não significa que o pagamento falhou. Não pague novamente antes de conferir o comprovante ou entrar em contato com a loja.';
  });
})();