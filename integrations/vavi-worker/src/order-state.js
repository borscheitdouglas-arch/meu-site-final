import {CatalogError} from './catalog.js';

const ALLOWED = Object.freeze({
  draft:['awaiting_payment','canceled'],
  awaiting_payment:['paid','payment_failed','canceled','manual_review'],
  payment_failed:['awaiting_payment','canceled','manual_review'],
  paid:['vavi_draft','manual_review'],
  vavi_draft:['in_production','manual_review'],
  in_production:['shipped','manual_review'],
  shipped:['delivered','manual_review'],
  manual_review:['paid','vavi_draft','in_production','shipped','canceled'],
  delivered:[],
  canceled:[]
});
export const ORDER_STATES = Object.freeze(Object.keys(ALLOWED));

export function nextOrderState(current, requested) {
  if (!Object.hasOwn(ALLOWED,current) ||
      !ALLOWED[current].includes(requested)) {
    throw new CatalogError('invalid_order_transition',
      'Mudança de estado do pedido não permitida.',409);
  }
  return requested;
}

export function validateConfirmedPayment(order, payment) {
  if (!order || !payment || typeof payment !== 'object' ||
      !Number.isSafeInteger(order.total_cents) || order.total_cents <= 0 ||
      typeof order.id !== 'string' || order.id.length === 0) {
    throw new CatalogError('invalid_payment_check','Verificação incompleta.',409);
  }
  // Never treat checkout redirect or unverified webhook payload as proof.
  // 'payment' must have been independently fetched with backend credentials.
  const cents = Math.round(Number(payment.transaction_amount) * 100);
  if (payment.status !== 'approved' ||
      payment.currency_id !== 'BRL' ||
      payment.external_reference !== order.id ||
      !Number.isSafeInteger(cents) ||
      Math.abs(Number(payment.transaction_amount)*100-cents)>0.001 ||
      cents !== order.total_cents) {
    throw new CatalogError('payment_mismatch','Pagamento não confere com o pedido.',409);
  }
  return {orderId:order.id,paymentId:String(payment.id),status:'paid'};
}

export function validateDraftTotals({items,subtotalCents,shippingCents,totalCents}) {
  if (!Array.isArray(items) || items.length === 0 ||
      !Number.isSafeInteger(subtotalCents) || subtotalCents <= 0 ||
      !Number.isSafeInteger(shippingCents) || shippingCents < 0 ||
      !Number.isSafeInteger(totalCents) ||
      totalCents !== subtotalCents + shippingCents) {
    throw new CatalogError('invalid_order_total','Total do pedido inválido.',409);
  }
  const sum=items.reduce((n,item)=>{
    if (!Number.isInteger(item.quantity) || item.quantity<1 ||
        !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents<=0) {
      throw new CatalogError('invalid_order_item','Produto inválido.',409);
    }
    return n+item.quantity*item.unitPriceCents;
  },0);
  if (!Number.isSafeInteger(sum) || sum !== subtotalCents) {
    throw new CatalogError('invalid_order_total','Subtotal não confere.',409);
  }
  return true;
}
