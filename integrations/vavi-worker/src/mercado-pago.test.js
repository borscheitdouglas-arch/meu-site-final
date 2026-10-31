import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreference,validatePreferenceResponse} from './mercado-pago.js';

const order = {
  lines:[{sku:'CAMISA-P',name:'Camiseta Salve Regina',unitPriceCents:9990,quantity:2}],
  shippingCents:1560,orderId:'ord_test_12345678',
  siteBaseUrl:'https://www.douglasassumpcao.com.br',
  notificationUrl:'https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/webhook'
};

test('preferência usa apenas preços do servidor e frete separado',()=>{
  const p=buildPreference(order);
  assert.equal(p.items[0].unit_price,99.90);
  assert.equal(p.items[1].unit_price,15.60);
  assert.equal(p.external_reference,order.orderId);
  assert.equal(p.items[0].quantity,2);
  assert.equal(p.back_urls.success,'https://www.douglasassumpcao.com.br/pages/resultado-pagamento.html?pagamento=sucesso');
});
test('frete ainda não confirmado impede gerar preferência',()=>{
  assert.throws(()=>buildPreference({...order,shippingCents:null}),
    {code:'checkout_invalid_order'});
});
test('pedido sem referência impede gerar preferência',()=>{
  assert.throws(()=>buildPreference({...order,orderId:''}),
    {code:'checkout_invalid_order'});
});
test('recusa URLs de retorno sem HTTPS',()=>{
  assert.throws(()=>buildPreference({...order,siteBaseUrl:'http://localhost:8787'}),
    {code:'checkout_invalid_configuration'});
});
test('só permite URL de checkout de domínio Mercado Pago seguro',()=>{
  assert.equal(validatePreferenceResponse({init_point:'https://www.mercadopago.com.br/checkout/start?pref_id=xyz'}),'https://www.mercadopago.com.br/checkout/start?pref_id=xyz');
  assert.throws(()=>validatePreferenceResponse({init_point:'https://mercadopago.com.br.evil.invalid/'}),
    {code:'payment_provider_unavailable'});
});
