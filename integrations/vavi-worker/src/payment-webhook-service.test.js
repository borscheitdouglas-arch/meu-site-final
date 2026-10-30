import test from 'node:test';
import assert from 'node:assert/strict';
import {processPaymentWebhook} from './payment-webhook-service.js';

const orderId='ord_0123456789abcdef0123456789abcdef';
const now=Date.now();
const ts=String(Math.floor(now/1000));
const dataId='123456';
const requestId='req_001';
const secret='test-only-secret';
async function signedRequest(){
  const message=`id:${dataId};request-id:${requestId};ts:${ts};`;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message));
  const hex=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  return new Request(`https://api.example.test/api/payments/webhook?data.id=${dataId}`,{
    method:'POST',headers:{'x-request-id':requestId,
      'x-signature':`ts=${ts},v1=${hex}`}
  });
}
function db(){
  let count=0;return {get count(){return count},
    prepare(sql){return {
      bind(...params){return {
        first:async()=>({id:orderId,status:'awaiting_payment',currency:'BRL',total_cents:12544}),
      }},
    }},
    async batch(statements){count++;
      assert.equal(statements.length,3);
      return [{meta:{changes:1}},{meta:{changes:1}},{
        results:[{id:orderId,status:'paid',mp_payment_id:dataId}]}];
    }
  };
}
const env=(database)=>({DB:database,WEBHOOK_PROCESSING_ENABLED:'true',
  MERCADOPAGO_WEBHOOK_SECRET:secret,MERCADOPAGO_TEST_ACCESS_TOKEN:'TEST_TOKEN'});
test('pagamento aprovado e autenticado é persistido',async()=>{
  const database=db();
  const result=await processPaymentWebhook({request:await signedRequest(),
    env:env(database),fetchImpl:async()=>({ok:true,json:async()=>({
      id:Number(dataId),external_reference:orderId,status:'approved',
      currency_id:'BRL',transaction_amount:125.44
    })})});
  assert.equal(result.status,'paid');
  assert.equal(result.vaviOrderCreated,false);
  assert.equal(database.count,1);
});
test('pendente não grava nem inicia produção',async()=>{
  const database=db();
  const result=await processPaymentWebhook({request:await signedRequest(),
    env:env(database),fetchImpl:async()=>({ok:true,json:async()=>({
      id:Number(dataId),external_reference:orderId,status:'pending',
      currency_id:'BRL',transaction_amount:125.44
    })})});
  assert.deepEqual(result,{processed:false,status:'not_approved'});
  assert.equal(database.count,0);
});
test('rejeita aviso falso e ausência de configuração',async()=>{
  await assert.rejects(()=>processPaymentWebhook({
    request:await signedRequest(),env:{}
  }),{code:'webhook_not_configured'});
  const bad=new Request(`https://api.example.test/api/payments/webhook?data.id=${dataId}`,{
    method:'POST',headers:{'x-request-id':requestId,'x-signature':'ts=123,v1=bad'}});
  await assert.rejects(()=>processPaymentWebhook({request:bad,env:env(db())}),
    {code:'invalid_notification'});
});
test('valor diferente impede registrar pagamento',async()=>{
  const database=db();
  await assert.rejects(()=>processPaymentWebhook({request:await signedRequest(),
    env:env(database),fetchImpl:async()=>({ok:true,json:async()=>({
      id:Number(dataId),external_reference:orderId,status:'approved',
      currency_id:'BRL',transaction_amount:1
    })})}),{code:'payment_mismatch'});
  assert.equal(database.count,0);
});
