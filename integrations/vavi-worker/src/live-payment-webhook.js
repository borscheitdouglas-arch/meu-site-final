import {CatalogError} from './catalog.js';
import {verifyWebhookSignature} from './payment-verification.js';
import {validateConfirmedPayment} from './order-state.js';
import {recordVerifiedPayment} from './payment-repository.js';

const MP_API='https://api.mercadopago.com';
const PAYMENT_ID=/^\d{1,30}$/;
const ORDER_ID=/^ord_[a-f0-9]{32}$/;

/** Webhook PRODUTIVO. Segredos e tokens separados integralmente da homologação. */
export async function processLivePaymentWebhook({request,env,fetchImpl=fetch}) {
  if(env.LIVE_WEBHOOK_ENABLED!=='true' || !env.DB ||
     !env.MERCADOPAGO_LIVE_ACCESS_TOKEN || !env.MERCADOPAGO_LIVE_WEBHOOK_SECRET)
    throw new CatalogError('live_webhook_disabled','Notificação de produção indisponível.',503);
  const url=new URL(request.url);
  const id=url.searchParams.get('data.id')||url.searchParams.get('id');
  if(url.searchParams.get('type')!=='payment' || !PAYMENT_ID.test(id||''))
    throw new CatalogError('invalid_notification','Evento de pagamento inválido.',400);
  await verifyWebhookSignature({
    signature:request.headers.get('x-signature'),
    requestId:request.headers.get('x-request-id'),
    dataId:id,secret:env.MERCADOPAGO_LIVE_WEBHOOK_SECRET
  });
  let response;
  try {
    response=await fetchImpl(MP_API+'/v1/payments/'+id,{
      headers:{Authorization:'Bearer '+env.MERCADOPAGO_LIVE_ACCESS_TOKEN,
        Accept:'application/json'},
      signal:AbortSignal.timeout(8000)
    });
  } catch {
    throw new CatalogError('payment_provider_unavailable','Verificação de produção indisponível.',503);
  }
  if(!response?.ok)
    throw new CatalogError('payment_provider_unavailable','Pagamento não consultado.',503);
  let payment;
  try {payment=await response.json()} catch {
    throw new CatalogError('payment_provider_unavailable','Resposta do pagamento inválida.',503);
  }
  if(String(payment?.id)!==id || payment?.live_mode!==true ||
     !ORDER_ID.test(payment.external_reference||''))
    throw new CatalogError('payment_mismatch','Pagamento não pertence à loja de produção.',409);

  const order=await env.DB.prepare(`SELECT id,status,currency,total_cents,
    mp_payment_id,mp_preference_id,payment_environment
    FROM store_orders WHERE id=? LIMIT 1`).bind(payment.external_reference).first();
  if(!order || order.payment_environment!=='live' ||
     !order.mp_preference_id || order.currency!=='BRL' ||
     !['awaiting_payment','paid'].includes(order.status))
    throw new CatalogError('payment_order_conflict','Pedido de produção não encontrado.',409);
  if(payment.status!=='approved')return {processed:false,status:'not_approved'};
  const verified=validateConfirmedPayment(order,payment);
  return recordVerifiedPayment(env.DB,verified,'mp:live:payment:'+id);
}
