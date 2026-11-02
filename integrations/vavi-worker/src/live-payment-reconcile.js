import {CatalogError} from './catalog.js';
import {validateConfirmedPayment} from './order-state.js';
import {recordVerifiedPayment} from './payment-repository.js';

const ID=/^\d{1,30}$/;
const ORDER=/^ord_[a-f0-9]{32}$/;

/** Somente operadores autorizados: confirmar cobrança REAL pelo ID oficial do MP.
 * A rota que chama esta função valida SHOP_ADMIN_API_KEY antes de receber o ID.
 * Nunca aceita status/valor retornado pelo navegador e não cria pedido na VAVI.
 */
export async function reconcileLivePayment(env,paymentId,{fetchImpl=fetch}={}) {
  if(!env?.DB?.prepare || !env.MERCADOPAGO_LIVE_ACCESS_TOKEN)
    throw new CatalogError('live_payment_unavailable','Conciliação indisponível.',503);
  if(typeof paymentId!=='string' || !ID.test(paymentId))
    throw new CatalogError('invalid_payment_id','Número da transação inválido.',422);
  let response;
  try{
    response=await fetchImpl('https://api.mercadopago.com/v1/payments/'+paymentId,{
      headers:{Authorization:'Bearer '+env.MERCADOPAGO_LIVE_ACCESS_TOKEN,Accept:'application/json'},
      signal:AbortSignal.timeout(8000)
    });
  }catch{
    throw new CatalogError('payment_provider_unavailable','Mercado Pago indisponível.',503);
  }
  if(!response?.ok)
    throw new CatalogError('payment_provider_unavailable','Transação não localizada pelo Mercado Pago.',503);
  let payment;
  try{payment=await response.json()}catch{
    throw new CatalogError('payment_provider_unavailable','Resposta de pagamento inválida.',503);
  }
  if(String(payment?.id)!==paymentId || payment.live_mode!==true ||
    !ORDER.test(payment.external_reference||''))
    throw new CatalogError('payment_mismatch','Transação não é de produção desta loja.',409);
  if(payment.status!=='approved')
    throw new CatalogError('payment_not_approved','O Mercado Pago ainda não confirmou a aprovação.',409);
  const order=await env.DB.prepare(`SELECT id,status,currency,total_cents,
    mp_payment_id,mp_preference_id,payment_environment FROM store_orders WHERE id=? LIMIT 1`)
    .bind(payment.external_reference).first();
  if(!order || order.payment_environment!=='live' ||
    !order.mp_preference_id || order.currency!=='BRL' ||
    !['awaiting_payment','paid'].includes(order.status))
    throw new CatalogError('payment_order_conflict','Pedido de produção não encontrado.',409);
  const verified=validateConfirmedPayment(order,payment);
  const recorded=await recordVerifiedPayment(env.DB,verified,'mp:live:payment:'+paymentId);
  return {ok:true,processed:true,orderId:recorded.orderId,
    status:recorded.status,alreadyPaid:recorded.alreadyPaid,
    vaviOrderCreated:false};
}
