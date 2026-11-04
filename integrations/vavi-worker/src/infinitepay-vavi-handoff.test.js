import test from 'node:test';
import assert from 'node:assert/strict';
import {processInfinitePayWebhook} from './infinitepay-webhook.js';

const id='ord_'+'b'.repeat(32);
const trx='txn-verified-127';
const notice={event:'paid',data:{
  order_nsu:id,invoice_slug:'invoice123',transaction_nsu:trx
}};
const payment={success:true,paid:true,amount:6488,paid_amount:6488,
  installments:1,capture_method:'pix'};
const request=()=>new Request('https://worker.test/api/payments/infinitepay-webhook',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(notice)
});
const cfg={
  INFINITEPAY_API_KEY:'inchk_MOCK_ONLY',
  INFINITEPAY_HANDLE:'fake-merchant',
  INFINITEPAY_CHECKOUT_ENABLED:'true',
  LIVE_WEBHOOK_ENABLED:'true',
  LIVE_PRODUCT_APPROVED:'true',
  LIVE_POLICY_APPROVED:'true',
  VAVI_CLIENT_ID:'dummy-vavi-id',
  VAVI_CLIENT_SECRET:'dummy-vavi-secret',
  DELIVERY_ENCRYPTION_KEY_B64:'test-only'
};

function fakeDb(){
  const writes=[];
  return {
    writes,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              assert.match(sql,/store_infinitepay_links/);
              return {id,status:'awaiting_payment',currency:'BRL',
                total_cents:6488,payment_environment:'live',ip_order_id:id};
            },
            async run() {
              writes.push({sql,values});
              return {meta:{changes:1}};
            }
          };
        }
      };
    },
    async batch(statements){
      writes.push({kind:'paid_batch',count:statements.length});
      return [
        {meta:{changes:1}},{meta:{changes:1}},
        {meta:{changes:1}},
        {results:[{status:'paid',transaction_nsu:trx}]}
      ];
    }
  };
}
test('Pix verificado é persistido e enfileira rascunho sem chamar a API VAVI',async()=>{
  const db=fakeDb();
  let calls=0;
  const result=await processInfinitePayWebhook({
    request:request(),env:{...cfg,VAVI_AUTO_DRAFT_ENABLED:'true',DB:db},
    fetchImpl:async(url,opts)=>{
      calls++;
      assert.equal(url,'https://api.checkout.infinitepay.io/payment_check');
      assert.equal(opts.headers['X-Api-Key'],cfg.INFINITEPAY_API_KEY);
      const body=JSON.parse(opts.body);
      assert.deepEqual(body,{handle:cfg.INFINITEPAY_HANDLE,order_nsu:id,
        transaction_nsu:trx,slug:'invoice123'});
      return {ok:true,json:async()=>payment};
    }
  });
  assert.equal(result.processed,true);
  assert.equal(result.vaviQueued,true);
  assert.equal(calls,1);
  assert.equal(db.writes.filter(x=>x.kind==='paid_batch').length,1);
  const queued=db.writes.filter(x=>x.sql?.includes('store_vavi_draft_dispatch'));
  assert.equal(queued.length,1);
  assert.match(queued[0].sql,/store_infinitepay_payments/);
  assert.match(queued[0].sql,/paid_amount_cents/);
  assert.equal(queued[0].values[0],id);
  // Nenhuma rede VAVI está acessível neste teste; o webhook apenas registra fila.
});

test('VAVI desativada nunca cria fila, mesmo com pagamento Pix aprovado',async()=>{
  const db=fakeDb();
  const result=await processInfinitePayWebhook({
    request:request(),env:{...cfg,VAVI_AUTO_DRAFT_ENABLED:'false',DB:db},
    fetchImpl:async()=>({ok:true,json:async()=>payment})
  });
  assert.equal(result.processed,true);
  assert.equal(result.vaviQueued,false);
  assert.equal(db.writes.filter(x=>x.sql?.includes('store_vavi_draft_dispatch')).length,0);
});

test('Pix com valor incompatível não altera pedido nem enfileira VAVI',async()=>{
  const db=fakeDb();
  await assert.rejects(()=>processInfinitePayWebhook({
    request:request(),env:{...cfg,VAVI_AUTO_DRAFT_ENABLED:'true',DB:db},
    fetchImpl:async()=>({ok:true,json:async()=>({...payment,amount:6500})})
  }),{code:'payment_mismatch'});
  assert.deepEqual(db.writes,[]);
});
