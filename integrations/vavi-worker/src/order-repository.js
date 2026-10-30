import {CatalogError} from './catalog.js';
import {validateDraftTotals} from './order-state.js';

const SKU=/^[A-Za-z0-9_.-]{1,90}$/;
const ZIP=/^\d{8}$/;
const SHIPPING=/^[A-Za-z0-9_.:-]{1,120}$/;

/** Internal persistence only; callers MUST obtain validated product prices and
 * a genuine VAVI shipping quote server-side. No public checkout route yet. */
export function prepareDraftOrder({lines,subtotalCents,shippingCents,
  shippingOptionId,destinationZip,orderId}) {
  if (!Array.isArray(lines) || lines.length<1 || lines.length>15 ||
      typeof orderId!=='string' || !/^ord_[a-f0-9]{32}$/.test(orderId) ||
      !ZIP.test(destinationZip||'') ||
      !SHIPPING.test(shippingOptionId||'')) {
    throw new CatalogError('invalid_order','Pedido ainda não está pronto.',409);
  }
  const seen=new Set();
  const items=lines.map(line=>{
    if (!line || !SKU.test(line.sku||'') || seen.has(line.sku) ||
        typeof line.name!=='string' || !line.name.trim() ||
        typeof line.variation!=='string' ||
        line.name.length>180 || line.variation.length>180 ||
        !Number.isSafeInteger(line.totalCents) ||
        line.totalCents!==line.quantity*line.unitPriceCents) {
      throw new CatalogError('invalid_order_item','Itens inválidos.',409);
    }
    seen.add(line.sku);
    return {sku:line.sku,label:(line.name+' — '+line.variation).slice(0,360),
      quantity:line.quantity,unitPriceCents:line.unitPriceCents,
      lineTotalCents:line.totalCents};
  });
  const totalCents=subtotalCents+shippingCents;
  validateDraftTotals({items,subtotalCents,shippingCents,totalCents});
  return {id:orderId,status:'draft',currency:'BRL',
    subtotalCents,shippingCents,totalCents,shippingOptionId,destinationZip,items};
}

export function newOrderId() {
  const bytes=new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'ord_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}

export async function insertDraftOrder(db,draft) {
  if (!db || typeof db.batch!=='function' || typeof db.prepare!=='function') {
    throw new CatalogError('database_not_configured','Banco indisponível.',503);
  }
  // Validate independently before any write, including for internal callers.
  const d=prepareDraftOrder({
    lines:draft?.items?.map(i=>({sku:i.sku,name:i.label,variation:'',
      quantity:i.quantity,unitPriceCents:i.unitPriceCents,totalCents:i.lineTotalCents})),
    subtotalCents:draft?.subtotalCents,shippingCents:draft?.shippingCents,
    shippingOptionId:draft?.shippingOptionId,destinationZip:draft?.destinationZip,
    orderId:draft?.id
  });
  const statements=[
    db.prepare(`INSERT INTO store_orders
      (id,status,currency,subtotal_cents,shipping_cents,total_cents,
       shipping_option_id,destination_zip)
      VALUES (?,'draft','BRL',?,?,?,?,?)`)
      .bind(d.id,d.subtotalCents,d.shippingCents,d.totalCents,
        d.shippingOptionId,d.destinationZip),
    ...d.items.map(i=>db.prepare(`INSERT INTO store_order_items
      (order_id,sku,label,quantity,unit_price_cents,line_total_cents)
      VALUES (?,?,?,?,?,?)`).bind(d.id,i.sku,i.label,i.quantity,
        i.unitPriceCents,i.lineTotalCents))
  ];
  try {
    // D1 batch executes statements transactionally: all or none.
    await db.batch(statements);
  } catch {
    throw new CatalogError('order_write_failed','Não foi possível registrar pedido.',503);
  }
  return {id:d.id,status:'draft',totalCents:d.totalCents};
}

export async function getOrderForPayment(db,orderId) {
  if (!/^ord_[a-f0-9]{32}$/.test(orderId||'')) {
    throw new CatalogError('invalid_order_id','Pedido inválido.',400);
  }
  return db.prepare(`SELECT id,status,currency,subtotal_cents,shipping_cents,
    total_cents,mp_preference_id,mp_payment_id FROM store_orders WHERE id=?`)
    .bind(orderId).first();
}
