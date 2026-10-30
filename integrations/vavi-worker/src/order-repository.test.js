import test from 'node:test';
import assert from 'node:assert/strict';
import {newOrderId,prepareDraftOrder,insertDraftOrder,getOrderForPayment} from './order-repository.js';

const make=()=>({
  orderId:'ord_0123456789abcdef0123456789abcdef',
  lines:[{sku:'camisa-p',name:'Camiseta Salve Regina',variation:'Preta P',
    quantity:2,unitPriceCents:9900,totalCents:19800}],
  subtotalCents:19800,shippingCents:1500,
  shippingOptionId:'carrier_42',destinationZip:'13200000'
});
test('identificador possui 128 bits de aleatoriedade',()=>{
  const a=newOrderId(),b=newOrderId();
  assert.match(a,/^ord_[0-9a-f]{32}$/);
  assert.notEqual(a,b);
});
test('valida produtos, frete e total antes de escrever',()=>{
  const d=prepareDraftOrder(make());
  assert.equal(d.totalCents,21300);
  assert.equal(d.items[0].lineTotalCents,19800);
  for(const bad of [
    {...make(),destinationZip:'ABC'},
    {...make(),shippingOptionId:''},
    {...make(),subtotalCents:19801},
    {...make(),lines:[...make().lines,...make().lines]},
    {...make(),lines:[{...make().lines[0],totalCents:1}]}
  ]) assert.throws(()=>prepareDraftOrder(bad));
});
test('grava pedido e itens em único batch transacional',async()=>{
  const calls=[];
  const db={
    prepare(sql){return {bind(...params){
      calls.push({sql,params});
      return {sql,params,first:async()=>({id:params[0],status:'draft'})};
    }}},
    async batch(statements){assert.equal(statements.length,2);return statements.map(()=>({success:true}));}
  };
  const draft=prepareDraftOrder(make());
  const result=await insertDraftOrder(db,draft);
  assert.equal(result.status,'draft');
  assert.equal(result.totalCents,21300);
  assert.equal(calls.length,2);
  const queried=await getOrderForPayment(db,draft.id);
  assert.equal(queried.status,'draft');
});
test('erro de escrita não devolve pedido como concluído',async()=>{
  const db={
    prepare(sql){return {bind(...params){return {sql,params}}}},
    async batch(){throw new Error('db down')}
  };
  await assert.rejects(()=>insertDraftOrder(db,prepareDraftOrder(make())),
    {code:'order_write_failed'});
});
