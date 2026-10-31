import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const origin='https://www.douglasassumpcao.com.br';
const url='https://api.example.test/api/internal/launch/shipping-check';
const env={SHOP_ADMIN_API_KEY:'a'.repeat(40),ALLOWED_ORIGINS:origin};

test('teste VAVI exige autenticação antes de consultar transporte',async()=>{
  const request=new Request(url,{method:'POST',headers:{
    Origin:origin,'Content-Type':'application/json'
  },body:JSON.stringify({zipCode:'13214610'})});
  const response=await worker.fetch(request,env);
  assert.equal(response.status,401);
  assert.equal((await response.json()).error,'unauthorized');
});

test('teste de frete só aceita origem autorizada',async()=>{
  const response=await worker.fetch(new Request(url,{
    method:'POST',headers:{
      Origin:'https://invalid.example',Authorization:'Bearer '+'a'.repeat(40),
      'Content-Type':'application/json'
    },body:JSON.stringify({zipCode:'13214610'})
  }),env);
  assert.equal(response.status,403);
});

test('CORS de frete de diagnóstico permite autenticação somente no domínio da loja',async()=>{
  const response=await worker.fetch(new Request(url,{method:'OPTIONS',headers:{
    Origin:origin,'Access-Control-Request-Method':'POST',
    'Access-Control-Request-Headers':'Authorization,Content-Type'
  }}),env);
  assert.equal(response.status,204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
});

test('CEP inválido é rejeitado mesmo após autenticação',async()=>{
  const response=await worker.fetch(new Request(url,{
    method:'POST',headers:{
      Origin:origin,Authorization:'Bearer '+'a'.repeat(40),
      'Content-Type':'application/json'
    },body:JSON.stringify({zipCode:'not-valid'})
  }),env);
  assert.equal(response.status,422);
  assert.equal((await response.json()).error,'invalid_zip');
});
