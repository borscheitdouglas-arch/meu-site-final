import {CatalogError} from './catalog.js';
import {liveCheckoutReady} from './checkout-live.js';

import {SALVE_REGINA_SKUS,SALVE_REGINA_VARIANTS,approvedVariant} from './salve-regina-variants.js';
import {shippingPayload} from './shipping.js';
import {vaviAutoDraftReady} from './vavi-auto-draft.js';
import {vaviWebhookReady} from './vavi-webhook.js';

const TRACKING_TABLES=['store_vavi_webhook_events','store_vavi_order_tracking'];

/**
 * Diagnóstico EXCLUSIVAMENTE administrativo. Não expõe segredos, não cobra,
 * não encomenda na VAVI e não liga nenhum recurso de produção.
 *
 * "Configuração presente" é diferente de "integração testada"; por isso as
 * validações operacionais permanecem explicitamente pendentes de conferência.
 */
export async function getPrivateLaunchReadiness(env,loadProduct,loadTables) {
  if(!env.DB?.prepare)
    throw new CatalogError('database_not_configured','Banco indisponível.',503);
  const query=loadProduct||(sku=>env.DB.prepare(`SELECT
    p.enabled,p.verified,v.available,v.price_cents
    FROM products p JOIN variants v ON v.product_id=p.id
    WHERE v.sku=? LIMIT 1`).bind(sku).first());
  const variants=await Promise.all(SALVE_REGINA_SKUS.map(async sku=>{
    const row=await query(sku);
    const priceMatches=Boolean(row && approvedVariant(sku,row.price_cents));
    let shippingReady=false;
    if(env.VAVI_CLIENT_ID && env.VAVI_CLIENT_SECRET){
      try{
        // Validação local de formato: não consulta CEP nem revela configuração privada.
        shippingPayload('01001000',[{sku,quantity:1}],env.VAVI_SHIPPING_PRODUCTS_JSON);
        shippingReady=true;
      }catch{ /* Configuração ausente/inválida permanece pendente. */ }
    }
    return {sku,size:SALVE_REGINA_VARIANTS[sku].size,
      expectedPriceCents:SALVE_REGINA_VARIANTS[sku].priceCents,
      catalogPresent:Boolean(row),priceMatches,
      productReady:priceMatches && row.enabled===1 && row.verified===1 && row.available===1,
      shippingConfigured:shippingReady};
  }));
  const productMatches=variants.every(v=>v.priceMatches);
  const productReady=variants.every(v=>v.productReady);
  const shippingConfigured=variants.every(v=>v.shippingConfigured);
  let trackingTablesPresent=false;
  try{
    const tables=loadTables ? await loadTables() :
      (await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all()).results;
    trackingTablesPresent=TRACKING_TABLES.every(name=>tables.some(t=>t.name===name));
  }catch{ /* Não confundir erro de consulta com migração concluída. */ }
  const paymentsConfigured=Boolean(env.MERCADOPAGO_LIVE_ACCESS_TOKEN &&
    env.MERCADOPAGO_LIVE_WEBHOOK_SECRET);
  const deliveryConfigured=Boolean(env.DELIVERY_ENCRYPTION_KEY_B64&&
    env.DELIVERY_PERSISTENCE_ENABLED==='true'&&
    typeof env.SHOP_ADMIN_API_KEY==='string'&&
    env.SHOP_ADMIN_API_KEY.length>=32);

  const checks=[
    {id:'catalog',label:'Cinco tamanhos — P a GG R$ 109,90; XG R$ 119,90',ok:productMatches,
      detail:productMatches?'Cinco SKUs e preços conferidos no banco':'Conferir os cinco SKUs e respectivos preços no banco'},
    {id:'product',label:'Todos os tamanhos aprovados e disponíveis',ok:productReady,
      detail:productReady?'Cinco tamanhos habilitados no catálogo':'Conferir arte, fornecedor, custo e estoque antes de habilitar'},
    {id:'shipping',label:'Configuração de frete dos cinco tamanhos',ok:shippingConfigured,
      detail:shippingConfigured?'Formato validado; cotação real de cada tamanho ainda precisa ser testada':'Conferir credenciais e pacote real de cada tamanho'},
    {id:'mercadopago',label:'Credenciais do Mercado Pago configuradas',ok:paymentsConfigured,
      detail:paymentsConfigured?'Configuradas; pagamento de ponta a ponta não validado':'Configurar token e assinatura do webhook'},
    {id:'delivery',label:'Armazenamento cifrado e painel administrativo',ok:deliveryConfigured,
      detail:deliveryConfigured?'Controles de acesso configurados':'Configurar chave de cifra e acesso administrativo'},
    {id:'fiscal',label:'Identificação comercial revisada e aprovada',ok:env.LIVE_POLICY_APPROVED==='true',
      detail:env.LIVE_POLICY_APPROVED==='true'?'Aprovação registrada':'Publicar nome empresarial e CNPJ do CCMEI e conferir as condições'},
    {id:'productApproval',label:'Liberação comercial do produto',ok:env.LIVE_PRODUCT_APPROVED==='true',
      detail:env.LIVE_PRODUCT_APPROVED==='true'?'Liberação registrada':'Confirmar produto efetivamente vendável na VAVI'},
    {id:'webhook',label:'Confirmação de pagamentos reais habilitada',ok:env.LIVE_WEBHOOK_ENABLED==='true',
      detail:env.LIVE_WEBHOOK_ENABLED==='true'?'Processamento habilitado; conferir testes':'Testar assinatura, pagamento e registro no banco antes de habilitar'},
    {id:'vaviAutoDraft',label:'Envio automático do rascunho pago à VAVI',
      ok:vaviAutoDraftReady(env),
      detail:vaviAutoDraftReady(env)
        ? 'Automação de rascunhos habilitada; vinculação, frete e pagamento da produção exigem conferência no portal'
        : 'Validar envio de pedidos pagos e os controles necessários antes de ativar'},
    {id:'vaviTrackingSchema',label:'Tabelas de eventos e rastreamento VAVI',
      ok:trackingTablesPresent,
      detail:trackingTablesPresent?'Tabelas encontradas; recepção de eventos ainda precisa ser homologada':
        'Conferir e aplicar a migração 0010_vavi_webhook_events.sql antes de ativar o acompanhamento'},
    {id:'vaviWebhook',label:'Recepção autenticada de eventos VAVI',
      ok:trackingTablesPresent && vaviWebhookReady(env),
      detail:trackingTablesPresent && vaviWebhookReady(env)?
        'Configuração habilitada; validar ping, assinatura e eventos reais':
        'Conferir tabelas, segredo de assinatura e liberação do webhook VAVI'},
    {id:'checkout',label:'Checkout de produção habilitado',ok:env.LIVE_CHECKOUT_ENABLED==='true',
      detail:env.LIVE_CHECKOUT_ENABLED==='true'?'Chave de liberação ligada':'Habilitar somente depois dos demais testes'}
  ].concat(variants.map(v=>({
    id:'variant-'+v.size.toLowerCase(),label:'Camiseta preta — tamanho '+v.size,
    ok:v.productReady && v.shippingConfigured,
    detail:[v.priceMatches?'SKU e preço corretos':'SKU ausente ou preço divergente',
      v.productReady?'produto aprovado':'produto ainda bloqueado',
      v.shippingConfigured?'configuração de frete presente':'configuração de frete pendente'].join('; ')
  })));
  const ready=Boolean(liveCheckoutReady(env)&&productReady);
  return {
    mode:'operator-read-only',
    checkoutEnabled:ready,
    checks,
    variants,
    fulfillment:{draftAutomationConfigured:vaviAutoDraftReady(env),
      productionRequiresOperator:true,customerNotifications:'manual'},
    outstanding:checks.filter(c=>!c.ok).map(c=>c.id),
    operationalValidations:[
      'Confirmar no CCMEI o nome empresarial e CNPJ publicados no site',
      'Conferir que a arte, SKU, tamanho, custo, embalagem e disponibilidade correspondem a um produto produzível pela VAVI',
      'Testar cotação real da VAVI para cada um dos cinco tamanhos e um CEP de entrega válido',
      'Simular o fluxo de pagamento e a conciliação por webhook sem cobrança acidental',
      'Confirmar quem conferirá rascunho, arte, variante, frete e pagamento da produção no portal VAVI e comunicará o rastreamento ao cliente'
    ],
    doesNotCharge:true,
    doesNotEnableCheckout:true
  };
}
