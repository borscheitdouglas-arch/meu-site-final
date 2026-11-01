import test from 'node:test';
import assert from 'node:assert/strict';
import {createTestPreference} from './payment-preference-client.js';
const base={order:{id:'ord_0123456789abcdef0123456789abcdef',status:'draft',totalCents:11500},
  lines:[{sku:'camisa-g',name:'Camiseta Salve Regina',quantity:1,unitPriceCents:10000}],
  shippingCents:1500,accessToken:'TEST-TOKEN',siteBaseUrl:'https://www.douglasassumpcao.com.br',
  notificationUrl:'https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/webhook'};
test('cliente prepara preferência de teste com valor gerado no servidor',async()=>{
  let called=false;
  const result=await createTestPreference({...base,fetchImpl:async(url,options)=>{
    called=true;
    assert.equal(url,'https://api.mercadopago.com/checkout/preferences');
    assert.equal(options.headers.Authorization,'Bearer TEST-TOKEN');
    assert.equal(options.headers['X-Idempotency-Key'],base.order.id);
    const body=JSON.parse(options.body);
    assert.equal(body.items.length,1);
    assert.equal(body.items[0].unit_price,100);
    assert.equal(body.shipments.cost,15);
    assert.equal(body.shipments.mode,'not_specified');
    assert.equal(body.external_reference,base.order.id);
    return {ok:true,json:async()=>({id:'pref_test_1',
      init_point:'https://www.mercadopago.com.br/checkout/start?pref_id=pref_test_1'})};
  }});
  assert.equal(called,true);
  assert.equal(result.preferenceId,'pref_test_1');
});
test('sem total correto não chama o Mercado Pago',async()=>{
  await assert.rejects(()=>createTestPreference({...base,order:{...base.order,totalCents:1},
    fetchImpl:()=>{throw Error('must not call')}}),{code:'checkout_total_mismatch'});
});
test('sem credencial não cria preferência',async()=>{
  await assert.rejects(()=>createTestPreference({...base,accessToken:''}),
    {code:'checkout_not_ready'});
});
test('erro do provedor mantém compra bloqueada',async()=>{
  await assert.rejects(()=>createTestPreference({...base,
    fetchImpl:async()=>({ok:false,status:401})}),{code:'payment_provider_unavailable'});
});
