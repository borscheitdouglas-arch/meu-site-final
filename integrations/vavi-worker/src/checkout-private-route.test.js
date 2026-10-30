import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
const base='https://example.test/api/checkout/test';
const secret='t'.repeat(48);
const env={DB:{},CHECKOUT_TEST_ENABLED:'true',WEBHOOK_PROCESSING_ENABLED:'true',
  DELIVERY_PERSISTENCE_ENABLED:'true',MERCADOPAGO_WEBHOOK_SECRET:'mock',
  CHECKOUT_TEST_API_KEY:secret};
const req=(authorization,body='{}')=>new Request(base,{
  method:'POST',headers:{'Content-Type':'application/json',
    ...(authorization?{'Authorization':authorization}:{})},body
});
test('nunca processa checkout quando flag está desligada',async()=>{
  const result=await worker.fetch(req('Bearer '+secret),{...env,CHECKOUT_TEST_ENABLED:'false'});
  assert.equal(result.status,503);
});
test('rejeita chamadas anônimas e token incorreto antes de gravar pedido',async()=>{
  for(const auth of [null,'Bearer '+'w'.repeat(48),'Bearer short']){
    const result=await worker.fetch(req(auth),env);
    assert.equal(result.status,401);
    assert.equal((await result.json()).error,'checkout_unauthorized');
  }
});
test('segredo aceito ainda valida JSON e nunca expõe sua chave',async()=>{
  const result=await worker.fetch(req('Bearer '+secret,'{'),env);
  assert.equal(result.status,400);
  const data=await result.text();
  assert.equal(data.includes(secret),false);
});

test('sem chave privada configurada a operação sempre falha de forma segura',async()=>{
  const result=await worker.fetch(req('Bearer '+secret),{
    ...env,CHECKOUT_TEST_API_KEY:undefined
  });
  assert.equal(result.status,503);
  assert.equal((await result.json()).error,'checkout_not_ready');
});
