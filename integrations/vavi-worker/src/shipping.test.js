import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeZip, shippingPayload, simulateVaviShipping} from './shipping.js';

test('CEP aceito em formato digitado ou com hífen',()=>{
  assert.equal(normalizeZip('13201-000'),'13201000');
  assert.equal(normalizeZip('13201000'),'13201000');
});
test('CEP inválido não consulta VAVI',()=>{
  assert.throws(()=>normalizeZip('123'),{code:'invalid_zip'});
  assert.throws(()=>normalizeZip('012345678'),{code:'invalid_zip'});
});
test('sem cadastro de logística real a cotação é bloqueada',()=>{
  assert.throws(()=>shippingPayload('13201000',[{sku:'shirt',quantity:1}],'{}'),
    {code:'shipping_product_unverified'});
});
test('payload da VAVI usa somente custo e dimensões configurados no servidor',()=>{
  const conf=JSON.stringify({shirt:{id:'497f6eca-6276-4993-bfeb-53cbbbba6f08',
    sku:'VAVI-P-TESTE',amount:66.83,weight:0.25,height:30,width:250,length:350}});
  const p=shippingPayload('13201000',[{sku:'shirt',quantity:1,unitPriceCents:999999}],conf);
  assert.equal(p.amount,66.83);
  assert.equal(p.weight,0.25);
  assert.equal(p.compositions[0].sku,'VAVI-P-TESTE');
  assert.equal(p.compositions[0].quantity,1);
});

const config=JSON.stringify({shirt:{id:'497f6eca-6276-4993-bfeb-53cbbbba6f08',
  sku:'VAVI-P-TESTE',amount:66.83,weight:0.25,height:10,width:250,length:300}});
const env={VAVI_CLIENT_ID:'fake',VAVI_CLIENT_SECRET:'fake',
  VAVI_SHIPPING_PRODUCTS_JSON:config};
async function withMockVavi(data,callback) {
  const saved=globalThis.fetch;
  globalThis.fetch=async(url)=>({
    ok:true,
    json:async()=>url.includes('/Auth/Token')
      ? {data:{access_token:'fake-test'}} : {data}
  });
  try {return await callback();} finally {globalThis.fetch=saved;}
}
test('frete ativo com valor monetário exato passa',async()=>{
  await withMockVavi([{id:'carrier-01',name:'Entrega teste',
    shippingCost:19.5,deliveryTime:6,isActive:true}],async()=>{
    const result=await simulateVaviShipping(env,'13201000',[{sku:'shirt',quantity:1}]);
    assert.equal(result.length,1);
    assert.equal(result[0].shippingCost,19.5);
  });
});
test('frações de centavo da VAVI são convertidas de forma conservadora',async()=>{
  await withMockVavi([{id:'carrier-01',name:'Entrega teste',
    shippingCost:19.999,deliveryTime:6,isActive:true}],async()=>{
    const result=await simulateVaviShipping(env,'13201000',[{sku:'shirt',quantity:1}]);
    assert.equal(result.length,1);
    assert.equal(result[0].shippingCost,20);
  });
});
test('ruído de ponto flutuante não cria um centavo indevido',async()=>{
  await withMockVavi([{id:'carrier-01',name:'Entrega teste',
    shippingCost:19.500000000000004,deliveryTime:6,isActive:true}],async()=>{
    const result=await simulateVaviShipping(env,'13201000',[{sku:'shirt',quantity:1}]);
    assert.equal(result[0].shippingCost,19.5);
  });
});
test('frete negativo, infinito ou com prazo inválido continua bloqueado',async()=>{
  const invalid=[
    {id:'a',name:'Negativo',shippingCost:-1,deliveryTime:1,isActive:true},
    {id:'b',name:'Infinito',shippingCost:Infinity,deliveryTime:1,isActive:true},
    {id:'c',name:'Prazo incorreto',shippingCost:19,deliveryTime:-1,isActive:true}
  ];
  await withMockVavi(invalid,async()=>{
    const result=await simulateVaviShipping(env,'13201000',[{sku:'shirt',quantity:1}]);
    assert.deepEqual(result,[]);
  });
});
test('opções de frete com ID repetido são rejeitadas',async()=>{
  const data=[{id:'carrier-01',name:'Entrega teste',
    shippingCost:19.5,deliveryTime:6,isActive:true},
    {id:'carrier-01',name:'Entrega teste',
    shippingCost:29.5,deliveryTime:3,isActive:true}];
  await withMockVavi(data,async()=>{
    await assert.rejects(()=>simulateVaviShipping(env,'13201000',
      [{sku:'shirt',quantity:1}]),{code:'shipping_provider_unavailable'});
  });
});
