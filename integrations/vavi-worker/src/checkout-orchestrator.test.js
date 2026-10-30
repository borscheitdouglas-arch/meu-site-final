import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutTest} from './checkout-orchestrator.js';
import worker from './index.js';

const env={CHECKOUT_TEST_ENABLED:'true',WEBHOOK_PROCESSING_ENABLED:'true',
  DELIVERY_PERSISTENCE_ENABLED:'true',MERCADOPAGO_TEST_ACCESS_TOKEN:'FAKE',
  VAVI_SHIPPING_PRODUCTS_JSON:'{}',DB:{}};
const body={items:[{sku:'salve-regina-preta-g',quantity:1}],
  zipCode:'13218-752',shippingOptionId:'carrier-1'};
const loadVariant=async()=>({
  sku:'salve-regina-preta-g',name:'Camiseta Salve Regina',
  label:'Preta - G',available:1,product_enabled:1,product_verified:1,
  price_cents:10990
});
test('sem todas as flags não chega a criar preferência',async()=>{
  await assert.rejects(()=>createCheckoutTest({...env,
    WEBHOOK_PROCESSING_ENABLED:'false'},body),{code:'checkout_not_ready'});
});
test('endereço não persistido bloqueia pagamento mesmo com frete válido',async()=>{
  await assert.rejects(()=>createCheckoutTest(env,body,{
    loadVariant,simulateShipping:async()=>[{id:'carrier-1',isActive:true,shippingCost:15.54}]
  }),{code:'delivery_not_persisted'});
});
test('orquestra uma unidade e usa frete VAVI, nunca o valor do navegador',async()=>{
  const calls=[];
  const db={prepare(sql){return {bind(...params){
    calls.push({sql,params});return {run:async()=>({meta:{changes:1}})};
  }}}};
  const result=await createCheckoutTest({...env,DB:db},
    {...body,shippingCost:0},{
      loadVariant,deliveryPersisted:{zipCode:'13218752'},
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
  assert.equal(calls.length,2);
});
test('rota pública permanece indisponível mesmo se flags forem forçadas',async()=>{
  const req=new Request('https://api.example.test/api/checkout/test',
    {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)});
  const r=await worker.fetch(req,env);
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'checkout_private_authorization_missing');
});
