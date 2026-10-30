import {CatalogError} from './catalog.js';
import {verifyWebhookSignature} from './payment-verification.js';
import {validateConfirmedPayment} from './order-state.js';
import {recordVerifiedPayment} from './payment-repository.js';

const MP_API='https://api.mercadopago.com';
const ID=/^\d{1,30}$/;
const ORDER_ID=/^ord_[0-9a-f]{32}$/;

/**
 * Handle one authentic Mercado Pago payment notification.
 * Never trust buyer-facing callbacks, webhook status, amount or order ID.
 * Fetch payment from MP over authenticated server-to-server connection.
 */
export async function processPaymentWebhook({request,env,fetchImpl=fetch}) {
  if(env.WEBHOOK_PROCESSING_ENABLED!=='true' ||
      !env.MERCADOPAGO_WEBHOOK_SECRET ||
      !env.MERCADOPAGO_TEST_ACCESS_TOKEN || !env.DB) {
    throw new CatalogError('webhook_not_configured','Notificação ainda indisponível.',503);
  }
  const url=new URL(request.url);
  const id=url.searchParams.get('data.id')||url.searchParams.get('id');
  const requestId=request.headers.get('x-request-id');
  if(!ID.test(id||''))throw new CatalogError('invalid_notification','ID inválido.',400);
  await verifyWebhookSignature({
    signature:request.headers.get('x-signature'),
    requestId,dataId:id,secret:env.MERCADOPAGO_WEBHOOK_SECRET
  });
  let response;
  try{
    response=await fetchImpl(`${MP_API}/v1/payments/${id}`,{
      method:'GET',
      headers:{Authorization:`Bearer ${env.MERCADOPAGO_TEST_ACCESS_TOKEN}`,
        Accept:'application/json'},
      signal:AbortSignal.timeout(8000)
    });
  }catch {
    throw new CatalogError('payment_provider_unavailable','Falha ao verificar pagamento.',503);
  }
  if(!response.ok)
    throw new CatalogError('payment_provider_unavailable','Falha ao verificar pagamento.',503);
  let payment;
  try{payment=await response.json()}catch{
    throw new CatalogError('payment_provider_unavailable','Resposta inválida.',503);
  }
  if(String(payment?.id)!==id)
    throw new CatalogError('payment_mismatch','Pagamento incorreto.',409);
  const orderId=payment?.external_reference;
  if(!ORDER_ID.test(orderId||''))
    throw new CatalogError('payment_mismatch','Pedido não reconhecido.',409);
  const order=await env.DB.prepare(
    `SELECT id,status,currency,total_cents,mp_payment_id,mp_preference_id
     FROM store_orders WHERE id=? LIMIT 1`
  ).bind(orderId).first();
  if(!order || !['awaiting_payment','paid'].includes(order.status))
    throw new CatalogError('payment_order_conflict','Pedido não disponível.',409);
  // MP sends events for pending/rejected payments too. Confirm nothing until
  // an independently fetched payment has status approved.
  if(payment.status!=='approved')return {processed:false,status:'not_approved'};
  const verified=validateConfirmedPayment(order,payment);
  const eventId=`mp:payment:${id}`;
  return await recordVerifiedPayment(env.DB,verified,eventId);
}
