import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const url='https://api.example.test/api/shipping/preview';
const origin='https://www.douglasassumpcao.com.br';
const env={ALLOWED_ORIGINS:origin,
  VAVI_CLIENT_ID:'fake',VAVI_CLIENT_SECRET:'fake',
  VAVI_SHIPPING_PRODUCTS_JSON:JSON.stringify({
    'salve-regina-preta-g':{id:'019aa7eb-d437-721a-bc8d-69d5a2754865',
      sku:'0000001',amount:66.83,weight:0.25,
      height:10,width:250,length:300}
  })};
const req=(body,withOrigin=true)=>new Request(url,{
  method:'POST',headers:{'Content-Type':'application/json',
    ...(withOrigin?{Origin:origin}:{})},body:JSON.stringify(body)
});
test('cálculo público por CEP só aceita a origem da loja',async()=>{
  const response=await worker.fetch(req({zipCode:'01001000'},false),env);
  assert.equal(response.status,403);
});
test('CEP inválido não chega à API VAVI',async()=>{
  const response=await worker.fetch(req({zipCode:'0'}),env);
  assert.equal(response.status,422);
  assert.equal((await response.json()).error,'invalid_zip');
});
test('diagnóstico opcional do frete mostra apenas tipos e contagens, sem dados VAVI',async()=>{
  const orig=globalThis.fetch;
  globalThis.fetch=async url=>({ok:true,json:async()=>
    String(url).includes('/Auth/Token')
      ?{data:{access_token:'mock-token'}}
      :{data:[{id:33,name:'Transportadora Privada',shippingCost:17,
         deliveryTime:4,isActive:true}]}
  });
  try {
    const response=await worker.fetch(req({zipCode:'13218752',
      sku:'salve-regina-preta-g',diagnose:true}),env);
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.options.length,0);
    assert.equal(body.diagnostic.received,1);
    assert.equal(body.diagnostic.structurallyValid,0);
    assert.equal(body.diagnostic.fieldTypes[0].id,'number');
    assert.ok(!JSON.stringify(body).includes('Transportadora Privada'));
    assert.ok(!JSON.stringify(body).includes('mock-token'));
  }finally{globalThis.fetch=orig;}
});
test('mostra opções reais simuladas, excluindo retirada na fábrica',async()=>{
  const orig=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async(url)=>{
    calls++;
    return {ok:true,json:async()=>url.includes('/Auth/Token')
      ?{data:{access_token:'fake'}}
      :{data:[
        {id:'33',name:'Standard',shippingCost:20.2,deliveryTime:4,isActive:true},
        {id:'4',name:'.Com',shippingCost:17.25,deliveryTime:7,isActive:true},
        {id:'0',name:'Retirada na Fabrica',shippingCost:0,deliveryTime:1,isActive:true}
      ]}};
  };
  try{
    const response=await worker.fetch(req({zipCode:'01001000'}),env);
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.checkoutEnabled,false);
    assert.equal(body.options.length,2);
    assert.deepEqual(body.options.map(x=>x.shippingCost),[20.2,17.25]);
    assert.equal(calls,2);
  }finally{globalThis.fetch=orig;}
});
