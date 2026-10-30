import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {webhookManifest,parseSignature,verifyWebhookSignature,fetchAndVerifyPayment} from './payment-verification.js';
if (!globalThis.crypto) globalThis.crypto=webcrypto;

async function signed(secret,manifest) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(manifest))).toString('hex');
}
test('constrói manifesto e rejeita cabeçalhos inválidos',()=>{
  const str=webhookManifest({dataId:'1234',requestId:'req-abc',timestamp:'1793350000'});
  assert.equal(str,'id:1234;request-id:req-abc;ts:1793350000;');
  assert.throws(()=>parseSignature('ts=abc,v1=bad'),{code:'invalid_notification'});
});
test('verifica HMAC legítimo e rejeita adulteração e replay',async()=>{
  const now=1793350000000,ts=String(now/1000),secret='a-secret';
  const dataId='1234',requestId='req-abc';
  const v1=await signed(secret,webhookManifest({dataId,requestId,timestamp:ts}));
  const params={signature:`ts=${ts},v1=${v1}`,dataId,requestId,secret,now};
  assert.equal(await verifyWebhookSignature(params),true);
  await assert.rejects(()=>verifyWebhookSignature({...params,dataId:'1235'}),{code:'invalid_notification'});
  await assert.rejects(()=>verifyWebhookSignature({...params,now:now+600000}),{code:'invalid_notification'});
});
test('confere pagamento diretamente na API, referência e valor',async()=>{
  const order={id:'order-123',total_cents:15500};
  const fetchImpl=async(url,options)=>{
    assert.equal(url,'https://api.mercadopago.com/v1/payments/876');
    assert.equal(options.headers.Authorization,'Bearer token');
    return {ok:true,json:async()=>({
      id:876,status:'approved',currency_id:'BRL',
      external_reference:'order-123',transaction_amount:155
    })};
  };
  const result=await fetchAndVerifyPayment({paymentId:'876',accessToken:'token',order,fetchImpl});
  assert.equal(result.status,'paid');
  await assert.rejects(()=>fetchAndVerifyPayment({paymentId:'abc',accessToken:'token',order,fetchImpl}),
    {code:'payment_not_configured'});
  await assert.rejects(()=>fetchAndVerifyPayment({paymentId:'876',accessToken:'token',order,
    fetchImpl:async()=>({ok:true,json:async()=>({id:876,status:'pending',currency_id:'BRL',
      external_reference:'order-123',transaction_amount:155})})}),{code:'payment_mismatch'});
});
