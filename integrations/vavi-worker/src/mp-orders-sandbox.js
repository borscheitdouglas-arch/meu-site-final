import {CatalogError} from './catalog.js';

// Independent adapter for Mercado Pago Checkout Pro via Orders API.
// Deliberately NOT connected to the live storefront or existing webhook.
const ROOT='https://api.mercadopago.com';
const ORDER=/^ord_[a-f0-9]{32}$/;
const ORDER_MP=/^ORD(?:TST)?[A-Z0-9]{12,50}$/;
const BRL=x=>(x/100).toFixed(2);

export function buildOrdersCheckout({order,items}) {
  if (!ORDER.test(order?.id||'') ||
      !Number.isSafeInteger(order?.totalCents) || order.totalCents<=0 ||
      !Number.isSafeInteger(order?.shippingCents) || order.shippingCents<0 ||
      !Array.isArray(items) || items.length!==1) {
    throw new CatalogError('orders_invalid_request','Pedido de teste inválido.',409);
  }
  const item=items[0];
  if (item.sku!=='salve-regina-preta-g' ||
      item.quantity!==1 || item.unitPriceCents!==10990 ||
      !Number.isSafeInteger(item.totalCents) ||
      item.totalCents!==10990 ||
      order.totalCents!==item.totalCents+order.shippingCents) {
    throw new CatalogError('orders_invalid_total',
      'Total do checkout não confere com o pedido.',409);
  }
  const paymentItems=[
    {title:'Camiseta Salve Regina - Preta G',quantity:1,
      unit_price:BRL(item.unitPriceCents)}
  ];
  if(order.shippingCents>0)paymentItems.push({
    title:'Frete VAVI',quantity:1,unit_price:BRL(order.shippingCents)
  });
  return {
    type:'online',
    processing_mode:'manual',
    capture_mode:'automatic',
    total_amount:BRL(order.totalCents),
    external_reference:order.id,
    items:paymentItems
  };
}

export function validateOrdersCheckoutResponse(response,expectedExternalReference) {
  if (!ORDER_MP.test(response?.id||'') ||
      response?.external_reference!==expectedExternalReference ||
      response?.status!=='created' ||
      typeof response?.checkout_url!=='string')
    throw new CatalogError('orders_invalid_response',
      'Resposta de homologação inválida.',503);
  let url;
  try{url=new URL(response.checkout_url);}catch{
    throw new CatalogError('orders_invalid_response','URL de teste inválida.',503);
  }
  if(url.protocol!=='https:' || !['www.mercadopago.com.br',
    'www.mercadopago.com'].includes(url.hostname) ||
    url.searchParams.get('order_id')!==response.id)
    throw new CatalogError('orders_invalid_response','Checkout inesperado.',503);
  return {providerOrderId:response.id,checkoutUrl:url.href};
}

export async function createOrdersSandbox({order,items,accessToken,fetchImpl=fetch}) {
  if (!accessToken || typeof accessToken!=='string')
    throw new CatalogError('orders_not_configured','Token não configurado.',503);
  const payload=buildOrdersCheckout({order,items});
  let response;
  try{
    response=await fetchImpl(ROOT+'/v1/orders',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+accessToken,
        'Content-Type':'application/json',
        'Accept':'application/json',
        'X-Idempotency-Key':order.id
      },
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(10000)
    });
  }catch{
    throw new CatalogError('orders_provider_unavailable','Orders API indisponível.',503);
  }
  if(response.status!==201)
    throw new CatalogError('orders_provider_rejected',
      'Orders API não aceitou a operação de teste.',503);
  let json;
  try{json=await response.json();}catch{
    throw new CatalogError('orders_invalid_response','Resposta inválida.',503);
  }
  return validateOrdersCheckoutResponse(json,order.id);
}

/**
 * Validation only. Do not settle funds or change D1 order status here.
 * The Orders API returns order-level status; never reuse the old
 * payment-legacy webhook that expects numeric payment IDs.
 */
export function validateOrdersPaymentStatus(provider,dbOrder,providerOrderId) {
  if (!ORDER_MP.test(providerOrderId||'') ||
      provider?.id!==providerOrderId ||
      provider?.external_reference!==dbOrder?.id ||
      provider?.currency!=='BRL' ||
      !Number.isSafeInteger(dbOrder?.total_cents)) {
    throw new CatalogError('orders_payment_mismatch',
      'Order não corresponde ao pedido.',409);
  }
  const parseCents=value=>{
    if(typeof value!=='string' || !/^\d{1,8}\.\d{2}$/.test(value))
      throw new CatalogError('orders_payment_mismatch','Valor inválido.',409);
    return Number(value.replace('.',''));
  };
  if(parseCents(provider.total_amount)!==dbOrder.total_cents) {
    throw new CatalogError('orders_payment_mismatch',
      'Valor da Order diverge do pedido.',409);
  }
  if(parseCents(provider.total_paid_amount||'0.00')!==dbOrder.total_cents ||
     provider.status!=='processed' || provider.status_detail!=='accredited') {
    throw new CatalogError('orders_not_approved',
      'Order ainda não está aprovada.',409);
  }
  const payments=provider.transactions?.payments;
  if(!Array.isArray(payments)||payments.length!==1 ||
     payments[0].status!=='processed' ||
     payments[0].status_detail!=='accredited' ||
     parseCents(payments[0].paid_amount)!==dbOrder.total_cents) {
    throw new CatalogError('orders_payment_mismatch',
      'Transação não conciliada.',409);
  }
  return {orderId:dbOrder.id,providerOrderId,status:'verified_test_only'};
}
