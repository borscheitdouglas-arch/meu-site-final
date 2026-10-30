import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutTest} from './checkout-orchestrator.js';
import worker from './index.js';

const env={CHECKOUT_TEST_ENABLED:'true',WEBHOOK_PROCESSING_ENABLED:'true',
  DELIVERY_PERSISTENCE_ENABLED:'true',MERCADOPAGO_TEST_ACCESS_TOKEN:'FAKE',
  VAVI_SHIPPING_PRODUCTS_JSON:'{}',DELIVERY_ENCRYPTION_KEY_B64:'test-key',DB:{}};
const body={items:[{sku:'salve-regina-preta-g',quantity:1}],
  zipCode:'13218-752',shippingOptionId:'carrier-1',
  buyer:{name:'Comprador Teste',email:'teste@example.com',phone:'11999990000',
    taxId:'12345678909',zipCode:'13218752',street:'Rua Exemplo',number:'12',
    neighborhood:'Centro',city:'Jundiaí',state:'SP'}};
const loadVariant=async()=>({
  sku:'salve-regina-preta-g',name:'Camiseta Salve Regina',
  label:'Preta - G',available:1,product_enabled:1,product_verified:1,
  price_cents:10990
});
test('sem todas as flags não chega a criar preferência',async()=>{
  await assert.rejects(()=>createCheckoutTest({...env,
    WEBHOOK_PROCESSING_ENABLED:'false'},body),{code:'checkout_not_ready'});
});
test('endereço inválido bloqueia pagamento antes da cotação',async()=>{
  await assert.rejects(()=>createCheckoutTest(env,{...body,buyer:{...body.buyer,street:''}},{
    loadVariant,simulateShipping:async()=>[{id:'carrier-1',isActive:true,shippingCost:15.54}]
  }),{code:'invalid_delivery'});
});
test('orquestra uma unidade e usa frete VAVI, nunca o valor do navegador',async()=>{
  const calls=[];
  const db={prepare(sql){return {bind(...params){
    calls.push({sql,params});return {run:async()=>({meta:{changes:1}})};
  }}}};
  const result=await createCheckoutTest({...env,DB:db},
    {...body,shippingCost:0},{
      loadVariant,
      encryptBuyer:async(id,buyer)=>({orderId:id,zipCode:buyer.zipCode,encryptedPayload:'cipher',iv:'nonce'}),
      storeDelivery:async(_db,envelope)=>{calls.push({delivery:envelope});return {saved:true};},
      simulateShipping:async()=>[{id:'carrier-1',isActive:true,shippingCost:15.54}],
      insertDraft:async(_db,draft)=>{calls.push({draft});return {id:draft.id};},
      createPreference:async x=>{
        assert.equal(x.shippingCents,1554);
        assert.equal(x.order.totalCents,12544);
        return {preferenceId:'pref-demo',
          checkoutUrl:'https://www.mercadopago.com.br/checkout/start?test=1'};
      }
    });
  assert.equal(result.mode,'test');
  assert.equal(result.amountCents,12544);
  assert.match(result.orderId,/^ord_[0-9a-f]{32}$/);
  assert.equal(calls.length,3);
  assert.ok(calls.some(x=>x.delivery));
});
test('rota pública permanece indisponível mesmo se flags forem forçadas',async()=>{
  const req=new Request('https://api.example.test/api/checkout/test',
    {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)});
  const r=await worker.fetch(req,env);
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'checkout_not_ready');
});

test('se entrega não é persistida, preferência MP jamais é criada',async()=>{
 let preferenceCalled=false;
 await assert.rejects(()=>createCheckoutTest(env,body,{
   loadVariant,simulateShipping:async()=>[{id:'carrier-1',isActive:true,shippingCost:15.54}],
   encryptBuyer:async(id,buyer)=>({orderId:id,zipCode:buyer.zipCode,encryptedPayload:'x',iv:'y'}),
   insertDraft:async()=>{},
   storeDelivery:async()=>{throw Error('D1 fail');},
   createPreference:async()=>{preferenceCalled=true;return {};}
 }),/D1 fail/);
 assert.equal(preferenceCalled,false);
});
test('CEP do comprador diferente do CEP do frete é rejeitado',async()=>{
 await assert.rejects(()=>createCheckoutTest(env,{
   ...body,buyer:{...body.buyer,zipCode:'01001000'}
 }),{code:'delivery_zip_mismatch'});
});
