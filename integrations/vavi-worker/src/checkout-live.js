import {CatalogError,normalizeCart,quoteCart} from './catalog.js';
import {approvedDirectVariant,DIRECT_CHECKOUT_SKUS} from './salve-regina-variants.js';
import {normalizeZip,simulateVaviShipping,simulateVaviShippingCartProvisional,shippingPayload} from './shipping.js';
import {newOrderId,prepareDraftOrder,insertDraftOrder} from './order-repository.js';
import {createTestPreference} from './payment-preference-client.js';
import {validateBuyerDetails,encryptDelivery,storeEncryptedDelivery} from './delivery-repository.js';

const SITE='https://www.douglasassumpcao.com.br';
const NOTIFY='https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/live-webhook';

/** Todos os bloqueios ficam no servidor. Nenhum campo do navegador libera cobranças. */
export function liveCheckoutReady(env) {
  return Boolean(env.DB && env.LIVE_CHECKOUT_ENABLED==='true' &&
    env.LIVE_PRODUCT_APPROVED==='true' && env.LIVE_POLICY_APPROVED==='true' &&
    env.LIVE_WEBHOOK_ENABLED==='true' &&
    env.DELIVERY_PERSISTENCE_ENABLED==='true' &&
    env.MERCADOPAGO_LIVE_ACCESS_TOKEN &&
    env.MERCADOPAGO_LIVE_WEBHOOK_SECRET &&
    env.SHOP_ADMIN_API_KEY && env.SHOP_ADMIN_API_KEY.length>=32 &&
    env.DELIVERY_ENCRYPTION_KEY_B64 &&
    env.VAVI_CLIENT_ID && env.VAVI_CLIENT_SECRET &&
    env.VAVI_SHIPPING_PRODUCTS_JSON);
}

export async function createCheckoutLive(env,body,deps={}) {
  if (!liveCheckoutReady(env))
    throw new CatalogError('live_checkout_disabled','Compra online ainda indisponível.',503);
  const buyer=validateBuyerDetails(body?.buyer);
  const items=normalizeCart(body);
  if(items.some(line=>!DIRECT_CHECKOUT_SKUS.includes(line.sku)))
    throw new CatalogError('live_product_unavailable','Produto não aprovado para venda.',409);
  const multiple=items.length!==1 || items[0].quantity!==1;
  if(multiple && env.LIVE_MULTICART_CHECKOUT_ENABLED!=='true')
    throw new CatalogError('live_multicart_disabled','Venda de carrinhos combinados ainda indisponível.',503);
  const zip=normalizeZip(body.zipCode);
  if(buyer.zipCode!==zip)
    throw new CatalogError('delivery_zip_mismatch','O CEP do endereço difere do CEP do frete.',422);

  const load=deps.loadVariant || (sku=>env.DB.prepare(
    `SELECT v.sku,v.label,v.price_cents,v.available,p.name,
    p.enabled AS product_enabled,p.verified AS product_verified
    FROM variants v JOIN products p ON p.id=v.product_id
    WHERE v.sku=? LIMIT 1`).bind(sku).first());
  const quote=await quoteCart(items,load);
  // Preço de venda aprovado e conferido no D1; navegador não envia valores.
  // A lista interna não aprova o fornecedor: quoteCart exige enabled/verified/available.
  if(!quote.lines.every(line=>approvedDirectVariant(line.sku,line.unitPriceCents)) ||
     quote.subtotalCents!==quote.lines.reduce((sum,line)=>sum+line.totalCents,0))
    throw new CatalogError('live_price_unapproved','Preço dos produtos precisa ser revisado.',503);

  let quotes;
  if(multiple){
    // Só autorizar um carrinho de várias peças se CADA variante possuir
    // ficha individual aprovada. A prévia isolada (sem UUID) não libera vendas.
    const packed=await Promise.all(quote.lines.map(async line=>{
      shippingPayload(zip,[{sku:line.sku,quantity:1}],env.VAVI_SHIPPING_PRODUCTS_JSON);
      const observation=await env.DB.prepare(
        'SELECT supplier_variant_sku,observed_total_cents FROM supplier_variant_cost_observations '+
        'WHERE internal_sku=? LIMIT 1'
      ).bind(line.sku).first();
      if(!observation || !Number.isSafeInteger(observation.observed_total_cents))
        throw new CatalogError('shipping_product_unverified','Produto sem custo e ficha logística conferidos.',409);
      return {sku:line.sku,quantity:line.quantity,
        supplierSku:observation.supplier_variant_sku,
        unitCostCents:observation.observed_total_cents};
    }));
    // Cotação real da API, com todas as variações; fabricante pode embalar
    // de forma diferente. A loja assume a eventual diferença operacional.
    quotes=await (deps.simulateShippingCart||simulateVaviShippingCartProvisional)(env,zip,packed);
  }else{
    quotes=await (deps.simulateShipping||simulateVaviShipping)(env,zip,quote.lines);
  }
  const option=Array.isArray(quotes) && quotes.find(x=>
    x.isActive===true && String(x.id)===body.shippingOptionId &&
    !/retirada|retire|pickup/i.test(String(x.name||'')));
  if(!option || !Number.isFinite(option.shippingCost) || option.shippingCost<0 ||
     Math.abs(option.shippingCost*100-Math.round(option.shippingCost*100))>0.000001)
    throw new CatalogError('shipping_option_invalid','Frete não disponível para este CEP.',422);
  const shippingCents=Math.round(option.shippingCost*100);
  if(!Number.isSafeInteger(shippingCents) || shippingCents>100000)
    throw new CatalogError('shipping_option_invalid','Frete inválido.',422);

  const orderId=newOrderId();
  const draft=prepareDraftOrder({
    orderId,lines:quote.lines,subtotalCents:quote.subtotalCents,
    shippingCents,shippingOptionId:String(option.id),destinationZip:zip
  });
  const envelope=await (deps.encryptDelivery||encryptDelivery)(
    orderId,buyer,env.DELIVERY_ENCRYPTION_KEY_B64);
  await (deps.insertDraftOrder||insertDraftOrder)(env.DB,draft);
  // A ausência da migração 0007 bloqueia o pagamento antes de ir ao Mercado Pago.
  const mode=await env.DB.prepare(`UPDATE store_orders SET payment_environment='live'
    WHERE id=? AND status='draft' AND payment_environment='test'`).bind(orderId).run();
  if(mode?.meta?.changes!==1)
    throw new CatalogError('live_schema_unavailable','Checkout não configurado no banco.',503);
  await (deps.storeEncryptedDelivery||storeEncryptedDelivery)(env.DB,envelope);
  const preference=await (deps.createPreference||createTestPreference)({
    order:draft,lines:quote.lines,shippingCents,
    accessToken:env.MERCADOPAGO_LIVE_ACCESS_TOKEN,
    siteBaseUrl:SITE,notificationUrl:NOTIFY,sandbox:false
  });
  const update=await env.DB.prepare(`UPDATE store_orders
    SET status='awaiting_payment',mp_preference_id=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=? AND status='draft' AND payment_environment='live'
    AND mp_preference_id IS NULL`)
    .bind(preference.preferenceId,orderId).run();
  if(update?.meta?.changes!==1)
    throw new CatalogError('checkout_persistence_failed','Pedido não preparado para pagamento.',503);
  return {mode:'live',orderId,totalCents:draft.totalCents,
    checkoutUrl:preference.checkoutUrl};
}
