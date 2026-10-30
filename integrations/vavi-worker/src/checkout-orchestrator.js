import {CatalogError,normalizeCart,quoteCart} from './catalog.js';
import {normalizeZip,simulateVaviShipping} from './shipping.js';
import {newOrderId,prepareDraftOrder,insertDraftOrder} from './order-repository.js';
import {createTestPreference} from './payment-preference-client.js';
import {validateBuyerDetails,encryptDelivery,storeEncryptedDelivery} from './delivery-repository.js';

const PRICE_TO_CENTS=x=>Number.isFinite(x)?Math.round(x*100):NaN;

/**
 * One operation, server side: verified catalogue -> VAVI shipping ->
 * D1 draft -> Mercado Pago TEST preference -> D1 awaiting_payment.
 *
 * Intentionally fail-closed until secure webhook processing and delivery
 * address persistence exist. Never switch flags based on browser input.
 */
export async function createCheckoutTest(env,body,deps={}) {
  if (env.CHECKOUT_TEST_ENABLED!=='true' ||
      env.WEBHOOK_PROCESSING_ENABLED!=='true' ||
      env.DELIVERY_PERSISTENCE_ENABLED!=='true') {
    throw new CatalogError('checkout_not_ready',
      'Checkout indisponível até finalizar notificações e entrega.',503);
  }
  if (!env.DB || !env.MERCADOPAGO_TEST_ACCESS_TOKEN ||
      !env.VAVI_SHIPPING_PRODUCTS_JSON || !env.DELIVERY_ENCRYPTION_KEY_B64) {
    throw new CatalogError('checkout_not_configured',
      'Pagamento de teste ou frete não configurado.',503);
  }
  const buyer=validateBuyerDetails(body?.buyer);
  const cart=normalizeCart(body);
  if(cart.length!==1 || cart[0].quantity!==1) {
    throw new CatalogError('checkout_quantity_not_supported',
      'No lançamento, uma camiseta por pedido.',422);
  }
  const zip=normalizeZip(body.zipCode);
  if (buyer.zipCode!==zip) throw new CatalogError('delivery_zip_mismatch',
    'O CEP da cotação não confere com o endereço.',422);
  const load=deps.loadVariant || (async sku=>env.DB.prepare(
    `SELECT v.sku,v.label,v.price_cents,v.available,p.name,
     p.enabled AS product_enabled,p.verified AS product_verified
     FROM variants v JOIN products p ON p.id=v.product_id
     WHERE v.sku=? LIMIT 1`).bind(sku).first());
  const quote=await quoteCart(cart,load);
  const freight=await (deps.simulateShipping||simulateVaviShipping)(
    env,zip,quote.lines
  );
  if (!Array.isArray(freight) || !freight.length) {
    throw new CatalogError('shipping_unavailable','Frete indisponível.',409);
  }
  // Never accept freight price from a browser, only a provider option.
  const selected=freight.find(x=>String(x.id)===body.shippingOptionId);
  if (!selected || selected.isActive!==true ||
      typeof selected.shippingCost!=='number' || selected.shippingCost<0) {
    throw new CatalogError('shipping_option_invalid',
      'Selecione um frete válido para seu CEP.',422);
  }
  const freightCents=PRICE_TO_CENTS(selected.shippingCost);
  if(!Number.isSafeInteger(freightCents) || freightCents<0)
    throw new CatalogError('shipping_option_invalid','Frete inválido.',422);

  // Encrypt before inserting anything; never send PII to Mercado Pago
  // preference or log buyer data. Persistence must precede payment.
  const orderId=newOrderId();
  const envelope=await (deps.encryptBuyer||encryptDelivery)(
    orderId,buyer,env.DELIVERY_ENCRYPTION_KEY_B64);
  const draft=prepareDraftOrder({
    orderId,lines:quote.lines,subtotalCents:quote.subtotalCents,
    shippingCents:freightCents,shippingOptionId:String(selected.id),
    destinationZip:zip
  });
  await (deps.insertDraft||insertDraftOrder)(env.DB,draft);
  await (deps.storeDelivery||storeEncryptedDelivery)(env.DB,envelope);
  const preference=await (deps.createPreference||createTestPreference)({
    order:draft,lines:quote.lines,shippingCents:freightCents,
    accessToken:env.MERCADOPAGO_TEST_ACCESS_TOKEN,
    siteBaseUrl:'https://www.douglasassumpcao.com.br',
    notificationUrl:'https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/webhook'
  });
  // Atomic compare-and-swap prevents inconsistent state transitions.
  const update=await env.DB.prepare(`UPDATE store_orders
    SET status='awaiting_payment', mp_preference_id=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=? AND status='draft' AND mp_preference_id IS NULL`)
    .bind(preference.preferenceId,orderId).run();
  if(update?.meta?.changes!==1) {
    throw new CatalogError('checkout_persistence_failed',
      'Pagamento não liberado: pedido não confirmado no banco.',503);
  }
  return {mode:'test',orderId,amountCents:draft.totalCents,
    checkoutUrl:preference.checkoutUrl};
}
