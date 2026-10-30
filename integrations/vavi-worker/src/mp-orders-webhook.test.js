import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {processOrdersWebhook,saveOrdersLink} from './mp-orders-webhook.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const orderId='ord_0123456789abcdef0123456789abcdef';
const mpId='ORDTST01M66X5T4789D5YW4MF9RGQYPH';
const secret='sandbox-secret';
const reqId='run-4b7';
const ts=String(Math.floor(Date.now()/1000));
async function request(id=mpId,signatureSecret=secret){
 const manifest=`id:${id.toLowerCase()};request-id:${reqId};ts:${ts};`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(signatureSecret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(manifest));
 const v1=Buffer.from(signed).toString('hex');
 return new Request('https://worker.example/api/payments/webhook?type=order&data.id='+id,{
  method:'POST',headers:{'x-signature':`ts=${ts},v1=${v1}`,
   'x-request-id':reqId}
 });
}
function db(){
 let batches=0;
 return {get batches(){return batches},prepare(sql){
  return {bind(...params){return {
   first:async()=>sql.includes('store_mp_order_links')
    ?{provider_order_id:mpId,order_id:orderId,status:'awaiting_payment',
       total_cents:13010,currency:'BRL'}:null,
   run:async()=>({meta:{changes:1}})
  }}};
 },batch:async(statements)=>{
  batches++;
  assert.equal(statements.length,3);
  return [{meta:{changes:1}},{meta:{changes:1}},
    {results:[{id:orderId,status:'paid'}]}];
 }};
}
const env=DB=>({DB,MP_ORDERS_WEBHOOK_ENABLED:'true',
 MERCADOPAGO_WEBHOOK_SECRET:secret,MERCADOPAGO_TEST_ACCESS_TOKEN:'TEST'});
const provider={id:mpId,external_reference:orderId,currency:'BRL',
 total_amount:'130.10',total_paid_amount:'130.10',
 status:'processed',status_detail:'accredited',
 transactions:{payments:[{status:'processed',status_detail:'accredited',
  paid_amount:'130.10'}]}};
test('assina HMAC, consulta Order independentemente e só então confirma pagamento',async()=>{
 const database=db();
 const result=await processOrdersWebhook({request:await request(),env:env(database),
  fetchImpl:async(url,opts)=>{
   assert.equal(url,'https://api.mercadopago.com/v1/orders/'+mpId);
   assert.equal(opts.headers.Authorization,'Bearer TEST');
   return {ok:true,json:async()=>provider};
  }});
 assert.equal(result.status,'paid');
 assert.equal(result.vaviOrderCreated,false);
 assert.equal(database.batches,1);
});
test('assinatura incorreta é rejeitada antes de consultar provedor',async()=>{
 let called=false;
 await assert.rejects(async()=>processOrdersWebhook({
  request:await request(mpId,'outro-segredo'),env:env(db()),
  fetchImpl:async()=>{called=true;return {ok:true,json:async()=>provider}}
 }),{code:'invalid_notification'});
 assert.equal(called,false);
});
test('Orders criadas ou pendentes não marcam pedido como pago',async()=>{
 const database=db();
 const response=await processOrdersWebhook({request:await request(),env:env(database),
  fetchImpl:async()=>({ok:true,json:async()=>({...provider,status:'created'})})});
 assert.equal(response.processed,false);
 assert.equal(database.batches,0);
});
test('valores divergentes e referências falsas bloqueiam baixa financeira',async()=>{
 for(const fake of [{...provider,total_amount:'130.11'},
  {...provider,external_reference:'ord_ffffffffffffffffffffffffffffffff'}]){
  const database=db();
  await assert.rejects(async()=>processOrdersWebhook({request:await request(),
   env:env(database),fetchImpl:async()=>({ok:true,json:async()=>fake})}),
   {code:'orders_payment_mismatch'});
  assert.equal(database.batches,0);
 }
});
test('webhook Orders permanece bloqueado por padrão',async()=>{
 await assert.rejects(async()=>processOrdersWebhook({
  request:await request(),env:{}
 }),{code:'orders_webhook_disabled'});
});
test('vínculo só aceita ID ORDTST e pedido UUID hexadecimal',async()=>{
 await assert.rejects(()=>saveOrdersLink(db(),'ORD123',orderId),
  {code:'orders_invalid_link'});
 const r=await saveOrdersLink(db(),mpId,orderId);
 assert.equal(r.saved,true);
});
