import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
const URL='https://api.example.test/api/internal/mp/test-once-910d8fa2852ee1c649afda44';
test('uma preferência de teste só pode ser solicitada com flags privadas',async()=>{
 const request=new Request(URL,{method:'POST'});
 const response=await worker.fetch(request,{DB:{}});
 assert.equal(response.status,404);
});
test('sondagem não executa novamente após registro existente',async()=>{
 let hits=0;
 const env={MP_ONE_TIME_PREFERENCE_PROBE:'true',
   CHECKOUT_TEST_ENABLED:'true',DELIVERY_PERSISTENCE_ENABLED:'true',
   WEBHOOK_PROCESSING_ENABLED:'true',CHECKOUT_TEST_CATALOG_OVERRIDE:'true',
   MERCADOPAGO_WEBHOOK_SECRET:'mock',DB:{prepare(){return {bind(){return {
     run:async()=>{hits++;return {meta:{changes:0}}}
   }}}}}};
 const response=await worker.fetch(new Request(URL,{method:'POST'}),env);
 assert.equal(response.status,200);
 assert.equal((await response.json()).alreadyRan,true);
 assert.equal(hits,1);
});
