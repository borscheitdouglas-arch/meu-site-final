import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const base='https://douglas-loja-api.example.test';
const request=(path,headers={})=>new Request(base+path,{method:'POST',headers});
test('webhook sem assinatura configurada retorna 503 e nunca confirma pagamento',async()=>{
  const res=await worker.fetch(request('/api/payments/webhook?data.id=123'),{});
  assert.equal(res.status,503);
  assert.deepEqual(await res.json(),{error:'webhook_not_configured'});
});
test('webhook sem identificador é recusado',async()=>{
  const res=await worker.fetch(request('/api/payments/webhook'),
    {MERCADOPAGO_WEBHOOK_SECRET:'test'});
  assert.equal(res.status,400);
});
test('webhook com assinatura inválida é recusado',async()=>{
  const res=await worker.fetch(request('/api/payments/webhook?data.id=123',
    {'x-signature':'ts=1793350000,v1=bad','x-request-id':'req-1'}),
    {MERCADOPAGO_WEBHOOK_SECRET:'test'});
  assert.equal(res.status,401);
});
