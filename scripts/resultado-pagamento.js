/* O retorno do navegador não comprova uma transação: nunca exibir 'pago' com base no querystring. */
(() => {
  'use strict';
  const title=document.getElementById('result-title');
  const message=document.getElementById('result-message');
  if(!title||!message)return;
  const payment=new URLSearchParams(window.location.search).get('pagamento');
  const states={
    sucesso:{
      title:'Pagamento enviado para conferência',
      message:'O Mercado Pago informou um retorno de sucesso. Isso ainda não é a confirmação definitiva do pedido: a loja deverá verificar o recebimento no servidor antes de iniciar a produção.'
    },
    pendente:{
      title:'Pagamento em processamento',
      message:'O processamento do pagamento ainda pode estar pendente. Consulte a situação na sua conta do Mercado Pago e não repita a cobrança antes de conferir.'
    },
    falha:{
      title:'Pagamento não concluído',
      message:'O Mercado Pago informou que o pagamento não foi finalizado. Consulte sua conta antes de tentar novamente ou entre em contato com a loja.'
    }
  };
  const state=states[payment]||{
    title:'Acompanhamento do pagamento',
    message:'Acesse o Mercado Pago para verificar a situação da transação. Esta página não recebe nem confirma pagamentos.'
  };
  title.textContent=state.title;
  message.textContent=state.message;
})();
