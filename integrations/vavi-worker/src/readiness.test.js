import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const url='https://worker.example.test/api/store/readiness';
test('diagnóstico confirma integração incompleta sem expor secrets',async()=>{
  const db={prepare(sql){assert.match(sql,/SELECT COUNT\(\*\)/);return {first:async()=>({n:0})}}};
  const env={DB:db,VAVI_CLIENT_ID:'SECRET_FAKE',VAVI_CLIENT_SECRET:'SECRET_FAKE',
    MERCADOPAGO_TEST_ACCESS_TOKEN:'SECRET_FAKE'};
  const res=await worker.fetch(new Request(url),env);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.mode,'preview');
  assert.equal(body.ready,false);
  assert.equal(body.checks.product,false);
  assert.equal(body.checks.freight,false);
  assert.equal(body.checks.payments,false);
  assert.equal(body.checks.webhook,false);
  assert.equal(JSON.stringify(body).includes('SECRET_FAKE'),false);
});
test('sem banco o diagnóstico falha de forma segura',async()=>{
  const res=await worker.fetch(new Request(url),{});
  assert.equal(res.status,503);
  assert.equal((await res.json()).ready,false);
});
