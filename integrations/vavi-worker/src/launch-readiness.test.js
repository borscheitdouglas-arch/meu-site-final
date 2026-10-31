import test from 'node:test';
import assert from 'node:assert/strict';
import {getPrivateLaunchReadiness} from './launch-readiness.js';
import worker from './index.js';

const sku={enabled:0,verified:0,available:0,price_cents:10990};
const key='a'.repeat(40);
function envBase(){
  return {DB:{prepare(){throw Error('should not query when unauthenticated')}},
    SHOP_ADMIN_API_KEY:key,
    ALLOWED_ORIGINS:'https://www.douglasassumpcao.com.br'};
}

test('não simula habilitação só por existirem credenciais técnicas',async()=>{
  const env={
    ...envBase(),
    VAVI_CLIENT_ID:'present',VAVI_CLIENT_SECRET:'present',
    VAVI_SHIPPING_PRODUCTS_JSON:shippingConfig(),
    MERCADOPAGO_LIVE_ACCESS_TOKEN:'present',
    MERCADOPAGO_LIVE_WEBHOOK_SECRET:'present',
    DELIVERY_ENCRYPTION_KEY_B64:'present',
    DELIVERY_PERSISTENCE_ENABLED:'true'
  };
  const report=await getPrivateLaunchReadiness(env,async()=>sku);
  assert.equal(report.checkoutEnabled,false);
  assert.equal(report.doesNotCharge,true);
  assert.equal(report.doesNotEnableCheckout,true);
  assert.equal(report.checks.find(x=>x.id==='shipping').ok,true);
  assert.equal(report.checks.find(x=>x.id==='product').ok,false);
  assert.equal(report.checks.find(x=>x.id==='fiscal').ok,false);
  assert.ok(report.outstanding.includes('checkout'));
  assert.ok(!JSON.stringify(report).includes(key));
});

test('preço divergente permanece bloqueado mesmo que o produto esteja ativo',async()=>{
  const env={...envBase()};
  const report=await getPrivateLaunchReadiness(env,
    async()=>({enabled:1,verified:1,available:1,price_cents:11000}));
  assert.equal(report.checks.find(x=>x.id==='catalog').ok,false);
  assert.equal(report.checkoutEnabled,false);
});

test('rota de diagnóstico exige chave e não retorna credenciais',async()=>{
  const url='https://api.example.test/api/internal/launch-readiness';
  const origin='https://www.douglasassumpcao.com.br';
  const noAuth=await worker.fetch(new Request(url,{method:'GET',headers:{Origin:origin}}),envBase());
  assert.equal(noAuth.status,401);
  assert.equal((await noAuth.json()).error,'unauthorized');
  const options=await worker.fetch(new Request(url,{method:'OPTIONS',headers:{
    Origin:origin,'Access-Control-Request-Method':'GET',
    'Access-Control-Request-Headers':'Authorization'
  }}),envBase());
  assert.equal(options.status,204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'),origin);
});

test('rotas do painel não podem ser acessadas por origem desconhecida',async()=>{
  const unauthorized=await worker.fetch(new Request(
    'https://api.example.test/api/internal/launch-readiness',{
      method:'GET',headers:{Origin:'https://foreign.example',
        Authorization:'Bearer '+key}
    }),envBase());
  assert.equal(unauthorized.status,403);
});

function readyEnv(){
  return {...envBase(),DB:{prepare(){throw Error('unexpected query')},batch(){}},
    LIVE_CHECKOUT_ENABLED:'true',LIVE_PRODUCT_APPROVED:'true',LIVE_POLICY_APPROVED:'true',
    LIVE_WEBHOOK_ENABLED:'true',DELIVERY_PERSISTENCE_ENABLED:'true',
    MERCADOPAGO_LIVE_ACCESS_TOKEN:'private-token',MERCADOPAGO_LIVE_WEBHOOK_SECRET:'private-webhook',
    DELIVERY_ENCRYPTION_KEY_B64:'private-encryption',VAVI_CLIENT_ID:'private-id',VAVI_CLIENT_SECRET:'private-secret',
    VAVI_SHIPPING_PRODUCTS_JSON:shippingConfig()};
}
function shippingConfig(){
  return JSON.stringify(Object.fromEntries(['p','m','g','gg','xg'].map(size=>[
    'salve-regina-preta-'+size,{id:'12345678-1234-1234-1234-123456789abc',sku:'test-'+size,
      amount:50,weight:.3,height:30,width:200,length:300}])));
}
const approved=async sku=>({enabled:1,verified:1,available:1,
  price_cents:sku.endsWith('-xg')?11990:10990});
const tables=async()=>[{name:'store_vavi_webhook_events'},{name:'store_vavi_order_tracking'}];

test('diagnóstico exige os cinco tamanhos, como o checkout público',async()=>{
  const seen=[];
  const report=await getPrivateLaunchReadiness(readyEnv(),async sku=>{
    seen.push(sku);return sku.endsWith('-g')?approved(sku):null;
  },tables);
  assert.equal(seen.length,5);
  assert.equal(report.variants.length,5);
  assert.equal(report.checkoutEnabled,false);
  assert.equal(report.checks.find(c=>c.id==='catalog').ok,false);
});

test('XG indisponível ou com preço de G impede indicar checkout habilitado',async()=>{
  for(const change of [{available:0},{price_cents:10990}]){
    const report=await getPrivateLaunchReadiness(readyEnv(),async sku=>({
      ...await approved(sku),...(sku.endsWith('-xg')?change:{})
    }),tables);
    assert.equal(report.checkoutEnabled,false);
  }
});

test('frete incompleto não passa como configuração de cinco tamanhos',async()=>{
  const env=readyEnv();const config=JSON.parse(env.VAVI_SHIPPING_PRODUCTS_JSON);
  delete config['salve-regina-preta-xg'];env.VAVI_SHIPPING_PRODUCTS_JSON=JSON.stringify(config);
  const report=await getPrivateLaunchReadiness(env,approved,tables);
  assert.equal(report.checks.find(c=>c.id==='shipping').ok,false);
  assert.equal(report.variants.find(v=>v.size==='XG').shippingConfigured,false);
  assert.equal(JSON.stringify(report).includes('12345678-1234'),false);
});

test('flag de rascunho sozinha não indica automação configurada',async()=>{
  const report=await getPrivateLaunchReadiness({...readyEnv(),VAVI_AUTO_DRAFT_ENABLED:'true',
    LIVE_PRODUCT_APPROVED:'false'},approved,tables);
  assert.equal(report.checks.find(c=>c.id==='vaviAutoDraft').ok,false);
});

test('rastreamento exige tabelas e configuração; produção permanece manual',async()=>{
  const env={...readyEnv(),VAVI_AUTO_DRAFT_ENABLED:'true',VAVI_WEBHOOK_ENABLED:'true',
    VAVI_WEBHOOK_SECRET:'whsec_testonly12345'};
  const missing=await getPrivateLaunchReadiness(env,approved,async()=>[]);
  assert.equal(missing.checks.find(c=>c.id==='vaviWebhook').ok,false);
  const report=await getPrivateLaunchReadiness(env,approved,tables);
  assert.equal(report.checkoutEnabled,true);
  assert.equal(report.checks.find(c=>c.id==='vaviWebhook').ok,true);
  assert.equal(report.fulfillment.productionRequiresOperator,true);
  assert.equal(report.fulfillment.customerNotifications,'manual');
  for(const secret of ['private-token','private-webhook','private-encryption',env.VAVI_WEBHOOK_SECRET,key])
    assert.ok(!JSON.stringify(report).includes(secret));
});
