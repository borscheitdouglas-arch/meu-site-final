import test from 'node:test';
import assert from 'node:assert/strict';
import {nextOrderState,validateConfirmedPayment,validateDraftTotals} from './order-state.js';

const order={id:'ord_xyz_1234',total_cents:12550};
const payment={id:456,status:'approved',currency_id:'BRL',
  external_reference:'ord_xyz_1234',transaction_amount:125.50};

test('pedido não pode ir direto de rascunho para pago',()=>{
  assert.throws(()=>nextOrderState('draft','paid'),{code:'invalid_order_transition'});
  assert.equal(nextOrderState('draft','awaiting_payment'),'awaiting_payment');
});
test('pagamento validado precisa valor BRL, referência e status exatos',()=>{
  assert.equal(validateConfirmedPayment(order,payment).status,'paid');
  for(const bad of [
    {...payment,status:'pending'},
    {...payment,currency_id:'USD'},
    {...payment,transaction_amount:120},
    {...payment,external_reference:'other'}
  ]) assert.throws(()=>validateConfirmedPayment(order,bad),
    {code:'payment_mismatch'});
});
test('total de carrinho precisa ser calculado e conferido no backend',()=>{
  const data={items:[{quantity:2,unitPriceCents:5000}],
    subtotalCents:10000,shippingCents:1550,totalCents:11550};
  assert.equal(validateDraftTotals(data),true);
  assert.throws(()=>validateDraftTotals({...data,totalCents:11551}),
    {code:'invalid_order_total'});
  assert.throws(()=>validateDraftTotals({...data,subtotalCents:10001,totalCents:11551}),
    {code:'invalid_order_total'});
});
