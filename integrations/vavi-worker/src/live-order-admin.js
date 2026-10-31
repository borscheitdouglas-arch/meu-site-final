import {CatalogError} from './catalog.js';
import {decryptDelivery} from './delivery-repository.js';

/** Cabeçalho Bearer exclusivamente administrativo. Nunca persistir chave no frontend. */
export async function authorizedLiveAdmin(request,env) {
  const expected=env.SHOP_ADMIN_API_KEY;
  const input=request.headers.get('Authorization')||'';
  if(typeof expected!=='string' || expected.length<32 ||
    !input.startsWith('Bearer ') || input.length>512) return false;
  const compare=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(s)));
  const a=await compare(expected),b=await compare(input.slice(7));
  let delta=0;
  for(let i=0;i<a.length;i++)delta|=a[i]^b[i];
  return delta===0;
}
export async function listLivePaidOrders(env) {
  if(!env.DB)throw new CatalogError('database_not_configured','Banco indisponível.',503);
  const res=await env.DB.prepare(`SELECT id,status,subtotal_cents,shipping_cents,
    total_cents,shipping_option_id,destination_zip,vavi_order_id,created_at,updated_at
    FROM store_orders WHERE payment_environment='live' AND
    status IN ('paid','manual_review','vavi_draft','in_production','shipped')
    ORDER BY created_at DESC LIMIT 50`).all();
  return {orders:res.results||[]};
}
export async function getLivePaidDelivery(env,id) {
  if(!/^ord_[a-f0-9]{32}$/.test(id||''))
    throw new CatalogError('invalid_order_id','Pedido inválido.',400);
  const order=await env.DB.prepare(`SELECT id,status,shipping_option_id,total_cents,vavi_order_id,
    destination_zip FROM store_orders WHERE id=? AND payment_environment='live'
    AND status IN ('paid','manual_review','vavi_draft','in_production','shipped')`)
    .bind(id).first();
  if(!order)throw new CatalogError('order_not_found','Pedido pago não encontrado.',404);
  const encrypted=await env.DB.prepare(`SELECT encrypted_payload,iv
    FROM store_order_delivery WHERE order_id=? LIMIT 1`).bind(id).first();
  if(!encrypted)
    throw new CatalogError('delivery_not_found','Dados de entrega não disponíveis.',503);
  const buyer=await decryptDelivery(id,encrypted,env.DELIVERY_ENCRYPTION_KEY_B64);
  return {order,buyer};
}

/**
 * Somente o operador registra a ordem VAVI depois que a transação já foi
 * verificada e o pedido foi criado MANUALMENTE na plataforma do fornecedor.
 * A comparação e a transição ocorrem atomicamente no banco.
 */
export async function registerManualVaviOrder(env,id,vaviOrderId) {
  if(!env.DB?.prepare)
    throw new CatalogError('database_not_configured','Banco indisponível.',503);
  if(!/^ord_[a-f0-9]{32}$/.test(id||''))
    throw new CatalogError('invalid_order_id','Pedido inválido.',400);
  if(typeof vaviOrderId!=='string' ||
      !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(vaviOrderId))
    throw new CatalogError('invalid_vavi_order_id','Identificador VAVI inválido.',422);
  let res;
  try {
    res=await env.DB.prepare(`UPDATE store_orders
      SET vavi_order_id=?,status='vavi_draft',
          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=? AND payment_environment='live'
        AND status='paid' AND vavi_order_id IS NULL`)
      .bind(vaviOrderId,id).run();
  }catch{
    throw new CatalogError('fulfillment_conflict',
      'Identificador VAVI já registrado ou banco indisponível.',409);
  }
  if(res.meta?.changes===1)
    return {orderId:id,vaviOrderId,status:'vavi_draft',alreadyRegistered:false};

  const order=await env.DB.prepare(`SELECT status,vavi_order_id
    FROM store_orders WHERE id=? AND payment_environment='live'`)
    .bind(id).first();
  if(order && order.vavi_order_id===vaviOrderId &&
      ['vavi_draft','in_production','shipped','delivered'].includes(order.status))
    return {orderId:id,vaviOrderId,status:order.status,alreadyRegistered:true};
  throw new CatalogError('fulfillment_not_allowed',
    'Pedido não está pago ou foi encaminhado com outro identificador.',409);
}
