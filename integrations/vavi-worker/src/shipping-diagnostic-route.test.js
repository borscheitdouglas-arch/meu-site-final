import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const url='https://store.example.test/api/internal/vavi/shipping-check';
const key='x'.repeat(48);
const req=(body,auth)=>new Request(url,{method:'POST',headers:{
  'Content-Type':'application/json',...(auth?{Authorization:auth}:{})
},body:JSON.stringify(body)});
test('diagnóstico não é público, mesmo com configuração VAVI presente',async()=>{
  const env={VAVI_CLIENT_ID:'fake',VAVI_CLIENT_SECRET:'fake',
    VAVI_SHIPPING_PRODUCTS_JSON:'{}',CHECKOUT_TEST_API_KEY:key};
  for(const auth of [undefined,'Bearer incorrect']){
    const response=await worker.fetch(req({zipCode:'13218752'},auth),env);
    assert.equal(response.status,401);
    assert.equal((await response.json()).error,'unauthorized');
  }
});
test('diagnóstico exige CEP válido antes de chamar VAVI',async()=>{
  const response=await worker.fetch(req({zipCode:'x'},'Bearer '+key),{
    CHECKOUT_TEST_API_KEY:key
  });
  assert.equal(response.status,422);
  const data=await response.json();
  assert.equal(data.error,'invalid_zip');
});
test('sem credenciais VAVI retorna 503 e nunca tenta pagamento',async()=>{
  const response=await worker.fetch(req({zipCode:'13218752'},'Bearer '+key),{
    CHECKOUT_TEST_API_KEY:key
  });
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'shipping_not_configured');
});
