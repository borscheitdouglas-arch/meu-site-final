import {CatalogError} from './catalog.js';
import {buildPreference,validatePreferenceResponse} from './mercado-pago.js';

/** Server-only Mercado Pago Checkout Pro client. Not wired to any public route.
 * Only call once D1 order and VAVI shipping quote are stored/verified.
 */
export async function createTestPreference({order,lines,shippingCents,accessToken,
  siteBaseUrl,notificationUrl,fetchImpl=fetch}) {
  if (!order || order.status!=='draft' ||
      !Number.isSafeInteger(order.totalCents) ||
      typeof accessToken!=='string' || !accessToken) {
    throw new CatalogError('checkout_not_ready','Pagamento de teste não está configurado.',503);
  }
  const lineTotal=lines?.reduce((sum,line)=>sum+line.unitPriceCents*line.quantity,0);
  if (!Number.isSafeInteger(lineTotal) ||
      !Number.isSafeInteger(shippingCents) ||
      order.totalCents!==lineTotal+shippingCents) {
    throw new CatalogError('checkout_total_mismatch','Valor do pagamento não confere.',409);
  }
  const preference=buildPreference({
    lines,shippingCents,orderId:order.id,siteBaseUrl,notificationUrl
  });
  let response;
  try {
    response=await fetchImpl('https://api.mercadopago.com/checkout/preferences',{
      method:'POST',
      headers:{Authorization:'Bearer '+accessToken,
        'Content-Type':'application/json',Accept:'application/json',
        'X-Idempotency-Key':order.id},
      body:JSON.stringify(preference),
      signal:AbortSignal.timeout(10000)
    });
  } catch {
    throw new CatalogError('payment_provider_unavailable','Mercado Pago indisponível.',503);
  }
  if (!response.ok) {
    throw new CatalogError('payment_provider_unavailable','Mercado Pago recusou a preferência.',503);
  }
  let data;
  try { data=await response.json(); } catch {
    throw new CatalogError('payment_provider_unavailable','Resposta de pagamento inválida.',503);
  }
  const checkoutUrl=validatePreferenceResponse(data);
  if (typeof data.id!=='string' || !data.id) {
    throw new CatalogError('payment_provider_unavailable','Identificador de preferência ausente.',503);
  }
  return {preferenceId:data.id,checkoutUrl};
}
