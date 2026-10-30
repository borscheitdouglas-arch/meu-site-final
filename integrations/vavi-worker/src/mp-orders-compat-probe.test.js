import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const URL='https://api.example.test/api/internal/mp/orders-compat-1cd6b24b429f3d82a9e4d9e7';
test('compatibilidade Orders está fechada por padrão',async()=>{
  const result=await worker.fetch(new Request(URL,{method:'POST'}),{DB:{}});
  assert.equal(result.status,404);
});
test('compatibilidade Orders usa trava única de D1',async()=>{
  let n=0;
  const env={MP_ORDERS_COMPAT_PROBE:'true',
    MERCADOPAGO_TEST_ACCESS_TOKEN:'fake',
    DB:{prepare(){return {run:async()=>{n++;return {meta:{changes:0}}}}}}};
  const result=await worker.fetch(new Request(URL,{method:'POST'}),env);
  assert.equal(result.status,200);
  assert.equal((await result.json()).alreadyRan,true);
  assert.equal(n,1);
});
