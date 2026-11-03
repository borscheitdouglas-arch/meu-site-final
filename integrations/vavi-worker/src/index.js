import {CatalogError, normalizeCart, quoteCart, groupCatalog} from './catalog.js';
import {normalizeZip, simulateVaviShipping,simulateVaviShippingProvisional,simulateVaviShippingCartProvisional,shippingPayload,canQuotePublishedPackage} from './shipping.js';
import {processPaymentWebhook} from './payment-webhook-service.js';
import {processOrdersWebhook} from './mp-orders-webhook.js';
import {createCheckoutTest} from './checkout-orchestrator.js';
import {createCheckoutLive,liveCheckoutReady} from './checkout-live.js';
import {processLivePaymentWebhook} from './live-payment-webhook.js';
import {reconcileLivePayment} from './live-payment-reconcile.js';
import {authorizedLiveAdmin,listLivePaidOrders,getLivePaidDelivery,registerManualVaviOrder} from './live-order-admin.js';
import {getPrivateLaunchReadiness} from './launch-readiness.js';
import {dispatchVaviDraft,processPendingPaidVaviDrafts} from './vavi-auto-draft.js';
import {processVaviWebhook} from './vavi-webhook.js';
import {SALVE_REGINA_VARIANTS,approvedVariant,SALVE_REGINA_SKUS,DIRECT_CHECKOUT_SKUS,approvedDirectVariant} from './salve-regina-variants.js';

