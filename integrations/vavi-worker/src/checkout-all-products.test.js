import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
import {createCheckoutLive} from './checkout-live.js';
import {CatalogError} from './catalog.js';
import {DIRECT_CHECKOUT_SKUS,approvedDirectVariant} from './salve-regina-variants.js';

const prices=Object.fromEntries(DIRECT_CHECKOUT_SKUS.map(sku=>[
  sku,sku==='salve-regina-preta-xg'?11990:
    sku.startsWith('salve-regina-preta-')?10990:
    sku.startsWith('caneca-')?4990:3990
]));
const supplier=Object.fromEntries(DIRECT_CHECKOUT_SKUS.map((sku,i)=>[
  sku,{supplier_variant_sku:String(1587+i).padStart(7,'0'),observed_total_cents:5000}
]));
function makeDb(){
  return {prepare(sql){return {bind(...args){return {
    first:async()=>{
      const sku=args[0];
      if(sql.includes('supplier_variant_cost_observations'))return supplier[sku]||null;
      if(sql.includes('FROM variants'))return prices[sku]===undefined?null:{
        sku,name:sku,label:sku,price_cents:prices[sku],
        enabled:1,verified:1,available:1,product_enabled:1,product_verified:1
      };
      return null;
    },
    run:async()=>({meta:{changes:1}})
  };}};}};
}
const env={
  DB:makeDb(),
  LIVE_CHECKOUT_ENABLED:'true',LIVE_PRODUCT_APPROVED:'true',
  LIVE_POLICY_APPROVED:'true',LIVE_WEBHOOK_ENABLED:'true',
  LEGACY_MP_CHECKOUT_ALLOWED:'true',
  DELIVERY_PERSISTENCE_ENABLED:'true',
  LIVE_MULTICART_CHECKOUT_ENABLED:'true',
  MERCADOPAGO_LIVE_ACCESS_TOKEN:'APP_USR_MOCK',
  MERCADOPAGO_LIVE_WEBHOOK_SECRET:'MOCK',
  SHOP_ADMIN_API_KEY:'x'.repeat(40),
  DELIVERY_ENCRYPTION_KEY_B64:'mock',
  VAVI_CLIENT_ID:'mock',VAVI_CLIENT_SECRET:'mock',
  VAVI_SHIPPING_PRODUCTS_JSON:'{}'
};
const buyer={name:'Pessoa Teste',email:'teste@example.com',
  phone:'11999990000',taxId:'12345678909',zipCode:'01001000',
  street:'Rua Teste',number:'10',neighborhood:'Centro',
  city:'São Paulo',state:'SP'};
const quote=[{id:'carrier-1',name:'Entrega',shippingCost:12.34,
  deliveryTime:5,isActive:true}];
const deps={
  simulateShipping:async()=>{throw new CatalogError('shipping_product_unverified','Sem UUID',409);},
  simulateShippingProvisional:async()=>quote,
  simulateShippingCart:async()=>quote,
  encryptDelivery:async()=>({encryptedPayload:'cipher',iv:'nonce'}),
  insertDraftOrder:async()=>{},
  storeEncryptedDelivery:async()=>{},
  createPreference:async input=>{
    assert.equal(input.sandbox,false);
    assert.equal(input.accessToken,'APP_USR_MOCK');
    assert.equal(input.order.totalCents,
      input.lines.reduce((s,line)=>s+line.unitPriceCents*line.quantity,0)+1234);
    return {preferenceId:'mp_mock',
      checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
  }
};

test('nove variações aprovadas aparecem na lista de checkout, sem consultar credenciais',async()=>{
  const response=await worker.fetch(new Request('https://api.test/api/checkout/live/readiness'),env);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.checkoutEnabled,true);
  assert.equal(body.multiCheckoutEnabled,true);
  assert.deepEqual(body.availableSkus,DIRECT_CHECKOUT_SKUS);
});

test('cada produto obtém preferência real por valor calculado no servidor',async()=>{
  for(const sku of DIRECT_CHECKOUT_SKUS){
    const result=await createCheckoutLive(env,{
      items:[{sku,quantity:1}],zipCode:'01001000',shippingOptionId:'carrier-1',
      buyer,subtotalCents:1,shippingCents:1
    },deps);
    assert.equal(result.mode,'live');
    assert.equal(result.totalCents,prices[sku]+1234,sku);
    assert.equal(approvedDirectVariant(sku,prices[sku]),true);
  }
});

test('carrinho misto com vários itens conserva cada produto e total',async()=>{
  const items=[{sku:'salve-regina-preta-g',quantity:2},
    {sku:'caneca-salve-regina-preta',quantity:1},
    {sku:'ecobag-salve-regina-m',quantity:1}];
  const result=await createCheckoutLive(env,{
    items,zipCode:'01001000',shippingOptionId:'carrier-1',buyer
  },deps);
  assert.equal(result.totalCents,2*10990+4990+3990+1234);
});
