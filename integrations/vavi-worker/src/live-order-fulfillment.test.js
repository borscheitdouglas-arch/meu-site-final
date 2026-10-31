import test from 'node:test';
import assert from 'node:assert/strict';
import {registerManualVaviOrder} from './live-order-admin.js';
import worker from './index.js';

const id='ord_'+'a'.repeat(32);

function memoryDb(status='paid') {
  const row={status,vavi_order_id:null};
  const db={
    prepare(sql){return {
      bind(...args){return {
        async run(){
          if(!sql.includes('UPDATE store_orders'))throw Error('unexpected update');
          if(row.status==='paid' && row.vavi_order_id===null){
            row.status='vavi_draft';row.vavi_order_id=args[0];
            return {meta:{changes:1}};
          }
          return {meta:{changes:0}};
        },
        async first(){return {...row};}
      };}
    };}
  };
  return {row,db};
}

test('pedido real pago pode ser registrado apenas uma vez com o mesmo id VAVI',async()=>{
  const {db,row}=memoryDb();
  const env={DB:db};
  const a=await registerManualVaviOrder(env,id,'VAVI-10001');
  assert.deepEqual(a,{orderId:id,vaviOrderId:'VAVI-10001',
    status:'vavi_draft',alreadyRegistered:false});
  assert.equal(row.status,'vavi_draft');
  const duplicate=await registerManualVaviOrder(env,id,'VAVI-10001');
  assert.equal(duplicate.alreadyRegistered,true);
  await assert.rejects(()=>registerManualVaviOrder(env,id,'VAVI-10002'),
    {code:'fulfillment_not_allowed'});
});

test('pedidos pendentes e sem pagamento confirmado não podem ser produzidos',async()=>{
  const {db}=memoryDb('awaiting_payment');
  await assert.rejects(()=>registerManualVaviOrder({DB:db},id,'VAVI-10003'),
    {code:'fulfillment_not_allowed'});
});

test('identificadores inválidos são recusados sem tocar no banco',async()=>{
  const db={prepare(){throw Error('should not touch DB')}};
  await assert.rejects(()=>registerManualVaviOrder({DB:db},id,'x/y'),
    {code:'invalid_vavi_order_id'});
  await assert.rejects(()=>registerManualVaviOrder({DB:db},'ord_no','VAVI-1'),
    {code:'invalid_order_id'});
});

test('endpoint de registrar VAVI bloqueia operadores sem chave e responde ao preflight',async()=>{
  const origin='https://www.douglasassumpcao.com.br';
  const url='https://api.example.test/api/internal/live-orders/'+id+'/fulfillment';
  const env={ALLOWED_ORIGINS:origin,SHOP_ADMIN_API_KEY:'x'.repeat(40)};
  const preflight=await worker.fetch(new Request(url,{method:'OPTIONS',
    headers:{Origin:origin,'Access-Control-Request-Method':'POST',
      'Access-Control-Request-Headers':'Authorization,Content-Type'}}),env);
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  const unauth=await worker.fetch(new Request(url,{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({vaviOrderId:'VAVI-2'})
  }),env);
  assert.equal(unauth.status,401);
  assert.equal((await unauth.json()).error,'unauthorized');
});
