import {CatalogError} from './catalog.js';

const ORDER_ID=/^ord_[0-9a-f]{32}$/;
const CEP=/^\d{8}$/;
const STR=(x,max=160)=>typeof x==='string' && x.trim().length>0 && x.trim().length<=max;
const MONEY=(n)=>Number.isSafeInteger(n) && n>=0;
const brl=cents=>Number((cents/100).toFixed(2));

/** Build a VAVI integration DRAFT payload from a paid order already verified
 * against Mercado Pago. Buyer fields come from a validated checkout form;
 * product prices and freight must originate from our server-side order.
 * Never invoke this builder on a browser payload or redirect alone.
 */
export function buildVaviIntegrationOrder({order,buyer,items}) {
  if(!order || !ORDER_ID.test(order.id||'') ||
     order.status!=='paid' || !MONEY(order.subtotalCents) ||
     !MONEY(order.shippingCents) || !MONEY(order.totalCents) ||
     order.totalCents!==order.subtotalCents+order.shippingCents ||
     !STR(order.mpPaymentId,80)) {
    throw new CatalogError('vavi_unverified_payment',
      'Não é possível enviar pedido sem confirmação persistida de pagamento.',409);
  }
  if (!buyer || !STR(buyer.name,160) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email||'') ||
      !/^[\d+()\s-]{8,24}$/.test(buyer.phone||'') ||
      !/^\d{11}$|^\d{14}$/.test(buyer.taxId||'') ||
      !CEP.test(buyer.zipCode||'') ||
      !STR(buyer.street,180) || !STR(buyer.number,30) ||
      !STR(buyer.neighborhood,90) || !STR(buyer.city,90) ||
      !/^[A-Z]{2}$/.test(buyer.state||'')) {
    throw new CatalogError('vavi_invalid_buyer',
      'Dados de entrega incompletos para o pedido.',422);
  }
  if (!Array.isArray(items) || items.length===0 || items.length>15) {
    throw new CatalogError('vavi_invalid_items','Itens do pedido inválidos.',409);
  }
  const clean=items.map(item=>{
    if(!item || !STR(item.name,180) ||
       !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>10 ||
       !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents<=0 ||
       (item.sku!==undefined && item.sku!==null && !STR(item.sku,90))) {
      throw new CatalogError('vavi_invalid_items','Itens do pedido inválidos.',409);
    }
    return {name:item.name,sku:item.sku||undefined,
      quantity:item.quantity,unitPrice:brl(item.unitPriceCents)};
  });
  const sum=items.reduce((total,i)=>total+i.unitPriceCents*i.quantity,0);
  if(!Number.isSafeInteger(sum) || sum!==order.subtotalCents ||
     buyer.zipCode!==order.destinationZip) {
    throw new CatalogError('vavi_total_mismatch','Pedido e entrega não conferem.',409);
  }
  return {
    code:order.id,
    requestClientId:order.id,
    buyer:{
      name:buyer.name,email:buyer.email,phone:buyer.phone,taxId:buyer.taxId,
      zipCode:buyer.zipCode,street:buyer.street,number:buyer.number,
      complement:buyer.complement||'',neighborhood:buyer.neighborhood,
      city:buyer.city,state:buyer.state
    },
    status:'paid',
    freightAmount:brl(order.shippingCents),
    paidAmount:brl(order.totalCents),
    items:clean
  };
}
