import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVaviIntegrationOrder} from './vavi-order-contract.js';

const order={id:'ord_0123456789abcdef0123456789abcdef',status:'paid',
  mpPaymentId:'123456789',subtotalCents:10990,shippingCents:1554,
  totalCents:12544,destinationZip:'13218752'};
const buyer={name:'Comprador Teste',email:'teste@example.com',
  phone:'11999990000',taxId:'12345678909',zipCode:'13218752',
  street:'Rua Exemplo',number:'12',complement:'',neighborhood:'Centro',
  city:'Jundiaí',state:'SP'};
const items=[{name:'Camiseta Salve Regina preta G',sku:'vavi-demo',
  unitPriceCents:10990,quantity:1}];

test('pedido confirmado gera contrato VAVI com frete e total em BRL',()=>{
  const p=buildVaviIntegrationOrder({order,buyer,items});
  assert.equal(p.code,order.id);
  assert.equal(p.buyer.city,'Jundiaí');
  assert.equal(p.items[0].unitPrice,109.90);
  assert.equal(p.freightAmount,15.54);
  assert.equal(p.paidAmount,125.44);
});
test('não gera rascunho sem pagamento comprovado',()=>{
  assert.throws(()=>buildVaviIntegrationOrder({
    order:{...order,status:'awaiting_payment'},buyer,items
  }),{code:'vavi_unverified_payment'});
  assert.throws(()=>buildVaviIntegrationOrder({
    order:{...order,mpPaymentId:''},buyer,items
  }),{code:'vavi_unverified_payment'});
});
test('bloqueia CEP, total, nome e endereço inconsistentes',()=>{
  assert.throws(()=>buildVaviIntegrationOrder({
    order,buyer:{...buyer,zipCode:'01001000'},items
  }),{code:'vavi_total_mismatch'});
  assert.throws(()=>buildVaviIntegrationOrder({
    order:{...order,totalCents:12545},buyer,items
  }),{code:'vavi_unverified_payment'});
  assert.throws(()=>buildVaviIntegrationOrder({
    order,buyer:{...buyer,state:''},items
  }),{code:'vavi_invalid_buyer'});
  assert.throws(()=>buildVaviIntegrationOrder({
    order,buyer,items:[{...items[0],unitPriceCents:1}]
  }),{code:'vavi_total_mismatch'});
});
