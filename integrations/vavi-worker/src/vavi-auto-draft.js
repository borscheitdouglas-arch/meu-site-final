import {CatalogError} from './catalog.js';
import {decryptDelivery} from './delivery-repository.js';
import {buildVaviIntegrationOrder} from './vavi-order-contract.js';
import {createVaviDraft} from './vavi-draft-client.js';

const ID=/^ord_[a-f0-9]{32}$/;
const LIMIT=3;

/**
 * Automação somente de RASCUNHOS, nunca aprovação/pagamento de produção.
 * VAVI_AUTO_DRAFT_ENABLED permanece ausente/false até validação comercial.
 * Requisições ambíguas ficam para revisão; o sistema NUNCA repete uma
 * tentativa cuja conclusão remota não pôde ser verificada.
 */
export function vaviAutoDraftReady(env) {
  return env?.VAVI_AUTO_DRAFT_ENABLED==='true' &&
    env?.LIVE_WEBHOOK_ENABLED==='true' &&
    env?.LIVE_PRODUCT_APPROVED==='true' &&
    env?.LIVE_POLICY_APPROVED==='true' &&
    typeof env?.VAVI_INTEGRATION_API_KEY==='string' &&
    env.VAVI_INTEGRATION_API_KEY.length>=20 &&
    Boolean(env.DB?.prepare && env.DELIVERY_ENCRYPTION_KEY_B64);
}

/** A fila pode ser criada após confirmação persistida do pagamento ou por cron. */
export async function enqueuePaidVaviDraft(env,orderId) {
  if(!vaviAutoDraftReady(env))return {queued:false,reason:'disabled'};
  if(!ID.test(orderId||''))throw new CatalogError('invalid_order_id','Pedido inválido.',400);
  const result=await env.DB.prepare(`INSERT OR IGNORE INTO store_vavi_draft_dispatch(order_id,state)
    SELECT id,'pending' FROM store_orders
    WHERE id=? AND status='paid' AND payment_environment='live'
    AND mp_payment_id IS NOT NULL AND vavi_order_id IS NULL`)
    .bind(orderId).run();
  return {queued:result.meta?.changes===1};
}

/** Cada pedido tem uma única tentativa automática. Sem retry cego após timeout. */
export async function dispatchVaviDraft(env,orderId,sendDraft=createVaviDraft) {
  if(!vaviAutoDraftReady(env))return {sent:false,reason:'disabled'};
  if(!ID.test(orderId||''))throw new CatalogError('invalid_order_id','Pedido inválido.',400);
  const claim=await env.DB.prepare(`UPDATE store_vavi_draft_dispatch
    SET state='sending',attempted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    last_error=NULL
    WHERE order_id=? AND state='pending'
      AND EXISTS (SELECT 1 FROM store_orders
        WHERE id=? AND status='paid' AND payment_environment='live'
          AND mp_payment_id IS NOT NULL AND vavi_order_id IS NULL)`)
    .bind(orderId,orderId).run();
  if(claim.meta?.changes!==1)return {sent:false,reason:'already_claimed'};

  try {
    const order=await env.DB.prepare(`SELECT id,status,subtotal_cents,shipping_cents,
      total_cents,destination_zip,mp_payment_id,payment_environment
      FROM store_orders WHERE id=? LIMIT 1`).bind(orderId).first();
    if(!order || order.status!=='paid' || order.payment_environment!=='live' ||
       !/^\d{1,30}$/.test(order.mp_payment_id||''))
      throw new CatalogError('vavi_unverified_payment','Pagamento não confirmado.',409);

    const [itemsResult,delivery]=await Promise.all([
      env.DB.prepare(`SELECT sku,label,quantity,unit_price_cents
        FROM store_order_items WHERE order_id=? ORDER BY sku`).bind(orderId).all(),
      env.DB.prepare(`SELECT encrypted_payload,iv
        FROM store_order_delivery WHERE order_id=?`).bind(orderId).first()
    ]);
    if(!delivery)throw new CatalogError('delivery_not_found','Dados protegidos indisponíveis.',503);
    const buyer=await decryptDelivery(orderId,delivery,env.DELIVERY_ENCRYPTION_KEY_B64);
    const items=(itemsResult.results||[]).map(x=>({
      name:x.label,sku:x.sku,quantity:x.quantity,unitPriceCents:x.unit_price_cents
    }));
    const payload=buildVaviIntegrationOrder({
      order:{id:order.id,status:order.status,subtotalCents:order.subtotal_cents,
        shippingCents:order.shipping_cents,totalCents:order.total_cents,
        mpPaymentId:order.mp_payment_id,destinationZip:order.destination_zip},
      buyer,items
    });
    const accepted=await sendDraft({
      payload,accessToken:env.VAVI_INTEGRATION_API_KEY,
      approvedPayment:{orderId,status:'paid'}
    });
    const returned=accepted?.response?.data;
    const draftId=returned?.draftId ?? returned?.id;
    if(accepted?.status!=='vavi_draft' ||
       (typeof draftId!=='string' && typeof draftId!=='number') ||
       !String(draftId).trim())
      throw new CatalogError('vavi_draft_unconfirmed','Rascunho sem identificador confirmado.',503);
    const saved=await env.DB.prepare(`UPDATE store_vavi_draft_dispatch
      SET state='submitted',vavi_draft_id=?,
      submitted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),last_error=NULL
      WHERE order_id=? AND state='sending'`).bind(String(draftId),orderId).run();
    if(saved.meta?.changes!==1)
      throw new CatalogError('vavi_draft_persistence_failed','Registro remoto exige conferência.',503);
    return {sent:true,orderId,draftId:String(draftId)};
  } catch(error) {
    // Nunca expor tokens, payloads ou dados pessoais no banco e nos logs.
    try {
      await env.DB.prepare(`UPDATE store_vavi_draft_dispatch
        SET state='needs_review',last_error='remote_result_requires_review'
        WHERE order_id=? AND state='sending'`).bind(orderId).run();
    } catch { /* A linha sending é intencionalmente não-repetível. */ }
    return {sent:false,orderId,reason:'needs_review'};
  }
}

/** Cron identifica pedidos pagos não despachados, mesmo se o webhook cair. */
export async function processPendingPaidVaviDrafts(env,sendDraft=createVaviDraft) {
  if(!vaviAutoDraftReady(env))return {processed:0,reason:'disabled'};
  const candidates=await env.DB.prepare(`SELECT id FROM store_orders
    WHERE status='paid' AND payment_environment='live'
      AND mp_payment_id IS NOT NULL AND vavi_order_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM store_vavi_draft_dispatch
        WHERE order_id=store_orders.id)
    ORDER BY created_at ASC LIMIT ?`).bind(LIMIT).all();
  for(const row of candidates.results||[])await enqueuePaidVaviDraft(env,row.id);
  const pending=await env.DB.prepare(`SELECT q.order_id FROM store_vavi_draft_dispatch q
    JOIN store_orders o ON o.id=q.order_id
    WHERE q.state='pending' AND o.status='paid'
      AND o.payment_environment='live' AND o.mp_payment_id IS NOT NULL
      AND o.vavi_order_id IS NULL
    ORDER BY q.created_at ASC LIMIT ?`).bind(LIMIT).all();
  const results=[];
  for(const row of pending.results||[])results.push(await dispatchVaviDraft(env,row.order_id,sendDraft));
  return {processed:results.length,submitted:results.filter(x=>x.sent).length,
    requiresReview:results.filter(x=>x.reason==='needs_review').length};
}
