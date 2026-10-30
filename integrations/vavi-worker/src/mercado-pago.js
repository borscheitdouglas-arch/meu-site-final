import {CatalogError} from './catalog.js';

/** Pure Checkout Pro Preferences builder. NEVER trust amounts coming from browser.
 * This module only prepares a payload. Payment creation, persistence and webhooks
 * must be implemented and tested before production checkout is enabled.
 */
export function buildPreference({lines, shippingCents, orderId, siteBaseUrl, notificationUrl}) {
  if (!Array.isArray(lines) || lines.length === 0 ||
      !Number.isSafeInteger(shippingCents) || shippingCents < 0 ||
      typeof orderId !== 'string' || !/^[a-zA-Z0-9_-]{8,90}$/.test(orderId)) {
    throw new CatalogError('checkout_invalid_order','Pedido ainda não está pronto para pagamento.',409);
  }
  let site;
  let notification;
  try {
    site = new URL(siteBaseUrl);
    notification = new URL(notificationUrl);
  } catch {
    throw new CatalogError('checkout_invalid_configuration','URLs de checkout não configuradas.',503);
  }
  if (site.protocol !== 'https:' || notification.protocol !== 'https:') {
    throw new CatalogError('checkout_invalid_configuration','HTTPS obrigatório.',503);
  }
  const items = lines.map(line => {
    if (!line || !Number.isSafeInteger(line.unitPriceCents) ||
        line.unitPriceCents <= 0 || !Number.isInteger(line.quantity) ||
        line.quantity < 1 || line.quantity > 10 ||
        typeof line.name !== 'string' || line.name.length < 1 ||
        typeof line.sku !== 'string') {
      throw new CatalogError('checkout_invalid_order','Itens de pagamento inválidos.',409);
    }
    return {id:line.sku,title:line.name,quantity:line.quantity,
      currency_id:'BRL',unit_price:line.unitPriceCents/100};
  });
  if (shippingCents > 0) {
    items.push({id:'frete',title:'Frete',quantity:1,currency_id:'BRL',
      unit_price:shippingCents/100});
  }
  const base = site.origin;
  return {
    items,external_reference:orderId,
    back_urls:{
      success:base+'/pages/loja.html?pagamento=sucesso',
      pending:base+'/pages/loja.html?pagamento=pendente',
      failure:base+'/pages/loja.html?pagamento=falha'
    },
    notification_url:notification.toString(),
    auto_return:'approved'
  };
}

export function validatePreferenceResponse(body) {
  const url = body?.init_point;
  if (typeof url !== 'string') {
    throw new CatalogError('payment_provider_unavailable','Checkout indisponível.',503);
  }
  let parsed;
  try { parsed = new URL(url); } catch {
    throw new CatalogError('payment_provider_unavailable','Checkout indisponível.',503);
  }
  if (parsed.protocol !== 'https:' ||
      !['www.mercadopago.com.br','www.mercadopago.com','mercadopago.com.br',
        'mercadopago.com'].includes(parsed.hostname)) {
    throw new CatalogError('payment_provider_unavailable','Checkout inválido.',503);
  }
  return url;
}
