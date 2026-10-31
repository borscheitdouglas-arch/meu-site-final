import {CatalogError} from './catalog.js';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TYPES=new Set([
  'integration_order.converted','integration_order.failed',
  'order.status_changed','order.tracking'
]);

export function vaviWebhookReady(env) {
  return Boolean(env?.VAVI_WEBHOOK_ENABLED==='true' &&
    typeof env?.VAVI_WEBHOOK_SECRET==='string' &&
    env.VAVI_WEBHOOK_SECRET.startsWith('whsec_') &&
    env.DB?.batch && env.DB?.prepare);
}

/** Validate HMAC-SHA256 over exact bytes: `timestamp.rawBody`. */
export async function verifyVaviWebhook({request,raw,secret,now=Date.now()}) {
  const signature=request.headers.get('X-Webhook-Signature')||'';
  const match=/^t=(\d{9,12}),v1=([a-f0-9]{64})$/.exec(signature);
  if(!match || !/^whsec_[A-Za-z0-9_-]{8,}$/.test(secret||''))
    throw new CatalogError('vavi_webhook_unauthorized','Assinatura inválida.',401);
  const timestamp=Number(match[1]);
  if(!Number.isSafeInteger(timestamp) ||
      Math.abs(now-timestamp*1000)>5*60*1000)
    throw new CatalogError('vavi_webhook_expired','Notificação expirada.',401);
  const key=await crypto.subtle.importKey('raw',
    new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode(match[1]+'.'+raw)));
  const expected=Uint8Array.from(match[2].match(/../g),x=>parseInt(x,16));
  let diff=0;
  for(let i=0;i<32;i++)diff|=digest[i]^expected[i];
  if(diff!==0)
    throw new CatalogError('vavi_webhook_unauthorized','Assinatura inválida.',401);
}

function sanitizedText(v,max=150) {
  return typeof v==='string' && v.length<=max?v:null;
}

export async function processVaviWebhook({request,env,now=Date.now()}) {
  if(!vaviWebhookReady(env))
    throw new CatalogError('vavi_webhook_disabled','Webhook indisponível.',503);
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
    throw new CatalogError('invalid_vavi_webhook','Tipo de conteúdo inválido.',415);
  const raw=await request.text();
  if(raw.length>65536)
    throw new CatalogError('vavi_webhook_too_large','Notificação excede limite.',413);
  await verifyVaviWebhook({request,raw,secret:env.VAVI_WEBHOOK_SECRET,now});
  let message;
  try{message=JSON.parse(raw)}catch{
    throw new CatalogError('invalid_vavi_webhook','JSON inválido.',400);
  }
  // VAVI Ping envia test=true e deve ser 2xx sem alterar dados reais.
  if(message?.test===true)return {ok:true,ignored:'ping'};
  const id=message?.webhookSentId;
  if(!UUID.test(id||'') ||
     request.headers.get('X-Webhook-Id')!==id ||
     request.headers.get('X-Webhook-Event')!==message.eventType ||
     message.payloadVersion!==1 ||
     !TYPES.has(message.eventType) ||
     !Number.isFinite(Date.parse(message.occurredAt||'')) ||
     !message.data || typeof message.data!=='object')
    throw new CatalogError('invalid_vavi_webhook','Evento incompatível.',400);

  const type=message.eventType;
  const data=message.data;
  const vaviOrderId=data.orderId;
  const draftId=data.draftId;
  if(type.startsWith('integration_order.')){
    if(!UUID.test(draftId||'') ||
       (type==='integration_order.converted' && !UUID.test(vaviOrderId||'')))
      throw new CatalogError('invalid_vavi_webhook','Rascunho inválido.',400);
  } else if(!UUID.test(vaviOrderId||'')){
    throw new CatalogError('invalid_vavi_webhook','Pedido inválido.',400);
  }
  const event=env.DB.prepare(`INSERT OR IGNORE INTO store_vavi_webhook_events
    (webhook_sent_id,event_type,vavi_order_id,draft_id)
    VALUES (?,?,?,?)`).bind(id,type,
      UUID.test(vaviOrderId||'')?vaviOrderId:null,
      UUID.test(draftId||'')?draftId:null);

  const statements=[event];
  if(type==='integration_order.converted'){
    // Only link conversion if this exact draft was previously submitted by us.
    statements.push(env.DB.prepare(`UPDATE store_orders
      SET vavi_order_id=?,status='vavi_draft',
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id IN (SELECT order_id FROM store_vavi_draft_dispatch
        WHERE vavi_draft_id=? AND state='submitted')
      AND payment_environment='live' AND status='paid'
      AND vavi_order_id IS NULL`).bind(vaviOrderId,draftId));
  } else if(type==='integration_order.failed'){
    statements.push(env.DB.prepare(`UPDATE store_vavi_draft_dispatch
      SET state='needs_review',last_error='vavi_reported_failed'
      WHERE vavi_draft_id=? AND state='submitted'`).bind(draftId));
  } else {
    const details=type==='order.tracking'?data.tracking||{}:{};
    const status=sanitizedText(data.newStatus||data.status,50);
    const nsu=sanitizedText(data.orderNSU,40);
    const code=sanitizedText(details.trackingCode,120);
    const url=sanitizedText(details.trackingUrl,400);
    // Reject unsafe links rather than store untrusted arbitrary URLs.
    const safeUrl=url && /^https:\/\//i.test(url)?url:null;
    const carrier=sanitizedText(details.carrierName,120);
    const shipment=sanitizedText(details.shipmentStatus,60);
    const occurred=message.occurredAt;
    // Tracking never changes payment state or creates an order.
    statements.push(env.DB.prepare(`INSERT INTO store_vavi_order_tracking
      (vavi_order_id,order_status,order_nsu,tracking_code,tracking_url,
       carrier_name,shipment_status,last_event_at)
      SELECT ?,?,?,?,?,?,?,? WHERE EXISTS
        (SELECT 1 FROM store_orders
          WHERE vavi_order_id=? AND payment_environment='live')
      ON CONFLICT(vavi_order_id) DO UPDATE SET
        order_status=excluded.order_status,
        order_nsu=COALESCE(excluded.order_nsu,order_nsu),
        tracking_code=COALESCE(excluded.tracking_code,tracking_code),
        tracking_url=COALESCE(excluded.tracking_url,tracking_url),
        carrier_name=COALESCE(excluded.carrier_name,carrier_name),
        shipment_status=COALESCE(excluded.shipment_status,shipment_status),
        last_event_at=excluded.last_event_at
      WHERE excluded.last_event_at>=store_vavi_order_tracking.last_event_at`)
      .bind(vaviOrderId,status,nsu,code,safeUrl,carrier,shipment,occurred,vaviOrderId));
  }
  // D1 batch is transactional. Every retry has the same event ID.
  await env.DB.batch(statements);
  return {ok:true,received:true};
}
