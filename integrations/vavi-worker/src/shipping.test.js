import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeZip, shippingPayload} from './shipping.js';

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
