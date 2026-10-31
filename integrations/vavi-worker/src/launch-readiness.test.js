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
    VAVI_SHIPPING_PRODUCTS_JSON:'present',
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