/** Private test checkout only: never enable public or production charges by default. */
async function authorizedTestCheckout(request, env) {
  const header=request.headers.get('Authorization')||'';
  if(!header.startsWith('Bearer ') || header.length>512) return false;
  const given=header.slice(7);
  const h=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(value)));
  const probeExpiry=Number(env.CHECKOUT_TEST_PROBE_EXPIRES_AT);
  const probeAllowed=Number.isSafeInteger(probeExpiry) &&
    probeExpiry>Date.now() && probeExpiry<=Date.now()+15*60*1000;
  const candidates=[env.CHECKOUT_TEST_API_KEY];
  if(probeAllowed)candidates.push(env.CHECKOUT_TEST_PROBE_KEY);
  const provided=await h(given);
  let valid=false;
  for(const secret of candidates) {
    if(typeof secret!=='string'||secret.length<32)continue;
    const expected=await h(secret);
    let diff=0;
    for(let i=0;i<expected.length;i++)diff|=expected[i]^provided[i];
    valid ||= diff===0;
  }
  return valid;
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (!cors.allowed) return json({error:'origin_not_allowed'}, 403, cors.headers);
    if (request.method === 'OPTIONS') {
      const adminOptions=url.pathname==='/api/internal/launch/shipping-check' ||
        url.pathname==='/api/internal/live-payments/reconcile' ||
        url.pathname==='/api/internal/launch-readiness' ||
        url.pathname==='/api/internal/live-orders' ||
        (url.pathname.startsWith('/api/internal/live-orders/') &&
         /^ord_[a-f0-9]{32}$/.test(url.pathname.slice('/api/internal/live-orders/'.length))) ||
        /^\/api\/internal\/live-orders\/ord_[a-f0-9]{32}\/fulfillment$/.test(url.pathname);
      if (!adminOptions && !['/api/catalog','/api/quote','/api/shipping/quote','/api/shipping/preview','/api/shipping/cart-preview','/api/checkout/test','/api/checkout/live','/api/internal/vavi/shipping-check'].includes(url.pathname))
        return json({error:'not_found'},404,cors.headers);
      return new Response(null,{status:204,headers:cors.headers});
    }
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ok:true, mode:'preview', payments:false, vaviOrders:false},200,cors.headers);
    }
    // Readiness is public, but exposes no credential or private order data.
    if (url.pathname === '/api/checkout/live/readiness' && request.method === 'GET') {
      if (!liveCheckoutReady(env)) return json({checkoutEnabled:false},200,cors.headers);
      try {
        const checked=await Promise.all(SALVE_REGINA_SKUS.map(async sku=>{
          const p=await loadVariant(env.DB,sku);
          return p && p.product_enabled===1 && p.product_verified===1 &&
            p.available===1 && approvedVariant(sku,p.price_cents);
        }));
        // A liberação global mantém a compatibilidade com a camiseta.
        // Outras peças só são anunciadas para checkout após D1 verificado,
        // preço tabelado e configuração logística individual válida.
        const availableSkus=[];
        for(const sku of DIRECT_CHECKOUT_SKUS){
          const variant=await loadVariant(env.DB,sku);
          if(!variant || variant.product_enabled!==1 ||
             variant.product_verified!==1 || variant.available!==1 ||
             !approvedDirectVariant(sku,variant.price_cents))continue;
          try{
            shippingPayload('01001000',[{sku,quantity:1}],env.VAVI_SHIPPING_PRODUCTS_JSON);
            availableSkus.push(sku);
          }catch(error){
            // Ficha publicada + SKU/custo observados no D1 permitem simulação
            // via API VAVI, sem inventar identificador ou custo no navegador.
            if(!(error instanceof CatalogError) ||
              error.code!=='shipping_product_unverified' ||
              !canQuotePublishedPackage(sku))continue;
            const row=await env.DB.prepare(
              'SELECT supplier_variant_sku,observed_total_cents '+
              'FROM supplier_variant_cost_observations WHERE internal_sku=? LIMIT 1'
            ).bind(sku).first();
            if(/^\\d{7}$/.test(String(row?.supplier_variant_sku||'')) &&
              Number.isSafeInteger(row?.observed_total_cents) &&
              row.observed_total_cents>0)
              availableSkus.push(sku);
          }
        }
        const checkoutEnabled=checked.every(Boolean);
        return json({checkoutEnabled,availableSkus,
          multiCheckoutEnabled:checkoutEnabled &&
            env.LIVE_MULTICART_CHECKOUT_ENABLED==='true' &&
            availableSkus.length>0},200,cors.headers);
      } catch {
        return json({checkoutEnabled:false},200,cors.headers);
      }
    }
    // Read-only launch report, private and no secret values. Does not charge.
    if(url.pathname==='/api/internal/launch-readiness' && request.method==='GET'){
      if(!(await authorizedLiveAdmin(request,env)))
        return json({error:'unauthorized'},401,cors.headers);
      try{
        const report=await getPrivateLaunchReadiness(env);
        return json(report,200,cors.headers);
      }catch(error){
        if(error instanceof CatalogError)
          return json({error:error.code},error.status,cors.headers);
        return json({error:'launch_readiness_unavailable'},503,cors.headers);
      }
    }
    // Admin-only read-only VAVI quote. No payment, DB writes or factory orders.
    if(url.pathname==='/api/internal/launch/shipping-check' && request.method==='POST'){
      if(!(await authorizedLiveAdmin(request,env)))
        return json({error:'unauthorized'},401,cors.headers);
      if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
        return json({error:'unsupported_media_type'},415,cors.headers);
      const textBody=await request.text();
      if(textBody.length>200)
        return json({error:'request_too_large'},413,cors.headers);
      try{
        const body=JSON.parse(textBody);
        const zipCode=normalizeZip(body?.zipCode);
        const options=await simulateVaviShipping(env,zipCode,
          [{sku:'salve-regina-preta-g',quantity:1}]);
        return json({mode:'diagnostic',zipCode,currency:'BRL',
          options:options.filter(x=>!/retirada|retire|pickup/i.test(x.name)),
          checkoutEnabled:false,createsPayment:false,createsVaviOrder:false},200,cors.headers);
      }catch(error){
        if(error instanceof CatalogError)
          return json({error:error.code},error.status,cors.headers);
        if(error instanceof SyntaxError)
          return json({error:'invalid_json'},400,cors.headers);
        return json({error:'vavi_shipping_unavailable'},503,cors.headers);
      }
    }
    // Recuperação ADMINISTRATIVA quando a notificação MP não chegou.
    // Consulta a transação diretamente no Mercado Pago, confere valor, moeda,
    // ambiente real e referência do pedido; nunca permite afirmar que pagou.
    if(url.pathname==='/api/internal/live-payments/reconcile' && request.method==='POST'){
      if(!(await authorizedLiveAdmin(request,env)))
        return json({error:'unauthorized'},401,cors.headers);
      if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
        return json({error:'unsupported_media_type'},415,cors.headers);
      const raw=await request.text();
      if(raw.length>150)return json({error:'request_too_large'},413,cors.headers);
      try{
        const data=JSON.parse(raw);
        const result=await reconcileLivePayment(env,data?.paymentId);
        return json(result,200,cors.headers);
      }catch(error){
        if(error instanceof CatalogError)
          return json({error:error.code,message:error.message},error.status,cors.headers);
        if(error instanceof SyntaxError)
          return json({error:'invalid_json'},400,cors.headers);
        return json({error:'reconciliation_unavailable'},503,cors.headers);
      }
    }
    // Administrative fulfillment: authenticated only; addresses are decrypted on
    // demand for a verified PAID production order, not from browser callbacks.
    if ((url.pathname === '/api/internal/live-orders' ||
      (url.pathname.startsWith('/api/internal/live-orders/') &&
        /^ord_[a-f0-9]{32}$/.test(url.pathname.slice('/api/internal/live-orders/'.length)))) &&

      request.method === 'GET') {
      if (!(await authorizedLiveAdmin(request,env)))
        return json({error:'unauthorized'},401);
      try {
        const result=url.pathname === '/api/internal/live-orders'
          ? await listLivePaidOrders(env)
          : await getLivePaidDelivery(env,url.pathname.slice('/api/internal/live-orders/'.length));
        return json(result,200,cors.headers);
      } catch(error) {
        if(error instanceof CatalogError) return json({error:error.code},error.status);
        return json({error:'admin_orders_unavailable'},503);
      }
    }
    // Idempotent manual fulfillment bookkeeping; NEVER creates a VAVI order.
    // Only a confirmed paid live order can be registered with a supplier ID.
    const fulfillmentMatch=url.pathname.match(
      /^\/api\/internal\/live-orders\/(ord_[a-f0-9]{32})\/fulfillment$/);
    if(fulfillmentMatch && request.method==='POST'){
      if(!(await authorizedLiveAdmin(request,env)))
        return json({error:'unauthorized'},401,cors.headers);
      if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
        return json({error:'unsupported_media_type'},415,cors.headers);
      const raw=await request.text();
      if(raw.length>350)return json({error:'request_too_large'},413,cors.headers);
      try{
        const data=JSON.parse(raw);
        const result=await registerManualVaviOrder(env,fulfillmentMatch[1],data?.vaviOrderId);
        return json(result,200,cors.headers);
      }catch(error){
        if(error instanceof CatalogError)return json({error:error.code},error.status,cors.headers);
        if(error instanceof SyntaxError)return json({error:'invalid_json'},400,cors.headers);
        return json({error:'fulfillment_unavailable'},503,cors.headers);
      }
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
    // Independent PROD endpoint: accepts no sandbox key and never pays test orders.
    if (url.pathname === '/api/payments/live-webhook' && request.method === 'POST') {
      try {
        const outcome=await processLivePaymentWebhook({request,env});
        // Responder ao MP apenas após pagamento e outbox persistidos.
        // A fila agendada recupera pendências se a execução assíncrona falhar.
        if(outcome.vaviQueued===true && typeof ctx?.waitUntil==='function')
          ctx.waitUntil(dispatchVaviDraft(env,outcome.orderId));
        return json({ok:true,processed:outcome.processed!==false},200);
      } catch(error) {
        if(error instanceof CatalogError)
          return json({error:error.code},error.status);
        console.error('Live webhook unavailable:',error?.name||'unknown');
        return json({error:'webhook_processing_failed'},503);
      }
    }
    // Eventos assinados da VAVI: rascunho convertido, falha e rastreio.
    // Secret específico do fornecedor; nunca compartilhar com Mercado Pago.
    if(url.pathname==='/api/webhooks/vavi' && request.method==='POST'){
      try{
        const outcome=await processVaviWebhook({request,env});
        return json(outcome,200);
      }catch(error){
        if(error instanceof CatalogError)
          return json({error:error.code},error.status);
        return json({error:'vavi_webhook_unavailable'},503);
      }
    }
    // Mercado Pago: verify HMAC, fetch the payment independently and
    // record an approved order idempotently. Disabled until operator
    // provisions the secret and explicitly enables webhook processing.
    if (url.pathname === '/api/payments/webhook' && request.method === 'POST') {
      try {
        const result=new URL(request.url).searchParams.get('type')==='order'
          ? await processOrdersWebhook({request,env})
          : await processPaymentWebhook({request,env});
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
    // Public, CEP-only freight estimate for one registered physical item.
    // A real shipping quote does not approve the product or enable payments.
    if (url.pathname === '/api/shipping/preview' && request.method === 'POST') {
      const origin=request.headers.get('Origin');
      const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim());
      if(!origin || !allowed.includes(origin))
        return json({error:'origin_not_allowed'},403);
      if (!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
        return json({error:'unsupported_media_type'},415,cors.headers);
      const textBody=await request.text();
      if(textBody.length>200)return json({error:'request_too_large'},413,cors.headers);
      try {
        const body=JSON.parse(textBody);
        const zipCode=normalizeZip(body?.zipCode);
        const sku=body?.sku||'salve-regina-preta-g';
        if(!DIRECT_CHECKOUT_SKUS.includes(sku))
          throw new CatalogError('invalid_sku','Produto inválido.',422);
        // A calculadora é independente da liberação da VENDA. Para peças
        // adicionais exigimos SKU interno e preço conhecido no D1, mas não
        // alteramos os indicadores de produto aprovado / disponível.
        // A API logística ainda exige metadados reais completos por variante.
        if(!Object.hasOwn(SALVE_REGINA_VARIANTS,sku)){
          const registered=env.DB?.prepare && await loadVariant(env.DB,sku);
          if(!registered ||
             !approvedDirectVariant(sku,registered.price_cents))
            throw new CatalogError('unavailable_product','Produto ainda sem cadastro completo.',409);
        }
        const diagnostic=body?.diagnose===true?{}:null;
        let provisional=false;
        let options;
        try {
          options=await simulateVaviShipping(env,zipCode,
            [{sku,quantity:1}],diagnostic);
        }catch(error){
          // A simulação sem UUID usa medidas publicadas e custo registrado
          // no banco. O lojista assume eventual diferença de frete na expedição.
          if(!(error instanceof CatalogError) ||
             error.code!=='shipping_product_unverified' ||
             !canQuotePublishedPackage(sku) || !env.DB?.prepare)
            throw error;
          let observed;
          try{
            observed=await env.DB.prepare(
              'SELECT observed_total_cents FROM supplier_variant_cost_observations '+
              'WHERE internal_sku=? AND freight_config_verified=0 LIMIT 1'
            ).bind(sku).first();
          }catch{throw error;}
          if(!Number.isSafeInteger(observed?.observed_total_cents))
            throw error;
          options=await simulateVaviShippingProvisional(env,zipCode,sku,
            observed.observed_total_cents,diagnostic);
          provisional=true;
        }
        // Factory pickup is not a shipping option to the buyer's CEP.
        const delivery=options.filter(x=>!(/retirada|retire|pickup/i.test(x.name)));
        return json({mode:'preview',sku,zipCode,
          currency:'BRL',options:delivery,checkoutEnabled:false,provisional,
          ...(diagnostic?{diagnostic}:{})},200,cors.headers);
      }catch(error) {
        if(error instanceof CatalogError)
          return json({error:error.code},error.status,cors.headers);
        if(error instanceof SyntaxError)return json({error:'invalid_json'},400,cors.headers);
        return json({error:'shipping_provider_unavailable'},503,cors.headers);
      }
    }
    // Cotação orientativa para 1–30 unidades, em até 15 linhas:
    // medidas de cada item vêm da VAVI e o custo vem do banco PRIVADO.
    // Não informa nem inventa dimensões da caixa final; não habilita cobrança.
    if(url.pathname==='/api/shipping/cart-preview' && request.method==='POST'){
      const origin=request.headers.get('Origin');
      const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim());
      if(!origin || !allowed.includes(origin))
        return json({error:'origin_not_allowed'},403,cors.headers);
      if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
        return json({error:'unsupported_media_type'},415,cors.headers);
      const textBody=await request.text();
      if(textBody.length>2000)return json({error:'request_too_large'},413,cors.headers);
      if(!env.DB?.prepare)return json({error:'database_not_configured'},503,cors.headers);
      try{
        const body=JSON.parse(textBody);
        const zipCode=normalizeZip(body.zipCode);
        const items=normalizeCart(body);
        const resolved=[];
        for(const line of items){
          if(!DIRECT_CHECKOUT_SKUS.includes(line.sku))
            throw new CatalogError('invalid_sku','Produto inválido para o frete.',422);
          const variant=await loadVariant(env.DB,line.sku);
          if(!variant || !approvedDirectVariant(line.sku,variant.price_cents))
            throw new CatalogError('unavailable_product','Item sem cadastro válido.',409);
          const row=await env.DB.prepare(
            'SELECT supplier_variant_sku,observed_total_cents '+
            'FROM supplier_variant_cost_observations WHERE internal_sku=? LIMIT 1'
          ).bind(line.sku).first();
          if(!row || !Number.isSafeInteger(row.observed_total_cents))
            throw new CatalogError('shipping_product_unverified','Item sem ficha logística.',409);
          resolved.push({sku:line.sku,quantity:line.quantity,
            supplierSku:row.supplier_variant_sku,unitCostCents:row.observed_total_cents});
        }
        const options=await simulateVaviShippingCartProvisional(env,zipCode,resolved);
        const delivery=options.filter(x=>!/retirada|retire|pickup/i.test(x.name));
        if(!delivery.length)
          throw new CatalogError('shipping_provider_unavailable','Frete indisponível.',503);
        return json({mode:'preview',zipCode,items,currency:'BRL',
          options:delivery,provisional:true,packageConfirmed:false,
          checkoutEnabled:false},200,cors.headers);
      }catch(error){
        if(error instanceof CatalogError)return json({error:error.code},error.status,cors.headers);
        if(error instanceof SyntaxError)return json({error:'invalid_json'},400,cors.headers);
        console.error('Multi-item shipping preview error:',error?.name||'unknown');
        return json({error:'shipping_provider_unavailable'},503,cors.headers);
      }
    }
    if (!env.DB) return json({error:'database_not_configured'},503,cors.headers);
    try {
      if (url.pathname === '/api/checkout/live' && request.method === 'POST') {
        if (!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
          return json({error:'unsupported_media_type'},415,cors.headers);
        if (!liveCheckoutReady(env))
          return json({error:'live_checkout_disabled'},503,cors.headers);
        const bodyText=await request.text();
        if (bodyText.length>12000)
          return json({error:'request_too_large'},413,cors.headers);
        let body;
        try {body=JSON.parse(bodyText)}
        catch {return json({error:'invalid_json'},400,cors.headers)}
        const payment=await createCheckoutLive(env,body);
        return json(payment,201,cors.headers);
      }
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
          return json({error:'checkout_unauthorized'},401,cors.headers);
        }
        const bodyText=await request.text();
        if(bodyText.length>12000)return json({error:'request_too_large'},413,cors.headers);
        let body;
        try {body=JSON.parse(bodyText);}
        catch{return json({error:'invalid_json'},400,cors.headers);}
        const result=await createCheckoutTest(env,body);
        // A resposta 201 também precisa de CORS: sem isso Safari exibe
        // "Load failed" embora a preferência tenha sido salva no D1.
        return json(result,201,cors.headers);
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
  },
  // Executa uma pequena fila com recuperação para pagamentos já confirmados.
  // Não cria rascunhos nem ordens enquanto o operador não ativar o recurso.
  async scheduled(_event,env,ctx) {
    if(typeof ctx?.waitUntil==='function')
      ctx.waitUntil(processPendingPaidVaviDrafts(env));
    else
      await processPendingPaidVaviDrafts(env);
  }
};
