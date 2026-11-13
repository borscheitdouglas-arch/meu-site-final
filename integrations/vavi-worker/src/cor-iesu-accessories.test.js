import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCESSORY_SKUS,ACCESSORY_VARIANTS,approvedAccessoryVariant,
  loadApprovedAccessoryCost,accessoryDesign,assertAccessorySingleItem} from './cor-iesu-accessories.js';

const mockDb=row=>({prepare(sql){
  assert.match(sql,/supplier_variant_cost_observations/);
  return {bind(sku){return {first:async()=>row[sku]||null}}};
}});
const approved=(sku)=>({
  supplier_design_code:ACCESSORY_VARIANTS[sku].design,
  supplier_variant_sku:ACCESSORY_VARIANTS[sku].supplierSku,
  subtotal_cents:sku==='cor-iesu-ecobag-g'?2190:4490,
  observed_total_cents:sku==='cor-iesu-ecobag-g'?2146:4400,
  freight_config_verified:1
});

test('quatro acessórios e quatro designs/variações observadas',()=>{
  assert.deepEqual(ACCESSORY_SKUS,[
    'cor-iesu-bone-preto','cor-iesu-bone-azul-escuro',
    'cor-iesu-ecobag-m','cor-iesu-ecobag-g'
  ]);
  assert.equal(accessoryDesign('cor-iesu-ecobag-m'),'D000009');
  assert.equal(accessoryDesign('cor-iesu-ecobag-g'),'D000011');
  assert.equal(ACCESSORY_VARIANTS['cor-iesu-ecobag-g'].supplierSku,'0000565');
  assert.equal(approvedAccessoryVariant('cor-iesu-bone-preto',7990),true);
  assert.equal(approvedAccessoryVariant('cor-iesu-ecobag-m',3990),true);
  assert.equal(approvedAccessoryVariant('cor-iesu-bone-preto',3990),false);
  assert.equal(approvedAccessoryVariant('cor-iesu-bone-verde-escuro',7990),false);
});

test('observação não homologada impede cotação de cobrança',async()=>{
  const sku='cor-iesu-bone-preto',row=approved(sku);
  assert.equal(await loadApprovedAccessoryCost(mockDb({[sku]:{...row,freight_config_verified:0}}),sku),null);
  assert.equal(await loadApprovedAccessoryCost(mockDb({[sku]:{...row,supplier_variant_sku:'0001449'}}),sku),null);
  assert.equal(await loadApprovedAccessoryCost(mockDb({[sku]:{...row,supplier_design_code:'D000009'}}),sku),null);
  assert.equal(await loadApprovedAccessoryCost(mockDb({[sku]:{...row,subtotal_cents:0}}),sku),null);
  assert.equal(await loadApprovedAccessoryCost(mockDb({}),sku),null);
});

test('custo privado aprovado usa subtotal sem desconto condicional',async()=>{
  const sku='cor-iesu-ecobag-g';
  assert.equal(await loadApprovedAccessoryCost(mockDb({[sku]:approved(sku)}),sku),2190);
});

test('acessórios bloqueiam carrinhos mistos ou com várias unidades',()=>{
  assert.doesNotThrow(()=>assertAccessorySingleItem([{sku:'cor-iesu-ecobag-g',quantity:1}]));
  assert.throws(()=>assertAccessorySingleItem([{sku:'cor-iesu-ecobag-g',quantity:2}]),/pedido unitário/);
  assert.throws(()=>assertAccessorySingleItem([
    {sku:'cor-iesu-bone-preto',quantity:1},{sku:'salve-regina-preta-p',quantity:1}
  ]),/pedido unitário/);
});
