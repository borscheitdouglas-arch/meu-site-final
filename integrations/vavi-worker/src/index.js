import {CatalogError, normalizeCart, quoteCart, groupCatalog} from './catalog.js';
import {normalizeZip, simulateVaviShipping} from './shipping.js';
import {verifyWebhookSignature} from './payment-verification.js';
import {createCheckoutTest} from './checkout-orchestrator.js';

/** API inicial, sem checkout, dados pessoais, autenticação VAVI ou pedidos reais. */
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra}
  });
}
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return {allowed: true, headers: {}};
  const origins = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!origins.includes(origin)) return {allowed: false, headers: {'Vary': 'Origin'}};
  return {allowed: true, headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  }};
}
async function getCatalog(db) {
  const result = await db.prepare(
    `SELECT p.id,p.name,p.description,p.image,v.sku,v.label,v.price_cents
     FROM products p JOIN variants v ON v.product_id = p.id
     WHERE p.enabled = 1 AND p.verified = 1 AND v.available = 1
     ORDER BY p.sort_order,p.name,v.label`
  ).all();
  return groupCatalog(result.results || []);
}
async function loadVariant(db, sku) {
  return db.prepare(
    `SELECT v.sku,v.label,v.price_cents,v.available,p.name,
      p.enabled AS product_enabled,p.verified AS product_verified
     FROM variants v JOIN products p ON p.id = v.product_id WHERE v.sku = ? LIMIT 1`
  ).bind(sku).first();
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (!cors.allowed) return json({error:'origin_not_allowed'}, 403, cors.headers);
    if (request.method === 'OPTIONS') {
      if (!['/api/catalog','/api/quote','/api/shipping/quote','/api/checkout/test'].includes(url.pathname)) return json({error:'not_found'},404,cors.headers);
      return new Response(null,{status:204,headers:cors.headers});
    }
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ok:true, mode:'preview', payments:false, vaviOrders:false},200,cors.headers);
    }
    // Operator-facing readiness report without revealing any secret values.
    // A missing webhook secret or verified catalogue keeps the public shop off.
    if (url.pathname === '/api/store/readiness' && request.method === 'GET') {
      if (!env.DB) return json({mode:'preview',ready:false,
        checks:{database:false,product:false,freight:false,payments:false,webhook:false}},503,cors.headers);
      const count=await env.DB.prepare(`SELECT COUNT(*) AS n FROM products p
        JOIN variants v ON v.product_id=p.id
        WHERE p.enabled=1 AND p.verified=1 AND v.available=1
        AND v.price_cents>0`).first();
      const checks={
        database:true,
        product:Number(count?.n||0)>0,
        freight:Boolean(env.VAVI_SHIPPING_PRODUCTS_JSON &&
          env.VAVI_CLIENT_ID && env.VAVI_CLIENT_SECRET),
        payments:false, // not enabled until complete end-to-end tests
        webhook:false // the route is still guarded, not consuming notifications
      };
      return json({mode:'preview',ready:false,checks},200,cors.headers);
    }
    // Endpoint reservado para notificações Mercado Pago. Até que exista
    // persistência idempotente e consulta ao pagamento, nunca responder 2xx:
    // isso evita que notificações sejam consideradas processadas e perdidas.
    if (url.pathname === '/api/payments/webhook' && request.method === 'POST') {
      if (!env.MERCADOPAGO_WEBHOOK_SECRET) {
        return json({error:'webhook_not_configured'},503);
      }
      const requestId=request.headers.get('x-request-id');
      const signature=request.headers.get('x-signature');
      const dataId=url.searchParams.get('data.id') || url.searchParams.get('id');
      if (!dataId) return json({error:'invalid_notification'},400);
      try {
        await verifyWebhookSignature({
          signature, requestId, dataId, secret:env.MERCADOPAGO_WEBHOOK_SECRET
        });
      } catch(error) {
        if (error instanceof CatalogError) {
          return json({error:error.code},error.status);
        }
        return json({error:'invalid_notification'},401);
      }
      return json({error:'webhook_processing_not_enabled'},503);
    }
    if (!env.DB) return json({error:'database_not_configured'},503,cors.headers);
    try {
      if (url.pathname === '/api/checkout/test' && request.method === 'POST') {
        if (!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
          return json({error:'unsupported_media_type'},415,cors.headers);
        // Deliberately unavailable on the public Worker until webhook processing,
        // delivery storage and signed-in test authorization are implemented.
        // Never let a browser set flags or claim a delivery was persisted.
        if (env.CHECKOUT_TEST_ENABLED!=='true' ||
            env.WEBHOOK_PROCESSING_ENABLED!=='true' ||
            env.DELIVERY_PERSISTENCE_ENABLED!=='true') {
          return json({error:'checkout_not_ready'},503,cors.headers);
        }
        return json({error:'checkout_private_authorization_missing'},503,cors.headers);
      }
      if (url.pathname === '/api/catalog' && request.method === 'GET') {
        return json({mode:'preview', currency:'BRL', products:await getCatalog(env.DB)},200,cors.headers);
      }
      if (['/api/quote','/api/shipping/quote'].includes(url.pathname) && request.method === 'POST') {
        if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
          return json({error:'unsupported_media_type'},415,cors.headers);
        }
        const bodyText = await request.text();
        if (bodyText.length > 12000) return json({error:'request_too_large'},413,cors.headers);
        let body;
        try { body = JSON.parse(bodyText); }
        catch { return json({error:'invalid_json'},400,cors.headers); }
        const cart = normalizeCart(body);
        const preview = await quoteCart(cart, sku => loadVariant(env.DB,sku));
        if (url.pathname === '/api/quote') return json(preview,200,cors.headers);
        const zipCode = normalizeZip(body.zipCode);
        const shipping = await simulateVaviShipping(env,zipCode,preview.lines);
        return json({mode:'preview',currency:'BRL',zipCode,
          options:shipping,checkoutEnabled:false},200,cors.headers);
      }
      return json({error:'not_found'},404,cors.headers);
    } catch (error) {
      if (error instanceof CatalogError) return json({error:error.code,message:error.message},error.status,cors.headers);
      console.error('Falha ao consultar catálogo ou calcular prévia:',error?.name || 'unknown');
      return json({error:'internal_error'},500,cors.headers);
    }
  }
};
