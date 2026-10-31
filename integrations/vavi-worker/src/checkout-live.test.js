import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutLive,liveCheckoutReady} from './checkout-live.js';
import {processLivePaymentWebhook} from './live-payment-webhook.js';
import {authorizedLiveAdmin} from './live-order-admin.js';
import worker from './index.js';
import {webhookManifest} from './payment-verification.js';

const flags={
  LIVE_CHECKOUT_ENABLED:'true',LIVE_PRODUCT_APPROVED:'true',LIVE_POLICY_APPROVED:'true',
  LIVE_WEBHOOK_ENABLED:'true',DELIVERY_PERSISTENCE_ENABLED:'true',
  MERCADOPAGO_LIVE_ACCESS_TOKEN:'APP_USR_FAKE_LIVE_TOKEN',
  MERCADOPAGO_LIVE_WEBHOOK_SECRET:'FAKE-LIVE-SECRET',
  SHOP_ADMIN_API_KEY:'x'.repeat(40),
  DELIVERY_ENCRYPTION_KEY_B64:'placeholder-key',
  VAVI_CLIENT_ID:'fake',VAVI_CLIENT_SECRET:'fake',
  VAVI_SHIPPING_PRODUCTS_JSON:'{}'
};
const buyer={name:'Teste de pagamento',email:'teste@example.com',
  phone:'11999990000',taxId:'12345678909',zipCode:'13218752',
  street:'Rua Exemplo',number:'10',neighborhood:'Centro',
  city:'Jundiaí',state:'SP'};
const payload={items:[{sku:'salve-regina-preta-g',quantity:1}],
  zipCode:'13218752',shippingOptionId:'carrier-1',buyer};
const enabled={...flags,DB:{}};
const disabled={...enabled,LIVE_CHECKOUT_ENABLED:'false'};
const variant={sku:'salve-regina-preta-g',label:'Preta G',name:'Camiseta Salve Regina',
  product_enabled:1,product_verified:1,available:1,price_cents:10990};
const quote=[{id:'carrier-1',name:'Transportadora',shippingCost:15.54,
  isActive:true,deliveryTime:5}];

test('checkout permanece inativo, mesmo que o navegador solicite habilitação',async()=>{
  assert.equal(liveCheckoutReady(disabled),false);
  await assert.rejects(
    ()=>createCheckoutLive(disabled,{...payload,LIVE_CHECKOUT_ENABLED:'true'}),
    {code:'live_checkout_disabled'});
  const req=new Request('https://example.test/api/checkout/live',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)});
  const res=await worker.fetch(req,disabled);
  assert.equal(res.status,503);
  assert.equal((await res.json()).error,'live_checkout_disabled');
});

test('token test nunca é suficiente para liberar checkout real',()=>{
  const env={...enabled,MERCADOPAGO_LIVE_ACCESS_TOKEN:null,
    MERCADOPAGO_TEST_ACCESS_TOKEN:'TEST-CRED'};
  assert.equal(liveCheckoutReady(env),false);
});

test('checkout real: servidor calcula total e armazena entrega antes de criar preferência',async()=>{
  const seq=[];
  const db={prepare(sql){return {bind(){return {
    run:async()=>{seq.push(sql.includes("SET payment_environment='live'")?'mode':'awaiting');
      return {meta:{changes:1}};}
  };}}}};
  const result=await createCheckoutLive({...enabled,DB:db},
    {...payload,subtotalCents:1,freightCents:1,shippingCost:1}, {
      loadVariant:async()=>variant,
      simulateShipping:async()=>quote,
      encryptDelivery:async()=>{seq.push('encrypt');return {orderId:'x',encryptedPayload:'fake'};},
      insertDraftOrder:async()=>{seq.push('draft');},
      storeEncryptedDelivery:async()=>{seq.push('address');},
      createPreference:async input=>{
        seq.push('preference');
        assert.equal(input.shippingCents,1554);
        assert.equal(input.order.totalCents,12544);
        assert.equal(input.accessToken,flags.MERCADOPAGO_LIVE_ACCESS_TOKEN);
        assert.ok(input.notificationUrl.endsWith('/api/payments/live-webhook'));
        return {preferenceId:'pref_live',checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
      }
    });
  assert.equal(result.mode,'live');
  assert.equal(result.totalCents,12544);
  assert.deepEqual(seq,['encrypt','draft','mode','address','preference','awaiting']);
});

test('sem persistência protegida do endereço não se cria pagamento',async()=>{
  let called=false;
  const db={prepare(){return {bind(){return {run:async()=>({meta:{changes:1}})};}}}};
  await assert.rejects(()=>createCheckoutLive({...enabled,DB:db},payload,{
    loadVariant:async()=>variant,
    simulateShipping:async()=>quote,
    encryptDelivery:async()=>({encryptedPayload:'fake'}),
    insertDraftOrder:async()=>{},
    storeEncryptedDelivery:async()=>{throw Error('failed storage');},
    createPreference:async()=>{called=true;return {};}
  }),/failed storage/);
  assert.equal(called,false);
});

test('endereço e CEP diferentes impedem cotação e pagamento',async()=>{
  await assert.rejects(()=>createCheckoutLive(enabled,{
    ...payload,buyer:{...buyer,zipCode:'01001000'}
  }),{code:'delivery_zip_mismatch'});
});

test('webhook de produção rejeita pagamento de teste ainda que HMAC seja válido',async()=>{
  const dataId='1234',requestId='req123';
  const ts=String(Date.now());
  const key=await crypto.subtle.importKey('raw',
    new TextEncoder().encode(flags.MERCADOPAGO_LIVE_WEBHOOK_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode(webhookManifest({dataId,requestId,timestamp:ts})));
  const mac=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const request=new Request('https://example.test/api/payments/live-webhook?type=payment&data.id=1234',{
    method:'POST',headers:{'x-signature':'ts='+ts+',v1='+mac,'x-request-id':requestId}
  });
  let dbCalls=0;
  const env={...enabled,DB:{prepare(){dbCalls++;throw Error('Should not touch D1')}}};
  await assert.rejects(()=>processLivePaymentWebhook({request,env,
    fetchImpl:async()=>({ok:true,json:async()=>({
      id:1234,live_mode:false,status:'approved',
      external_reference:'ord_'+'a'.repeat(32)
    })})}),{code:'payment_mismatch'});
  assert.equal(dbCalls,0);
});

test('admin só aceita segredo privado e não oferece dados de clientes sem ele',async()=>{
  assert.equal(await authorizedLiveAdmin(new Request('https://api.test/'),enabled),false);
  assert.equal(await authorizedLiveAdmin(new Request('https://api.test/',{
    headers:{Authorization:'Bearer '+'x'.repeat(40)}}),enabled),true);
});


test('navegador pode fazer preflight do painel sem acessar pedidos sem autorização',async()=>{
  const origin='https://www.douglasassumpcao.com.br';
  const env={...disabled,ALLOWED_ORIGINS:origin};
  for(const pathname of ['/api/internal/live-orders','/api/internal/live-orders/ord_'+'a'.repeat(32)]){
    const preflight=await worker.fetch(new Request('https://example.test'+pathname,{
      method:'OPTIONS',headers:{Origin:origin,
        'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'Authorization'}
    }),env);
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
    assert.match(preflight.headers.get('Access-Control-Allow-Headers')||'',/Authorization/);
  }
  const denied=await worker.fetch(new Request('https://example.test/api/internal/live-orders'),env);
  assert.equal(denied.status,401);
});
