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
test('carrinho recebe modalidades VAVI com subcentavos normalizados',async()=>{
  const orig=globalThis.fetch;
  globalThis.fetch=async url=>({ok:true,json:async()=>
    String(url).includes('/Auth/Token')
      ?{data:{access_token:'fake'}}
      :{data:[
        {id:'carrier',name:'Entrega real',shippingCost:18.7392,deliveryTime:7,isActive:true},
        {id:'pickup',name:'Retirada na Fábrica',shippingCost:0,deliveryTime:0,isActive:true}
      ]}
  });
  try{
    const response=await worker.fetch(req({zipCode:'13218752',sku:'salve-regina-preta-g'}),env);
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.options.length,1);
    assert.equal(body.options[0].shippingCost,18.74);
  } finally{globalThis.fetch=orig;}
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

test('frete público da caneca sem variante cadastrada em D1 não consulta fornecedor',async()=>{
  const response=await worker.fetch(req({
    zipCode:'01001000',sku:'caneca-salve-regina-preta'
  }),env);
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'unavailable_product');
});

test('frete por CEP para caneca cadastrada independe da liberação do pagamento',async()=>{
  const extraConfig={
    'caneca-salve-regina-preta':{
      id:'019aa7eb-d437-721a-bc8d-69d5a2754865',
      sku:'codigo-exclusivo-de-teste',amount:22.2,
      weight:0.42,height:95,width:125,length:125
    }
  };
  const unavailableForSale={
    sku:'caneca-salve-regina-preta',price_cents:4990,
    available:0,product_verified:0,product_enabled:0
  };
  const localEnv={
    ...env,DB:{prepare(){return {bind(){return {first:async()=>unavailableForSale}}}}},
    VAVI_SHIPPING_PRODUCTS_JSON:JSON.stringify(extraConfig)
  };
  const previousFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async url=>{
    calls++;
    return {ok:true,json:async()=>String(url).includes('/Auth/Token')
      ?{data:{access_token:'token-de-teste'}}
      :{data:[{id:'entrega-teste',name:'Entrega domicilio',
        shippingCost:12.34,deliveryTime:6,isActive:true}]}
    };
  };
  try{
    const response=await worker.fetch(req({
      zipCode:'01001000',sku:'caneca-salve-regina-preta'
    }),localEnv);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.checkoutEnabled,false);
    assert.equal(data.provisional,false);
    assert.equal(data.options.length,1);
    assert.equal(data.options[0].shippingCost,12.34);
    assert.equal(calls,2);
  }finally{globalThis.fetch=previousFetch;}
});

test('caneca cadastrada sem ficha de embalagem não produz frete fictício',async()=>{
  const localEnv={
    ...env,DB:{prepare(){return {bind(){return {first:async()=>({
      sku:'caneca-salve-regina-preta',price_cents:4990,
      available:0,product_verified:0,product_enabled:0
    })}}}}}
  };
  const response=await worker.fetch(req({
    zipCode:'01001000',sku:'caneca-salve-regina-preta'
  }),localEnv);
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'shipping_product_unverified');
});

test('ecobag com SKU e custo privado pode simular sem UUID, mas nunca habilita cobrança',async()=>{
  const calls=[];
  const localEnv={
    ...env,
    DB:{
      prepare(sql){
        return {
          bind(sku){
            return {
              first:async()=>{
                assert.equal(sku,'ecobag-salve-regina-m');
                if(sql.includes('supplier_variant_cost_observations'))
                  return {observed_total_cents:2500};
                return {sku,price_cents:3990,available:0,
                  product_verified:0,product_enabled:0};
              }
            };
          }
        };
      }
    }
  };
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{
    calls.push(String(url));
    if(String(url).includes('/Auth/Token'))
      return {ok:true,json:async()=>({data:{access_token:'test-token'}})};
    const payload=JSON.parse(init.body);
    assert.deepEqual(payload,{
      zipCode:'01001000',amount:25,weight:0.2,
      height:10,width:250,length:250
    });
    return {ok:true,json:async()=>({data:[
      {id:'transporte-1',name:'Entrega',shippingCost:11.341,
        deliveryTime:5,isActive:true},
      {id:'fabrica',name:'Retirada na Fabrica',shippingCost:0,
        deliveryTime:1,isActive:true}
    ]})};
  };
  try{
    const response=await worker.fetch(req({
      zipCode:'01001000',sku:'ecobag-salve-regina-m'
    }),localEnv);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.provisional,true);
    assert.equal(data.checkoutEnabled,false);
    assert.equal(data.options.length,1);
    assert.equal(data.options[0].shippingCost,11.35);
    assert.equal(calls.length,2);
    assert.ok(calls.every(x=>!x.includes('checkout')&&!x.includes('/Orders')));
    assert.ok(!JSON.stringify(data).includes('2500'));
  }finally{globalThis.fetch=originalFetch;}
});

