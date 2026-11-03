import test from 'node:test';
import assert from 'node:assert/strict';
import {registerManualVaviOrder,getLivePaidDelivery,listLivePaidOrders} from './live-order-admin.js';
import {encryptDelivery} from './delivery-repository.js';
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

test('painel autenticado lista os itens exatos pagos, variação, quantidades e endereço',async()=>{
  const key=Buffer.alloc(32,18).toString('base64');
  const buyer={name:'Pessoa Exemplo',email:'comprador@example.com',phone:'11999999999',
    taxId:'12345678909',zipCode:'01001000',street:'Rua Exemplo',
    number:'7',complement:'apto 2',neighborhood:'Centro',city:'São Paulo',state:'SP'};
  const delivery=await encryptDelivery(id,buyer,key);
  const items=[
    {sku:'salve-regina-preta-g',label:'Camiseta Salve Regina — Preta G',
      quantity:2,unit_price_cents:10990,line_total_cents:21980},
    {sku:'caneca-salve-regina-pb',label:'Caneca P&B Salve Regina — Nossa Senhora',
      quantity:1,unit_price_cents:4990,line_total_cents:4990}
  ];
  const db={
    prepare(sql){
      return {
        bind(orderId){
          assert.equal(orderId,id);
          return {
            first:async()=>{
              if(sql.includes('store_order_delivery'))
                return {encrypted_payload:delivery.encryptedPayload,iv:delivery.iv};
              if(sql.includes('store_orders'))
                return {id,status:'paid',shipping_option_id:'carrier-1',
                  total_cents:29000,destination_zip:'01001000'};
              throw Error('unexpected first');
            },
            all:async()=>{
              if(sql.includes('store_order_items'))return {results:items};
              throw Error('unexpected all');
            }
          };
        }
      };
    }
  };
  const result=await getLivePaidDelivery({DB:db,DELIVERY_ENCRYPTION_KEY_B64:key},id);
  assert.equal(result.order.status,'paid');
  assert.equal(result.buyer.zipCode,'01001000');
  assert.deepEqual(result.items,items);
});

test('sem itens salvos o painel recusa exibir pedido de produção incompleto',async()=>{
  const key=Buffer.alloc(32,18).toString('base64');
  const buyer={name:'Pessoa Exemplo',email:'comprador@example.com',phone:'11999999999',
    taxId:'12345678909',zipCode:'01001000',street:'Rua Exemplo',
    number:'7',neighborhood:'Centro',city:'São Paulo',state:'SP'};
  const delivery=await encryptDelivery(id,buyer,key);
  const db={prepare(sql){return {bind(){return {
    first:async()=>sql.includes('store_order_delivery')?
      {encrypted_payload:delivery.encryptedPayload,iv:delivery.iv}:
      {id,status:'paid'},
    all:async()=>({results:[]})
  };}}}};
  await assert.rejects(
    ()=>getLivePaidDelivery({DB:db,DELIVERY_ENCRYPTION_KEY_B64:key},id),
    {code:'order_items_unavailable'});
});

test('listagem administrativa devolve resumo do pedido com peças e quantidade',async()=>{
  const db={prepare(sql){
    assert.match(sql,/GROUP_CONCAT/);
    return {all:async()=>({results:[{
      id,items_summary:'2× Camiseta Salve Regina — Preta G',
      items_quantity:2,total_cents:21980,status:'paid'
    }]})};
  }};
  const data=await listLivePaidOrders({DB:db});
  assert.equal(data.orders[0].items_quantity,2);
  assert.match(data.orders[0].items_summary,/Camiseta/);
});
