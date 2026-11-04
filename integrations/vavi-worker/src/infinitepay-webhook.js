import {CatalogError} from './catalog.js';
import {enqueuePaidVaviDraft} from './vavi-auto-draft.js';

const API='https://api.checkout.infinitepay.io/payment_check';
const ORDER_ID=/^ord_[a-f0-9]{32}$/;
const NSU=/^[A-Za-z0-9_.:-]{6,120}$/;

export async function processInfinitePayWebhook({
  request,env,fetchImpl=fetch,queueDraft=enqueuePaidVaviDraft
}) {
  if(!env?.DB || !env.INFINITEPAY_API_KEY || !env.INFINITEPAY_HANDLE ||
     env.INFINITEPAY_CHECKOUT_ENABLED!=='true')
    throw new CatalogError('infinitepay_disabled','Integração indisponível.',503);
  let text;
  try{text=await request.text()}catch{
    throw new CatalogError('invalid_notification','Notificação inválida.',400);
  }
  if(text.length>12000)throw new CatalogError('invalid_notification','Notificação inválida.',400);
  let body;
  try{body=JSON.parse(text)}catch{
    throw new CatalogError('invalid_notification','Notificação inválida.',400);
  }
  // Eventos sem pagamento confirmado não modificam o status do pedido.
  const event=String(body?.event||body?.eventType||body?.type||'').toLowerCase();
  if(event && !['paid','payment.paid','payment_approved'].includes(event))
    return {processed:false,status:'ignored'};
  const info=body?.data&&typeof body.data==='object'?body.data:body;
  const orderId=info?.order_nsu;
  const slug=info?.invoice_slug||info?.slug;
  const transaction=info?.transaction_nsu;
  if(!ORDER_ID.test(orderId||'') || !NSU.test(slug||'') ||
     !NSU.test(transaction||''))
    throw new CatalogError('invalid_notification','Identificadores inválidos.',400);

  const order=await env.DB.prepare(
    "SELECT o.id,o.status,o.currency,o.total_cents,o.payment_environment,l.order_id AS ip_order_id "+
    "FROM store_orders o JOIN store_infinitepay_links l ON l.order_id=o.id "+
    "WHERE o.id=? LIMIT 1"
  ).bind(orderId).first();
  if(!order || order.payment_environment!=='live' ||
      order.currency!=='BRL' || order.ip_order_id!==orderId ||
      !['awaiting_payment','paid'].includes(order.status))
    throw new CatalogError('payment_order_conflict','Pedido não localizado.',409);

  // O webhook não é assinado: só a verificação autenticada junto à InfinitePay
  // permite marcar o pedido como pago.
  let answer;
  try{
    answer=await fetchImpl(API,{
      method:'POST',
      headers:{'X-Api-Key':env.INFINITEPAY_API_KEY,
        'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({handle:env.INFINITEPAY_HANDLE,order_nsu:orderId,
        transaction_nsu:transaction,slug}),
      signal:AbortSignal.timeout(10000)
    });
  }catch{throw new CatalogError('payment_provider_unavailable','Confirmação indisponível.',503);}
  if(!answer?.ok)throw new CatalogError('payment_provider_unavailable','Confirmação indisponível.',503);
  let checked;
  try{checked=await answer.json()}catch{
    throw new CatalogError('payment_provider_unavailable','Resposta inválida.',503);
  }
  if(checked?.success!==true||checked.paid!==true)
    return {processed:false,status:'not_approved'};
  const amount=checked.amount,paidAmount=checked.paid_amount;
  if(!Number.isSafeInteger(amount)||amount!==order.total_cents||
     !Number.isSafeInteger(paidAmount)||paidAmount<amount||
     !Number.isInteger(checked.installments)||checked.installments<1||
     checked.installments>12||!['pix','credit_card'].includes(checked.capture_method))
    throw new CatalogError('payment_mismatch','Pagamento divergente.',409);
  let result;
  try{
    result=await env.DB.batch([
      env.DB.prepare(
        "INSERT OR IGNORE INTO store_infinitepay_payments "+
        "(transaction_nsu,order_id,invoice_slug,amount_cents,paid_amount_cents,capture_method,installments) "+
        "SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM store_orders "+
        "WHERE id=? AND status IN ('awaiting_payment','paid'))"
      ).bind(transaction,orderId,slug,amount,paidAmount,checked.capture_method,
        checked.installments,orderId),
      env.DB.prepare(
        "UPDATE store_orders SET status='paid', "+
        "updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') "+
        "WHERE id=? AND status='awaiting_payment' AND EXISTS "+
        "(SELECT 1 FROM store_infinitepay_payments WHERE order_id=? AND transaction_nsu=?)"
      ).bind(orderId,orderId,transaction),
      env.DB.prepare(
        "INSERT OR IGNORE INTO store_payment_events "+
        "(provider_event_id,order_id,provider_payment_id,event_kind) "+
        "SELECT ?,id,?,'payment.approved' FROM store_orders "+
        "WHERE id=? AND status='paid' AND EXISTS "+
        "(SELECT 1 FROM store_infinitepay_payments WHERE order_id=id AND transaction_nsu=?)"
      ).bind('ip:paid:'+transaction,transaction,orderId,transaction),
      env.DB.prepare(
        "SELECT o.status,p.transaction_nsu FROM store_orders o "+
        "LEFT JOIN store_infinitepay_payments p ON p.order_id=o.id WHERE o.id=?"
      ).bind(orderId)
    ]);
  }catch{
    throw new CatalogError('payment_write_failed','Não foi possível registrar o pagamento.',503);
  }
  const row=result?.[3]?.results?.[0];
  if(row?.status!=='paid'||row.transaction_nsu!==transaction)
    throw new CatalogError('payment_order_conflict','Pagamento não corresponde ao pedido.',409);
  const queued=await queueDraft(env,orderId);
  return {processed:true,orderId,alreadyPaid:(result?.[1]?.meta?.changes||0)===0,
    vaviQueued:queued?.queued===true};
}