test('sem custo privado confirmado, não tenta simulação por SKU incompleto',async()=>{
  const localEnv={
    ...env,
    DB:{
      prepare(sql){
        return {
          bind(){
            return {
              first:async()=>sql.includes('supplier_variant_cost_observations')?
                null:{sku:'ecobag-salve-regina-m',price_cents:3990,
                  available:0,product_verified:0,product_enabled:0}
            };
          }
        };
      }
    }
  };
  const response=await worker.fetch(req({
    zipCode:'01001000',sku:'ecobag-salve-regina-m'
  }),localEnv);
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'shipping_product_unverified');
});

const multiRequest=(payload,originHeader=true)=>new Request(
  'https://api.example.test/api/shipping/cart-preview',{
    method:'POST',headers:{'Content-Type':'application/json',
      ...(originHeader?{Origin:origin}:{})},body:JSON.stringify(payload)
  });

test('carrinho com camiseta e caneca consulta VAVI uma vez, sem liberar pagamentos',async()=>{
  const seen=[];
  const envMulti={...env,DB:{
    prepare(sql){return {bind(sku){return {first:async()=>{
      if(sql.includes('supplier_variant_cost_observations')){
        return sku==='salve-regina-preta-g'?
          {supplier_variant_sku:'0001589',observed_total_cents:7071}:
          {supplier_variant_sku:'0002193',observed_total_cents:2961};
      }
      return {sku,price_cents:sku==='salve-regina-preta-g'?10990:4990,
        available:0,product_verified:0,product_enabled:0};
    }}}}}}
  }};
  const origFetch=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{
    seen.push(String(url));
    if(String(url).includes('/Auth/Token'))
      return {ok:true,json:async()=>({data:{access_token:'mock-private-token'}})};
    const payload=JSON.parse(init.body);
    assert.equal(payload.zipCode,'01001000');
    assert.equal(payload.amount,100.32);
    assert.equal(payload.weight,0.75);
    assert.equal(payload.compositions.length,2);
    assert.equal(payload.compositions[0].sku,'0001589');
    assert.equal(payload.compositions[1].sku,'0002193');
    assert.equal(Object.hasOwn(payload,'height'),false);
    return {ok:true,json:async()=>({data:[
      {id:'transportadora-1',name:'Express',shippingCost:12.4125,
        deliveryTime:4,isActive:true},
      {id:'retirada',name:'Retirada na Fábrica',shippingCost:0,
        deliveryTime:0,isActive:true}
    ]})};
  };
  try{
    const request=multiRequest({zipCode:'01001000',
      items:[{sku:'salve-regina-preta-g',quantity:1},
        {sku:'caneca-salve-regina-pb',quantity:1}]});
    const response=await worker.fetch(request,envMulti);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.provisional,true);
    assert.equal(data.packageConfirmed,false);
    assert.equal(data.checkoutEnabled,false);
    assert.equal(data.options.length,1);
    assert.equal(data.options[0].shippingCost,12.42);
    assert.equal(seen.length,2); // autenticação + uma simulação do pacote
    assert.ok(!JSON.stringify(data).includes('0001589'));
    assert.ok(!JSON.stringify(data).includes('mock-private-token'));
  }finally{globalThis.fetch=origFetch;}
});

test('carrinho com produto removido, excesso de quantidade ou origem errada não chama VAVI',async()=>{
  const envMulti={...env,DB:{prepare(){throw new Error('não deveria consultar DB')}}};
  const cases=[
    [multiRequest({zipCode:'01001000',items:[
      {sku:'moletom-salve-regina',quantity:1}]}),422],
    [multiRequest({zipCode:'01001000',items:[
      {sku:'salve-regina-preta-g',quantity:11}]}),422],
    [multiRequest({zipCode:'01001000',items:[
      {sku:'salve-regina-preta-g',quantity:2}]},false),403]
  ];
  for(const [request,status] of cases){
    const response=await worker.fetch(request,envMulti);
    assert.equal(response.status,status);
  }
});
