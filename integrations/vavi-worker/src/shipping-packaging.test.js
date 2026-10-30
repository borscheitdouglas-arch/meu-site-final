import test from 'node:test';
import assert from 'node:assert/strict';
import {shippingPayload} from './shipping.js';
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
