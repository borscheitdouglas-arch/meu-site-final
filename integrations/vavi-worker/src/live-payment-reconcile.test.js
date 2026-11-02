import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileLivePayment} from './live-payment-reconcile.js';
import worker from './index.js';

const orderId='ord_'+'a'.repeat(32);
const order={id:orderId,status:'awaiting_payment',currency:'BRL',
  total_cents:12359,mp_preference_id:'pref_live',payment_environment:'live',
  mp_payment_id:null};
const payment={id:987654321,external_reference:orderId,live_mode:true,
  status:'approved',currency_id:'BRL',transaction_amount:123.59};
function envWithDb(){
 const calls=[];
 const db={
   prepare(sql){
     return {bind(...args){calls.push({sql,args});
       return {first:async()=>order};
     }};
   },
   batch:async queries=>{
     assert.equal(queries.length,3);
     return [{meta:{changes:1}},{meta:{changes:1}},
       {results:[{id:orderId,status:'paid',mp_payment_id:'987654321'}]}];
   }
 };
 return {env:{DB:db,MERCADOPAGO_LIVE_ACCESS_TOKEN:'FAKE-LIVE'},calls};
}
const response=body=>({ok:true,json:async()=>body});

test('pagamento real aprovado e de valor idêntico libera o pedido pelo ID oficial',async()=>{
 const {env,calls}=envWithDb();
 const result=await reconcileLivePayment(env,'987654321',{
   fetchImpl:async(url,opts)=>{
     assert.equal(url,'https://api.mercadopago.com/v1/payments/987654321');
     assert.equal(opts.headers.Authorization,'Bearer FAKE-LIVE');
     return response(payment);
   }});
 assert.equal(result.status,'paid');
 assert.equal(result.orderId,orderId);
 assert.equal(result.vaviOrderCreated,false);
 assert.ok(calls.some(c=>c.sql.includes('payment_environment')));
});
test('não aceita transação de sandbox nem valor divergente',async()=>{
 for(const changed of [{live_mode:false},{transaction_amount:10},
     {currency_id:'USD'},{external_reference:'ord_'+'b'.repeat(32)}]){
   const {env}=envWithDb();
   await assert.rejects(()=>reconcileLivePayment(env,'987654321',{
     fetchImpl:async()=>response({...payment,...changed})
   }),{code:'payment_mismatch'});
 }
});
test('pagamento pendente e IDs inválidos não liberam o pedido',async()=>{
 const {env}=envWithDb();
 await assert.rejects(()=>reconcileLivePayment(env,'not-a-number'),{code:'invalid_payment_id'});
 await assert.rejects(()=>reconcileLivePayment(env,'987654321',{
   fetchImpl:async()=>response({...payment,status:'pending'})
 }),{code:'payment_not_approved'});
});
test('rota administrativa nega acesso sem a chave mesmo com ID correto',async()=>{
 const env={DB:{},SHOP_ADMIN_API_KEY:'x'.repeat(40)};
 const req=new Request('https://api.test/api/internal/live-payments/reconcile',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({paymentId:'987654321'})
 });
 const result=await worker.fetch(req,env);
 assert.equal(result.status,401);
 assert.equal((await result.json()).error,'unauthorized');
});
test('preflight permite acesso autenticado a partir da loja',async()=>{
 const env={ALLOWED_ORIGINS:'https://www.douglasassumpcao.com.br'};
 const req=new Request('https://api.test/api/internal/live-payments/reconcile',{
   method:'OPTIONS',headers:{Origin:'https://www.douglasassumpcao.com.br',
     'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Authorization,Content-Type'}
 });
 const res=await worker.fetch(req,env);
 assert.equal(res.status,204);
 assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://www.douglasassumpcao.com.br');
});
