import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutTest} from './checkout-orchestrator.js';
import {buildPreference} from './mercado-pago.js';

const buyer={name:'Comprador Fictício',email:'ficticio@example.com',
 phone:'11999990000',taxId:'12345678909',zipCode:'01001000',
 street:'Rua Exemplo',number:'1',neighborhood:'Centro',
 city:'São Paulo',state:'SP'};
const body={items:[{sku:'salve-regina-preta-g',quantity:1}],
 zipCode:'01001000',shippingOptionId:'33',buyer};
const base={CHECKOUT_TEST_ENABLED:'true',WEBHOOK_PROCESSING_ENABLED:'true',
 DELIVERY_PERSISTENCE_ENABLED:'true',CHECKOUT_TEST_CATALOG_OVERRIDE:'true',
 MERCADOPAGO_TEST_ACCESS_TOKEN:'FAKE',DELIVERY_ENCRYPTION_KEY_B64:'FAKE',
 VAVI_SHIPPING_PRODUCTS_JSON:'{}'};
const db=(price=10990)=>({prepare(sql){return {bind(){return {
  first:async()=>({sku:'salve-regina-preta-g',name:'Camiseta Salve Regina',
    label:'Preta G',price_cents:price,available:0,product_enabled:0,
    product_verified:0}),
  run:async()=>({meta:{changes:1}})
}}}}});
function dependencies(extra={}){
 return {simulateShipping:async()=>[
  {id:'33',name:'Standard',isActive:true,shippingCost:20.20},
  {id:'0',name:'Retirada na Fabrica',isActive:true,shippingCost:0}
 ],encryptBuyer:async(id,b)=>({orderId:id,zipCode:b.zipCode,
   iv:'a'.repeat(24),encryptedPayload:'b'.repeat(80)}),
 insertDraft:async()=>{},storeDelivery:async()=>({saved:true}),
 createPreference:async()=>({preferenceId:'pref-1',
   checkoutUrl:'https://www.mercadopago.com.br/checkout/start?pref_id=1'}),
 ...extra};
}
test('sandbox privado pode usar uma camiseta inativa sem expor catálogo',async()=>{
 const r=await createCheckoutTest({...base,DB:db()},body,dependencies());
 assert.equal(r.mode,'test');
 assert.equal(r.amountCents,13010);
});
test('flag separada é necessária mesmo em sandbox privado',async()=>{
 await assert.rejects(()=>createCheckoutTest({
  ...base,CHECKOUT_TEST_CATALOG_OVERRIDE:'false',DB:db()
 },body,dependencies()),{code:'checkout_test_product_unverified'});
});
test('não permite preço adulterado no banco ou SKU distinto',async()=>{
 await assert.rejects(()=>createCheckoutTest({...base,DB:db(11990)},
  body,dependencies()),{code:'checkout_test_product_unverified'});
 await assert.rejects(()=>createCheckoutTest({...base,DB:db()},
  {...body,items:[{sku:'outro-produto',quantity:1}]},dependencies()),
  {code:'checkout_test_sku_restricted'});
});
test('recusa retirada na fábrica no checkout do endereço',async()=>{
 await assert.rejects(()=>createCheckoutTest({...base,DB:db()},
  {...body,shippingOptionId:'0'},dependencies()),
  {code:'shipping_option_invalid'});
});
test('URLs de retorno apontam para o acompanhamento de pagamento',()=>{
 const pref=buildPreference({
  lines:[{sku:'salve-regina-preta-g',name:'Camiseta Salve Regina',
   unitPriceCents:10990,quantity:1}],
  shippingCents:2020,orderId:'ord_0123456789abcdef0123456789abcdef',
  siteBaseUrl:'https://www.douglasassumpcao.com.br',
  notificationUrl:'https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/webhook'
 });
 assert.match(pref.back_urls.success,/\/pages\/resultado-pagamento\.html\?pagamento=sucesso$/);
});
