import test from 'node:test';
import assert from 'node:assert/strict';
import {shippingPayload,provisionalCartPayload} from './shipping.js';
const raw=JSON.stringify({'salve-regina-preta-g':{
  id:'019aa7eb-d437-721a-bc8d-69d5a2754865',
  sku:'0000001',amount:66.83,weight:0.25,height:10,width:250,length:300
}});
test('uma camiseta usa exatamente as dimensões fornecidas pela VAVI',()=>{
  const result=shippingPayload('13218752',[
    {sku:'salve-regina-preta-g',quantity:1}
  ],raw);
  assert.equal(result.amount,66.83);
  assert.equal(result.weight,0.25);
  assert.equal(result.height,10);
  assert.equal(result.width,250);
  assert.equal(result.length,300);
  assert.equal(result.compositions[0].id,'019aa7eb-d437-721a-bc8d-69d5a2754865');
});
test('não inventa pacote para quantidade 2 ou mais itens',()=>{
  assert.throws(()=>shippingPayload('13218752',[
    {sku:'salve-regina-preta-g',quantity:2}
  ],raw),{code:'shipping_package_unverified'});
  assert.throws(()=>shippingPayload('13218752',[
    {sku:'salve-regina-preta-g',quantity:1},
    {sku:'salve-regina-preta-g',quantity:1}
  ],raw),{code:'shipping_package_unverified'});
});

test('carrinho misto combina quantidades em uma única consulta VAVI, sem inventar caixa',()=>{
  const payload=provisionalCartPayload('01001000',[
    {sku:'salve-regina-preta-g',supplierSku:'0001589',
      unitCostCents:7071,quantity:2},
    {sku:'caneca-salve-regina-pb',supplierSku:'0002193',
      unitCostCents:2961,quantity:1}
  ]);
  assert.equal(payload.amount,171.03);
  assert.equal(payload.weight,1);
  assert.equal(payload.compositions.length,2);
  assert.deepEqual(payload.compositions[0],{
    sku:'0001589',amount:70.71,quantity:2,weight:0.25,
    height:10,width:250,length:300
  });
  assert.deepEqual(payload.compositions[1],{
    sku:'0002193',amount:29.61,quantity:1,weight:0.5,
    height:100,width:200,length:150
  });
  for(const dimension of ['height','width','length']){
    assert.equal(Object.hasOwn(payload,dimension),false,
      'Não supor tamanho da embalagem final agregada');
  }
});

test('carrinho misto não permite produtos estranhos ou custo vindo inválido',()=>{
  assert.throws(()=>provisionalCartPayload('01001000',[
    {sku:'moletom-salve-regina',supplierSku:'0000931',unitCostCents:5000,quantity:1}
  ]),{code:'shipping_product_unverified'});
  assert.throws(()=>provisionalCartPayload('01001000',[
    {sku:'ecobag-salve-regina-m',supplierSku:'0000564',unitCostCents:0,quantity:2}
  ]),{code:'shipping_product_unverified'});
  assert.throws(()=>provisionalCartPayload('01001000',[
    {sku:'ecobag-salve-regina-m',supplierSku:'0000564',unitCostCents:1950,quantity:11}
  ]),{code:'shipping_product_unverified'});
});
