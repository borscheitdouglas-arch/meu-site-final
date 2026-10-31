import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptDelivery} from './delivery-repository.js';
import {enqueuePaidVaviDraft,dispatchVaviDraft,vaviAutoDraftReady,
  processPendingPaidVaviDrafts} from './vavi-auto-draft.js';

const ID='ord_'+('a'.repeat(32));
const key=Buffer.alloc(32,7).toString('base64');
const buyer={name:'Cliente Teste',email:'cliente@example.test',
  phone:'11999990000',taxId:'12345678909',
  zipCode:'13214610',street:'Rua de Teste',number:'15',complement:'',
  neighborhood:'Centro',city:'Jundiaí',state:'SP'};
const active={
  VAVI_AUTO_DRAFT_ENABLED:'true',LIVE_WEBHOOK_ENABLED:'true',
  LIVE_PRODUCT_APPROVED:'true',LIVE_POLICY_APPROVED:'true',
  VAVI_INTEGRATION_API_KEY:'pb_fake-api-key-for-tests',
  DELIVERY_ENCRYPTION_KEY_B64:key
};
function setup(encrypted) {
  let state='pending',vaviId=null,sends=0;
  const db={prepare(sql){
    return {bind(...args){return {
      async run(){
        if(sql.includes("INSERT OR IGNORE INTO store_vavi_draft_dispatch"))
          return {meta:{changes:1}};
        if(sql.includes("SET state='sending'")){
          if(state!=='pending')return {meta:{changes:0}};
          state='sending';return {meta:{changes:1}};
        }
        if(sql.includes("SET state='submitted'")){
          if(state!=='sending')return {meta:{changes:0}};
          state='submitted';vaviId=args[0];return {meta:{changes:1}};
        }
        if(sql.includes("SET state='needs_review'")){
          if(state==='sending')state='needs_review';
          return {meta:{changes:1}};
        }
        throw Error('unexpected SQL run');
      },
      async first(){
        if(sql.includes('FROM store_orders'))
          return {id:ID,status:'paid',payment_environment:'live',
            subtotal_cents:10990,shipping_cents:1500,total_cents:12490,
            destination_zip:buyer.zipCode,mp_payment_id:'12345'};
        if(sql.includes('FROM store_order_delivery'))
          return encrypted;
        throw Error('unexpected SQL first');
      },
      async all(){
        if(sql.includes('FROM store_order_items'))
          return {results:[{sku:'salve-regina-preta-g',
            label:'Camiseta Salve Regina — Preta G',
            quantity:1,unit_price_cents:10990}]};
        if(sql.includes('NOT EXISTS'))return {results:[]};
        if(sql.includes('FROM store_vavi_draft_dispatch q'))
          return {results:state==='pending'?[{order_id:ID}]:[]};
        return {results:[]};
      }
    }}};
  }};
  return {db,state:()=>state,vaviId:()=>vaviId,sends:()=>sends,
    send:async args=>{
      sends++;
      assert.equal(args.payload.code,ID);
      assert.equal(args.payload.buyer.email,buyer.email);
      assert.equal(args.payload.paidAmount,124.90);
      assert.equal(args.payload.freightAmount,15);
      assert.equal(args.approvedPayment.status,'paid');
      return {status:'vavi_draft',response:{data:{draftId:'DRAFT-001'}}};
    }};
}

test('desativado por padrão: não enfileira nem chama VAVI',async()=>{
  assert.equal(vaviAutoDraftReady({}),false);
  assert.deepEqual(await enqueuePaidVaviDraft({},ID),
    {queued:false,reason:'disabled'});
  assert.deepEqual(await processPendingPaidVaviDrafts({}),
    {processed:0,reason:'disabled'});
});

test('pagamento previamente aprovado cria um único rascunho e registra ID',async()=>{
  const encrypted=await encryptDelivery(ID,buyer,key);
  const m=setup({encrypted_payload:encrypted.encryptedPayload,iv:encrypted.iv});
  const env={...active,DB:m.db};
  assert.equal((await enqueuePaidVaviDraft(env,ID)).queued,true);
  const first=await dispatchVaviDraft(env,ID,m.send);
  assert.deepEqual(first,{sent:true,orderId:ID,draftId:'DRAFT-001'});
  assert.equal(m.state(),'submitted');
  assert.equal(m.vaviId(),'DRAFT-001');
  const repeated=await dispatchVaviDraft(env,ID,m.send);
  assert.equal(repeated.reason,'already_claimed');
  assert.equal(m.sends(),1);
});

test('timeout de VAVI gera revisão manual, sem repetição automática',async()=>{
  const encrypted=await encryptDelivery(ID,buyer,key);
  const m=setup({encrypted_payload:encrypted.encryptedPayload,iv:encrypted.iv});
  const env={...active,DB:m.db};
  const first=await dispatchVaviDraft(env,ID,async()=>{throw Error('network timeout')});
  assert.equal(first.reason,'needs_review');
  assert.equal(m.state(),'needs_review');
  assert.equal((await dispatchVaviDraft(env,ID,m.send)).reason,'already_claimed');
  assert.equal(m.sends(),0);
});

test('pedido inválido é recusado antes do envio',async()=>{
  const env={...active,DB:{prepare(){throw Error('should not query')}}};
  await assert.rejects(()=>enqueuePaidVaviDraft(env,'bad'),{code:'invalid_order_id'});
  await assert.rejects(()=>dispatchVaviDraft(env,'bad'),{code:'invalid_order_id'});
});
