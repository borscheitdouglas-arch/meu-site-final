import test from 'node:test';
import assert from 'node:assert/strict';
import {createVaviDraft} from './vavi-draft-client.js';
const orderId='ord_0123456789abcdef0123456789abcdef';
const args={
  accessToken:'fake-jwt-for-test',
  approvedPayment:{orderId,status:'paid'},
  payload:{code:orderId,requestClientId:orderId,
    items:[{name:'Camiseta Salve Regina',quantity:1}]}
};
test('não envia pedido à VAVI sem confirmação de pagamento',async()=>{
  await assert.rejects(()=>createVaviDraft({...args,
    approvedPayment:{orderId,status:'awaiting_payment'},
    fetchImpl:()=>{throw Error('should not call')}}),{code:'vavi_draft_not_ready'});
});
test('não envia pedido com identificador ou itens inconsistentes',async()=>{
  await assert.rejects(()=>createVaviDraft({...args,payload:{code:'other',
    items:[{name:'shirt',quantity:1}]}}),{code:'vavi_draft_not_ready'});
});
test('202 significa rascunho recebido, nunca produção iniciada',async()=>{
  let called=false;
  const r=await createVaviDraft({...args,fetchImpl:async(url,opt)=>{
    called=true;
    assert.equal(url,'https://api.printbee.com.br/api/Customers/Integrations/Orders');
    assert.equal(opt.headers.Authorization,'Bearer fake-jwt-for-test');
    assert.equal(JSON.parse(opt.body).code,orderId);
    return {status:202,json:async()=>({code:0,data:{id:'draft-demo',status:'Pending'}})};
  }});
  assert.equal(called,true);
  assert.equal(r.status,'vavi_draft');
});
test('não marca pedido como rascunho se a VAVI não retornar 202',async()=>{
  await assert.rejects(()=>createVaviDraft({...args,
    fetchImpl:async()=>({status:400})}),{code:'vavi_draft_rejected'});
});
