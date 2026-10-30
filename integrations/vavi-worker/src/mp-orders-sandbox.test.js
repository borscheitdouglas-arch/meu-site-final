import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOrdersCheckout,validateOrdersCheckoutResponse,
  createOrdersSandbox,validateOrdersPaymentStatus} from './mp-orders-sandbox.js';

const id='ord_0123456789abcdef0123456789abcdef';
const providerId='ORDTST01KS5AJ6HTK2HRQ3XJ3C2JCKP9';
const order={id,totalCents:13010,shippingCents:2020};
const items=[{sku:'salve-regina-preta-g',quantity:1,
  unitPriceCents:10990,totalCents:10990}];
const okResponse={id:providerId,status:'created',external_reference:id,
  checkout_url:'https://www.mercadopago.com.br/checkout/v1/redirect?order_id='+providerId};

test('Orders sandbox mantém total R$130,10 e exclui dados de entrega',()=>{
  const result=buildOrdersCheckout({order,items});
  assert.equal(result.type,'online');
  assert.equal(result.processing_mode,'manual');
  assert.equal(result.total_amount,'130.10');
  assert.deepEqual(result.items.map(x=>x.unit_price),['109.90','20.20']);
  assert.equal(JSON.stringify(result).includes('taxId'),false);
});
test('não aceita preços adulterados ou SKU diferente',()=>{
  assert.throws(()=>buildOrdersCheckout({
    order:{...order,totalCents:13011},items
  }),{code:'orders_invalid_total'});
  assert.throws(()=>buildOrdersCheckout({
    order,items:[{...items[0],sku:'other'}]
  }),{code:'orders_invalid_total'});
});
test('só aceita checkout HTTPS do Mercado Pago vinculado à order certa',()=>{
  assert.equal(validateOrdersCheckoutResponse(okResponse,id).providerOrderId,providerId);
  assert.throws(()=>validateOrdersCheckoutResponse({
    ...okResponse,checkout_url:'https://malicioso.example/checkout?order_id='+providerId
  },id),{code:'orders_invalid_response'});
  assert.throws(()=>validateOrdersCheckoutResponse({
    ...okResponse,checkout_url:okResponse.checkout_url.replace(providerId,'ORDTSTOTHER')
  },id),{code:'orders_invalid_response'});
});
test('criar Orders requer API 201 e chave idempotente do pedido',async()=>{
  let called=false;
  const data=await createOrdersSandbox({order,items,accessToken:'TEST',
    fetchImpl:async(url,options)=>{
      called=true;
      assert.equal(url,'https://api.mercadopago.com/v1/orders');
      assert.equal(options.headers['X-Idempotency-Key'],id);
      assert.equal(JSON.parse(options.body).total_amount,'130.10');
      return {status:201,json:async()=>okResponse};
    }});
  assert.equal(called,true);
  assert.equal(data.providerOrderId,providerId);
});
test('falha da API jamais é interpretada como sucesso',async()=>{
  await assert.rejects(()=>createOrdersSandbox({order,items,
    accessToken:'TEST',fetchImpl:async()=>({status:401})}),
    {code:'orders_provider_rejected'});
});
test('validação de status recusa created e valores incorretos',()=>{
  const result={id:providerId,external_reference:id,currency:'BRL',
    total_amount:'130.10',total_paid_amount:'130.10',
    status:'processed',status_detail:'accredited',
    transactions:{payments:[{status:'processed',status_detail:'accredited',
      paid_amount:'130.10'}]}};
  const dbOrder={id,total_cents:13010};
  assert.equal(validateOrdersPaymentStatus(result,dbOrder,providerId).status,
    'verified_test_only');
  assert.throws(()=>validateOrdersPaymentStatus({
    ...result,status:'created'
  },dbOrder,providerId),{code:'orders_not_approved'});
  assert.throws(()=>validateOrdersPaymentStatus({
    ...result,total_paid_amount:'0.00'
  },dbOrder,providerId),{code:'orders_not_approved'});
  assert.throws(()=>validateOrdersPaymentStatus({
    ...result,external_reference:'different'
  },dbOrder,providerId),{code:'orders_payment_mismatch'});
});
