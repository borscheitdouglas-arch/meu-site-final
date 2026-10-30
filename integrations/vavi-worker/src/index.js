import {CatalogError, normalizeCart, quoteCart, groupCatalog} from './catalog.js';
import {normalizeZip, simulateVaviShipping} from './shipping.js';
import {processPaymentWebhook} from './payment-webhook-service.js';
import {createCheckoutTest} from './checkout-orchestrator.js';

/** Private test checkout only: never enable public or production charges by default. */
async function authorizedTestCheckout(request, env) {
  const secret=env.CHECKOUT_TEST_API_KEY;
  const header=request.headers.get('Authorization')||'';
  if(typeof secret!=='string' || secret.length<32 ||
      !header.startsWith('Bearer ') || header.length>512) return false;
  const given=header.slice(7);
  const h=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(value)));
  const a=await h(secret),b=await h(given);
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}

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
      if (!['/api/catalog','/api/quote','/api/shipping/quote','/api/checkout/test','/api/internal/vavi/shipping-check'].includes(url.pathname)) return json({error:'not_found'},404,cors.headers);
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
    // Mercado Pago: verify HMAC, fetch the payment independently and
    // record an approved order idempotently. Disabled until operator
    // provisions the secret and explicitly enables webhook processing.
    if (url.pathname === '/api/payments/webhook' && request.method === 'POST') {
      try {
        const result=await processPaymentWebhook({request,env});
        return json({ok:true,processed:result.processed!==false},200);
      } catch(error) {
        if(error instanceof CatalogError)
          return json({error:error.code},error.status);
        console.error('Falha ao processar notificação:',error?.name||'unknown');
        return json({error:'webhook_processing_failed'},503);
      }
    }
    // Operator-only, read-only VAVI shipping diagnostic. It never creates a
    // checkout preference, D1 order or supplier order, and does not enable stock.
    if (url.pathname === '/api/internal/vavi/shipping-check' && request.method === 'POST') {
      if (!env.CHECKOUT_TEST_API_KEY || !(await authorizedTestCheckout(request,env)))
        return json({error:'unauthorized'},401);
      if (!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
        return json({error:'unsupported_media_type'},415);
      const payload=await request.text();
      if(payload.length>1000)return json({error:'request_too_large'},413);
      try {
        const body=JSON.parse(payload);
        const zipCode=normalizeZip(body?.zipCode);
        const lines=[{sku:'salve-regina-preta-g',quantity:1}];
        const options=await simulateVaviShipping(env,zipCode,lines);
        return json({mode:'diagnostic',sku:'salve-regina-preta-g',zipCode,
          options,createsOrder:false,createsPayment:false},200);
      } catch(e) {
        if(e instanceof CatalogError)return json({error:e.code},e.status);
        if(e instanceof SyntaxError)return json({error:'invalid_json'},400);
        console.error('VAVI diagnostic error:',e?.name||'unknown');
        return json({error:'shipping_diagnostic_failed'},503);
      }
    }
    if (!env.DB) return json({error:'database_not_configured'},503,cors.headers);
    try {
      if (url.pathname === '/api/checkout/test' && request.method === 'POST') {
        if (!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
          return json({error:'unsupported_media_type'},415,cors.headers);
        // Only an authorized operator can run a sandbox transaction.
        // Do not expose this key in HTML, browsers, or GitHub.
        if (env.CHECKOUT_TEST_ENABLED!=='true' ||
            env.WEBHOOK_PROCESSING_ENABLED!=='true' ||
            env.DELIVERY_PERSISTENCE_ENABLED!=='true' ||
            !env.MERCADOPAGO_WEBHOOK_SECRET ||
            !env.CHECKOUT_TEST_API_KEY) {
          return json({error:'checkout_not_ready'},503,cors.headers);
        }
        if (!(await authorizedTestCheckout(request,env))) {
          return json({error:'checkout_unauthorized'},401);
        }
        const bodyText=await request.text();
        if(bodyText.length>12000)return json({error:'request_too_large'},413);
        let body;
        try {body=JSON.parse(bodyText);}
        catch{return json({error:'invalid_json'},400);}
        const result=await createCheckoutTest(env,body);
        return json(result,201);
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
