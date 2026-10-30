import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutTest} from './checkout-orchestrator.js';

const buyer={name:'Pessoa Teste',email:'test@example.com',phone:'11999990000',
 taxId:'12345678909',zipCode:'01001000',street:'Rua Exemplo',number:'10',
 neighborhood:'Centro',city:'Sao Paulo',state:'SP'};
const body={items:[{sku:'salve-regina-preta-g',quantity:1}],
 zipCode:'01001000',shippingOptionId:'33',buyer};
const env={CHECKOUT_TEST_ENABLED:'true',WEBHOOK_PROCESSING_ENABLED:'true',
 DELIVERY_PERSISTENCE_ENABLED:'true',MP_ORDERS_WEBHOOK_ENABLED:'true',
 CHECKOUT_TEST_PAYMENT_MODE:'orders',MERCADOPAGO_TEST_ACCESS_TOKEN:'TEST',
 VAVI_SHIPPING_PRODUCTS_JSON:'{}',DELIVERY_ENCRYPTION_KEY_B64:'MOCK'};
test('Orquestração Orders deixa a vitrine isolada e grava vínculo',async()=>{
 const calls=[];
 const DB={prepare(){return {bind(){return {run:async()=>({meta:{changes:1}})}}}}};
 const deps={
  loadVariant:async()=>({name:'Camiseta Salve Regina',sku:'salve-regina-preta-g',
    label:'Preta G',price_cents:10990,available:1,product_enabled:1,product_verified:1}),
  simulateShipping:async()=>[{id:'33',name:'Standard',isActive:true,shippingCost:20.20}],
  encryptBuyer:async(id,b)=>({orderId:id,zipCode:b.zipCode,iv:'iv',encryptedPayload:'encrypted'}),
  insertDraft:async()=>{calls.push('draft')},
  storeDelivery:async()=>{calls.push('delivery')},
  createOrders:async({order})=>{
    assert.equal(order.totalCents,13010);
    calls.push('provider');
    return {providerOrderId:'ORDTST01M66X5T4789D5YW4MF9RGQYPH',
      checkoutUrl:'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORDTST01M66X5T4789D5YW4MF9RGQYPH'};
  },
  saveOrdersLink:async()=>{calls.push('linked')}
 };
 const result=await createCheckoutTest({...env,DB},body,deps);
 assert.equal(result.mode,'test_orders');
 assert.equal(result.amountCents,13010);
 assert.deepEqual(calls,['draft','delivery','provider','linked']);
});
