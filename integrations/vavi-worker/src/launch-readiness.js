import {CatalogError} from './catalog.js';
import {liveCheckoutReady} from './checkout-live.js';

const SKU='salve-regina-preta-g';
const EXPECTED_PRICE_CENTS=10990;

/**
 * Diagnóstico EXCLUSIVAMENTE administrativo. Não expõe segredos, não cobra,
 * não encomenda na VAVI e não liga nenhum recurso de produção.
 *
 * "Configuração presente" é diferente de "integração testada"; por isso as
 * validações operacionais permanecem explicitamente pendentes de conferência.
 */
export async function getPrivateLaunchReadiness(env,loadProduct) {
  if(!env.DB?.prepare)
    throw new CatalogError('database_not_configured','Banco indisponível.',503);
  const query=loadProduct||(()=>env.DB.prepare(`SELECT
    p.enabled,p.verified,v.available,v.price_cents
    FROM products p JOIN variants v ON v.product_id=p.id
    WHERE v.sku=? LIMIT 1`).bind(SKU).first());
  const variant=await query();
  const productMatches=Boolean(variant &&
    variant.price_cents===EXPECTED_PRICE_CENTS);
  const productReady=productMatches &&
    variant.enabled===1 && variant.verified===1 && variant.available===1;
  const shippingConfigured=Boolean(env.VAVI_CLIENT_ID&&
    env.VAVI_CLIENT_SECRET&&env.VAVI_SHIPPING_PRODUCTS_JSON);
  const paymentsConfigured=Boolean(env.MERCADOPAGO_LIVE_ACCESS_TOKEN &&
    env.MERCADOPAGO_LIVE_WEBHOOK_SECRET);
  const deliveryConfigured=Boolean(env.DELIVERY_ENCRYPTION_KEY_B64&&
    env.DELIVERY_PERSISTENCE_ENABLED==='true'&&
    typeof env.SHOP_ADMIN_API_KEY==='string'&&
    env.SHOP_ADMIN_API_KEY.length>=32);

  const checks=[
    {id:'catalog',label:'Camiseta preta G — SKU e preço R$ 109,90',ok:productMatches,
      detail:productMatches?'Cadastro encontrado no banco':'Cadastrar e revisar a camiseta no banco'},
    {id:'product',label:'Produto aprovado e disponível',ok:productReady,
      detail:productReady?'Produto habilitado no catálogo':'Conferir arte, fornecedor, custo e estoque antes de habilitar'},
    {id:'shipping',label:'Credenciais e pacote da VAVI configurados',ok:shippingConfigured,
      detail:shippingConfigured?'Configurados; cotação real ainda precisa ser testada':'Configurar credenciais e dados reais da embalagem'},
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
      ok:env.VAVI_AUTO_DRAFT_ENABLED==='true' &&
        typeof env.VAVI_INTEGRATION_API_KEY==='string' &&
        env.VAVI_INTEGRATION_API_KEY.length>=20,
      detail:env.VAVI_AUTO_DRAFT_ENABLED==='true' &&
        typeof env.VAVI_INTEGRATION_API_KEY==='string' &&
        env.VAVI_INTEGRATION_API_KEY.length>=20
        ? 'Envio de rascunhos habilitado; vinculação da arte e pagamento VAVI continuam manuais'
        : 'Configurar chave de integração API própria, testar homologação e habilitar envio de rascunhos'},
    {id:'checkout',label:'Checkout de produção habilitado',ok:env.LIVE_CHECKOUT_ENABLED==='true',
      detail:env.LIVE_CHECKOUT_ENABLED==='true'?'Chave de liberação ligada':'Habilitar somente depois dos demais testes'}
  ];
  const ready=Boolean(liveCheckoutReady(env)&&productReady);
  return {
    mode:'operator-read-only',
    checkoutEnabled:ready,
    checks,
    outstanding:checks.filter(c=>!c.ok).map(c=>c.id),
    operationalValidations:[
      'Confirmar no CCMEI o nome empresarial e CNPJ publicados no site',
      'Conferir que a arte, SKU, tamanho, custo, embalagem e disponibilidade correspondem a um produto produzível pela VAVI',
      'Testar cotação real da VAVI e escolher um CEP de entrega válido',
      'Simular o fluxo de pagamento e a conciliação por webhook sem cobrança acidental',
      'Confirmar quem acompanhará o painel e registrará a produção manual de cada pedido pago'
    ],
    doesNotCharge:true,
    doesNotEnableCheckout:true
  };
}
