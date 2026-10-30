import test from 'node:test';
import assert from 'node:assert/strict';
import {recordVerifiedPayment} from './payment-repository.js';

const orderId='ord_0123456789abcdef0123456789abcdef';
const verification={orderId,paymentId:'987654321',status:'paid'};
function mockDb({changes=1,status='paid',paymentId='987654321',throwWrite=false}={}) {
  const calls=[];
  return {calls,
    prepare(sql){return {bind(...params){calls.push({sql,params});return {sql,params}}}},
    async batch(statements) {
      assert.equal(statements.length,3);
      assert.match(statements[0].sql,/status='awaiting_payment'/);
      assert.match(statements[1].sql,/INSERT OR IGNORE/);
      if(throwWrite)throw Error('db unavailable');
      return [{meta:{changes}},{meta:{changes:1}},
        {results:[{id:orderId,status,mp_payment_id:paymentId}]}];
    }
  };
}
test('primeira confirmação persiste pagamento mas não envia à VAVI',async()=>{
  const db=mockDb();
  const result=await recordVerifiedPayment(db,verification,'evt_123');
  assert.equal(result.status,'paid');
  assert.equal(result.alreadyPaid,false);
  assert.equal(result.vaviOrderCreated,false);
  assert.equal(db.calls.length,3);
});
test('notificação repetida não altera pedido novamente',async()=>{
  const result=await recordVerifiedPayment(mockDb({changes:0}),verification,'evt_123');
  assert.equal(result.alreadyPaid,true);
});
test('pedido com pagamento conflitante deve falhar',async()=>{
  await assert.rejects(()=>recordVerifiedPayment(
    mockDb({changes:0,paymentId:'123'}),verification,'evt_123'),
    {code:'payment_order_conflict'});
});
test('não aceita status ou IDs inválidos',async()=>{
  for(const bad of [{...verification,status:'pending'},{...verification,paymentId:'abc'},
    {...verification,orderId:'bad'}]) {
    await assert.rejects(()=>recordVerifiedPayment(mockDb(),bad,'evt_123'),
      {code:'invalid_payment_confirmation'});
  }
  await assert.rejects(()=>recordVerifiedPayment(mockDb(),verification,''),
    {code:'invalid_payment_confirmation'});
});
test('falha de banco não é tratada como pagamento recebido',async()=>{
  await assert.rejects(()=>recordVerifiedPayment(
    mockDb({throwWrite:true}),verification,'evt_123'),{code:'payment_write_failed'});
});
