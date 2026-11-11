import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogError} from './catalog.js';
import {createCheckoutLive} from './checkout-live.js';
import worker from './index.js';
import {COR_IESU_ASSISTED_SKUS,approvedCorIesuAssistedVariant,
  loadCorIesuAssistedCost,assertCorIesuSingleItem} from './cor-iesu-assist.js';
import {canQuotePublishedPackage} from './shipping.js';

const buyer={name:'Pessoa Teste',email:'teste@example.com',phone:'11999990000',
  taxId:'12345678909',zipCode:'01001000',street:'Rua Teste',number:'10',
  neighborhood:'Centro',city:'São Paulo',state:'SP'};
const base={
  LIVE_CHECKOUT_ENABLED:'true',LIVE_PRODUCT_APPROVED:'true',
  LIVE_POLICY_APPROVED:'true',LIVE_WEBHOOK_ENABLED:'true',
  DELIVERY_PERSISTENCE_ENABLED:'true',LEGACY_MP_CHECKOUT_ALLOWED:'true',
  MERCADOPAGO_LIVE_ACCESS_TOKEN:'APP_USR_TEST',
  MERCADOPAGO_LIVE_WEBHOOK_SECRET:'TEST_SECRET',
  SHOP_ADMIN_API_KEY:'x'.repeat(40),DELIVERY_ENCRYPTION_KEY_B64:'mock',
  VAVI_CLIENT_ID:'fake',VAVI_CLIENT_SECRET:'fake',
  VAVI_SHIPPING_PRODUCTS_JSON:'{}'
};
const design={supplier_design_code:'D000007',method:'DTF',
  configured_areas:2,confirmed_unit_cost_cents:5691};
const variant={sku:'cor-iesu-marrom-g',label:'Marrom · G',
  name:'Camiseta Sagrado Coração de Jesus | Cor Iesu Sacratissimum',
  price_cents:10990,available:1,product_enabled:1,product_verified:1};
function dbWithDesign(row=design){
  return {prepare(sql){return {bind(){return {
    first:async()=>sql.includes('supplier_design_observations')?row:null,
    run:async()=>({meta:{changes:1}})
  };}}}};
}
test('24 SKUs internos reconhecidos, sem confundir com SKUs VAVI',()=>{
  assert.equal(COR_IESU_ASSISTED_SKUS.length,24);
  assert.ok(COR_IESU_ASSISTED_SKUS.includes('cor-iesu-vinho-p'));
  assert.ok(COR_IESU_ASSISTED_SKUS.includes('cor-iesu-grafite-gg'));
  // D1 mantém as 20 variantes não homologadas com available=0.
  for(const sku of COR_IESU_ASSISTED_SKUS){
    assert.equal(approvedCorIesuAssistedVariant(sku,10990),true);
    assert.equal(approvedCorIesuAssistedVariant(sku,7990),false);
    assert.equal(canQuotePublishedPackage(sku),true);
  }
  assert.equal(approvedCorIesuAssistedVariant('cor-iesu-preta-p',10990),false);
});
test('somente custo D000007 DTF 2 áreas confirmado no D1 autoriza prévia',async()=>{
  assert.equal(await loadCorIesuAssistedCost(dbWithDesign(),'cor-iesu-marrom-g'),5691);
  assert.equal(await loadCorIesuAssistedCost(dbWithDesign({...design,configured_areas:1}),'cor-iesu-marrom-g'),null);
  assert.equal(await loadCorIesuAssistedCost(dbWithDesign({...design,confirmed_unit_cost_cents:null}),'cor-iesu-marrom-g'),null);
  assert.equal(await loadCorIesuAssistedCost(dbWithDesign(),'salve-regina-preta-g'),null);
});
test('embalagem conjunta da nova coleção permanece bloqueada',()=>{
  assert.doesNotThrow(()=>assertCorIesuSingleItem([{sku:'cor-iesu-marrom-p',quantity:1}]));
  assert.throws(()=>assertCorIesuSingleItem([{sku:'cor-iesu-marrom-p',quantity:2}]),
    {code:'shipping_package_unverified'});
  assert.throws(()=>assertCorIesuSingleItem([{sku:'cor-iesu-marrom-p',quantity:1},
    {sku:'salve-regina-preta-g',quantity:1}]),{code:'shipping_package_unverified'});
});
test('checkout unitário valida preço e custo privados antes de criar pagamento',async()=>{
  const steps=[];
  const env={...base,DB:dbWithDesign()};
  const result=await createCheckoutLive(env,{
    items:[{sku:'cor-iesu-marrom-g',quantity:1}],
    zipCode:'01001000',shippingOptionId:'express',buyer,subtotalCents:1
  },{
    loadVariant:async()=>variant,
    simulateShipping:async()=>{throw new CatalogError('shipping_product_unverified','sem UUID',409);},
    simulateShippingProvisional:async(_env,zip,sku,cost)=>{
      assert.equal(zip,'01001000');assert.equal(sku,'cor-iesu-marrom-g');
      assert.equal(cost,5691);steps.push('vavi_frete');
      return [{id:'express',name:'Express',shippingCost:16.70,isActive:true,deliveryTime:4}];
    },
    encryptDelivery:async()=>({encryptedPayload:'encrypted',iv:'nonce'}),
    insertDraftOrder:async()=>{steps.push('draft');},
    storeEncryptedDelivery:async()=>{steps.push('delivery');},
    createPreference:async input=>{
      assert.equal(input.order.totalCents,12660);
      steps.push('payment');
      return {preferenceId:'fake',checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
    }
  });
  assert.equal(result.totalCents,12660);
  assert.deepEqual(steps,['vavi_frete','draft','delivery','payment']);
});
test('não cobra quando o custo ou o produto não foi homologado',async()=>{
  let paid=false;
  await assert.rejects(()=>createCheckoutLive({...base,DB:dbWithDesign({...design,configured_areas:1})},{
    items:[{sku:'cor-iesu-marrom-g',quantity:1}],
    zipCode:'01001000',shippingOptionId:'express',buyer
  },{
    loadVariant:async()=>variant,
    simulateShipping:async()=>{throw new CatalogError('shipping_product_unverified','sem UUID',409);},
    createPreference:async()=>{paid=true;}
  }),{code:'shipping_product_unverified'});
  assert.equal(paid,false);
  await assert.rejects(()=>createCheckoutLive({...base,DB:dbWithDesign()},{
    items:[{sku:'cor-iesu-vinho-g',quantity:1}],
    zipCode:'01001000',shippingOptionId:'express',buyer
  },{
    loadVariant:async()=>({...variant,sku:'cor-iesu-vinho-g',available:0})
  }),{code:'unavailable_product'});
});

test('API não fornece frete de cor Cor Iesu ainda inativa no D1',async()=>{
  const db={prepare(){return {bind(){return {first:async()=>({
    ...variant,sku:'cor-iesu-vinho-g',available:0
  })};}}}};
  const request=new Request('https://loja.example/api/shipping/preview',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sku:'cor-iesu-vinho-g',zipCode:'01001000'})
  });
  const response=await worker.fetch(request,{...base,DB:db});
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'unavailable_product');
});
