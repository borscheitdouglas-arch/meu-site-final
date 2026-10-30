import {CatalogError} from './catalog.js';
import {verifyWebhookSignature} from './payment-verification.js';
import {validateOrdersPaymentStatus} from './mp-orders-sandbox.js';

const ORD=/^ORDTST[A-Z0-9]{12,50}$/;
const MP_API='https://api.mercadopago.com';

export async function saveOrdersLink(db, providerOrderId, orderId) {
  if(!ORD.test(providerOrderId||'') || !/^ord_[a-f0-9]{32}$/.test(orderId||'')) {
    throw new CatalogError('orders_invalid_link','Vínculo inválido.',409);
  }
  // Cannot link arbitrary or already-settled records.
  const r=await db.prepare(`INSERT INTO store_mp_order_links
    (provider_order_id,order_id)
    SELECT ?,id FROM store_orders
    WHERE id=? AND status='awaiting_payment' AND mp_payment_id IS NULL`)
    .bind(providerOrderId,orderId).run();
  if(r?.meta?.changes!==1)
    throw new CatalogError('orders_link_conflict','Vínculo não criado.',409);
  return {saved:true};
}

/** Orders notifications have non-numeric resource IDs, unlike legacy payment
 * events. Verify HMAC first; then fetch the exact provider order ourselves.
 * Ignore body assertions about status or amount.
 */
export async function processOrdersWebhook({request,env,fetchImpl=fetch}) {
  if(env.MP_ORDERS_WEBHOOK_ENABLED!=='true' ||
     !env.MERCADOPAGO_WEBHOOK_SECRET ||
     !env.MERCADOPAGO_TEST_ACCESS_TOKEN ||
     !env.DB) {
    throw new CatalogError('orders_webhook_disabled','Notificação Orders não habilitada.',503);
  }
  const url=new URL(request.url);
  const providerOrderId=url.searchParams.get('data.id');
  if(url.searchParams.get('type')!=='order' || !ORD.test(providerOrderId||'')) {
    throw new CatalogError('orders_invalid_notification','Notificação Order inválida.',400);
  }
  await verifyWebhookSignature({
    signature:request.headers.get('x-signature'),
    requestId:request.headers.get('x-request-id'),
    dataId:providerOrderId,secret:env.MERCADOPAGO_WEBHOOK_SECRET
  });
  const link=await env.DB.prepare(`SELECT l.provider_order_id,l.order_id,
      o.status,o.total_cents,o.currency
      FROM store_mp_order_links l JOIN store_orders o ON o.id=l.order_id
      WHERE l.provider_order_id=? LIMIT 1`).bind(providerOrderId).first();
  if(!link || !['awaiting_payment','paid'].includes(link.status) ||
     link.currency!=='BRL') {
    throw new CatalogError('orders_unknown_order','Pedido não encontrado.',409);
  }
  let res;
  try{
    res=await fetchImpl(MP_API+'/v1/orders/'+providerOrderId,{
      method:'GET',
      headers:{Authorization:'Bearer '+env.MERCADOPAGO_TEST_ACCESS_TOKEN,
        Accept:'application/json'},
      signal:AbortSignal.timeout(8000)
    });
  }catch{
    throw new CatalogError('orders_provider_unavailable','Não foi possível consultar Order.',503);
  }
  if(!res?.ok)throw new CatalogError('orders_provider_unavailable','Order indisponível.',503);
  let provider;
  try{provider=await res.json()}catch{
    throw new CatalogError('orders_provider_unavailable','Resposta inválida.',503);
  }
  // A created/pending order must not be treated as paid, even if notification
  // says "order.processed". The GET result is our sole source of truth.
  if(provider?.status!=='processed' || provider?.status_detail!=='accredited') {
    return {processed:false,status:'not_approved'};
  }
  validateOrdersPaymentStatus(provider,{id:link.order_id,total_cents:link.total_cents},
    providerOrderId);
  let results;
  try{
    results=await env.DB.batch([
      env.DB.prepare(`UPDATE store_orders SET status='paid',
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND status='awaiting_payment'
        AND EXISTS (SELECT 1 FROM store_mp_order_links
          WHERE provider_order_id=? AND order_id=?)`)
        .bind(link.order_id,providerOrderId,link.order_id),
      env.DB.prepare(`INSERT OR IGNORE INTO store_payment_events
        (provider_event_id,order_id,provider_payment_id,event_kind)
        SELECT ?,id,NULL,'order.processed'
        FROM store_orders WHERE id=? AND status='paid'`)
        .bind('mp:order:'+providerOrderId,link.order_id),
      env.DB.prepare(`SELECT id,status FROM store_orders WHERE id=?`)
        .bind(link.order_id)
    ]);
  }catch{
    throw new CatalogError('orders_persistence_failed','Não foi possível registrar aprovação.',503);
  }
  if(results?.[2]?.results?.[0]?.status!=='paid') {
    throw new CatalogError('orders_status_conflict','Aprovação não registrada.',409);
  }
  return {processed:true,status:'paid',orderId:link.order_id,
    alreadyPaid:(results[0]?.meta?.changes||0)===0,
    vaviOrderCreated:false};
}
