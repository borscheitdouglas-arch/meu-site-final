import test from 'node:test';
import assert from 'node:assert/strict';
import {processVaviWebhook} from './vavi-webhook.js';
import worker from './index.js';

const secret='whsec_testkey-1234567890';
const eventId='3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const draftId='5819a1c4-1ebd-4375-880b-6762d427262b';
const orderId='550e8400-e29b-41d4-a716-446655440000';
const url='https://api.example.test/api/webhooks/vavi';
const timestamp=Math.floor(Date.now()/1000);
const dbCalls=()=>{const batches=[];return {batches,
  prepare(sql){return {bind(...values){return {sql,values}}}},
  async batch(statements){batches.push(statements);return [{meta:{changes:1}}]}}
};
async function signedRequest(overrides={}){
  const message={eventType:'integration_order.converted',
    occurredAt:'2026-10-31T17:00:00Z',
    webhookSentId:eventId,payloadVersion:1,
    data:{draftId,orderId,orderNSU:'BEE00123457',status:'Open'},
    ...overrides};
  const raw=JSON.stringify(message);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode(timestamp+'.'+raw));
  const sig=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return new Request(url,{method:'POST',headers:{
    'Content-Type':'application/json',
    'X-Webhook-Event':message.eventType,
    'X-Webhook-Id':message.webhookSentId,
    'X-Webhook-Timestamp':String(timestamp),
    'X-Webhook-Signature':'t='+timestamp+',v1='+sig
  },body:raw});
}
const env=db=>({VAVI_WEBHOOK_ENABLED:'true',VAVI_WEBHOOK_SECRET:secret,DB:db});

test('webhook inativo por padrão não registra evento',async()=>{
  const db=dbCalls();
  const res=await worker.fetch(await signedRequest(),{DB:db});
  assert.equal(res.status,503);
  assert.equal(db.batches.length,0);
});

test('assinatura válida permite correlacionar conversão pelo draftId',async()=>{
  const db=dbCalls();
  const res=await processVaviWebhook({request:await signedRequest(),env:env(db)});
  assert.equal(res.received,true);
  assert.equal(db.batches.length,1);
  assert.match(db.batches[0][0].sql,/INSERT OR IGNORE/);
  assert.match(db.batches[0][1].sql,/vavi_draft_id/);
  assert.equal(db.batches[0][1].values[0],orderId);
  assert.equal(db.batches[0][1].values[1],draftId);
});

test('order.created da VAVI é aceito e usa data.status PascalCase sem criar venda',async()=>{
  const db=dbCalls();
  const request=await signedRequest({
    eventType:'order.created',
    data:{orderId,orderNSU:'BEE00123457',status:'Open',
      amount:89.9,createdAt:'2026-11-01T23:50:00Z',quantityItems:1}
  });
  const result=await processVaviWebhook({request,env:env(db)});
  assert.equal(result.received,true);
  assert.equal(db.batches.length,1);
  assert.match(db.batches[0][0].sql,/INSERT OR IGNORE/);
  assert.match(db.batches[0][1].sql,/store_vavi_order_tracking/);
  assert.equal(db.batches[0][1].values[0],orderId);
  assert.equal(db.batches[0][1].values[1],'Open');
  assert.equal(db.batches[0][1].values[2],'BEE00123457');
  assert.match(db.batches[0][1].sql,/WHERE EXISTS/);
  assert.match(db.batches[0][1].sql,/payment_environment='live'/);
});
test('order.status_changed UnderReview é aceito sem depender de previousStatus',async()=>{
  const db=dbCalls();
  const request=await signedRequest({
    eventType:'order.status_changed',
    data:{orderId,orderNSU:'BEE00123457',previousStatus:null,
      newStatus:'UnderReview',updatedAt:'2026-11-01T23:55:00Z',amount:89.9}
  });
  const result=await processVaviWebhook({request,env:env(db)});
  assert.equal(result.received,true);
  assert.equal(db.batches[0][1].values[1],'UnderReview');
});
test('timestamp do header diferente da assinatura não é aceito',async()=>{
  const db=dbCalls(),signed=await signedRequest({eventType:'order.created',data:{
    orderId,orderNSU:'BEE00123457',status:'Open'}});
  const headers=new Headers(signed.headers);
  headers.set('X-Webhook-Timestamp',String(timestamp+1));
  const modified=new Request(url,{method:'POST',headers,body:await signed.text()});
  await assert.rejects(()=>processVaviWebhook({request:modified,env:env(db)}),
    {code:'vavi_webhook_unauthorized'});
  assert.equal(db.batches.length,0);
});
test('order.created com identificador de pedido inválido é recusado',async()=>{
  const db=dbCalls();
  const request=await signedRequest({eventType:'order.created',
    data:{orderId:'not-a-uuid',orderNSU:'BEE00123457',status:'Open'}});
  await assert.rejects(()=>processVaviWebhook({request,env:env(db)}),
    {code:'invalid_vavi_webhook'});
  assert.equal(db.batches.length,0);
});

test('alteração do corpo após assinatura não pode passar',async()=>{
  const db=dbCalls(),req=await signedRequest();
  const headers=new Headers(req.headers);
  const badBody=(await req.text()).replace('Open','Delivered');
  const altered=new Request(url,{method:'POST',headers,body:badBody});
  await assert.rejects(()=>processVaviWebhook({request:altered,env:env(db)}),
    {code:'vavi_webhook_unauthorized'});
  assert.equal(db.batches.length,0);
});

test('ping de webhook autenticado não altera dados reais',async()=>{
  const db=dbCalls(),request=await signedRequest({test:true});
  const res=await processVaviWebhook({request,env:env(db)});
  assert.equal(res.ignored,'ping');
  assert.equal(db.batches.length,0);
});

test('webhook com identificador de envio divergente é recusado',async()=>{
  const db=dbCalls();
  const req=await signedRequest();
  const headers=new Headers(req.headers);
  headers.set('X-Webhook-Id','00000000-0000-0000-0000-000000000000');
  const modified=new Request(url,{method:'POST',headers,body:await req.text()});
  await assert.rejects(()=>processVaviWebhook({request:modified,env:env(db)}),
    {code:'invalid_vavi_webhook'});
  assert.equal(db.batches.length,0);
});
