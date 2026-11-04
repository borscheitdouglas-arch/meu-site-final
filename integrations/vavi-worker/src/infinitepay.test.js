import test from 'node:test';
import assert from 'node:assert/strict';
import {createInfinitePayCheckout,isInfinitePayCheckoutUrl} from './infinitepay-client.js';
import {processInfinitePayWebhook} from './infinitepay-webhook.js';

const id='ord_'+'a'.repeat(32);
const link='https://checkout.infinitepay.com.br/link/exemplo';
const buyer={name:'Comprador Exemplo',email:'exemplo@example.com',phone:'11988887777',
  zipCode:'01001000',street:'Rua Exemplo',number:'20',
  neighborhood:'Centro',city:'São Paulo',state:'SP'};
const args={
  order:{id,status:'draft',totalCents:12544},
  lines:[{name:'Camiseta Salve Regina',variation:'Preta G',quantity:1,unitPriceCents:10990}],
  shippingCents:1554,buyer,apiKey:'inchk_TEST_KEY',
  siteBaseUrl:'https://www.douglasassumpcao.com.br',
  webhookUrl:'https://api.example.com/api/payments/infinitepay-webhook'
};

test('link gerado com valor conferido, frete separado, Pix, 3x e vencimento',async()=>{
  let called=0;
  const result=await createInfinitePayCheckout({...args,fetchImpl:async (url,options)=>{
    called++;
    assert.equal(url,'https://api.checkout.infinitepay.io/links');
    assert.equal(options.headers['X-Api-Key'],args.apiKey);
    const body=JSON.parse(options.body);
    assert.equal(body.order_nsu,id);
    assert.deepEqual(body.items.map(i=>i.price),[10990,1554]);
    assert.equal(body.items.reduce((n,i)=>n+i.price*i.quantity,0),12544);
    assert.deepEqual(body.options.payment_methods_enabled,['credit_card','pix']);
    assert.equal(body.options.assured_installments,3);
    assert.equal(body.options.single_payment,true);
    assert.equal(body.options.require_delivery_address,false);
    assert.equal(body.customer.email,buyer.email);
    assert.equal(body.customer.phone_number,'+5511988887777');
    assert.equal(body.address.cep,buyer.zipCode);
    assert.ok(new Date(body.options.valid_until).getTime()>Date.now());
    assert.equal(body.webhook_url,args.webhookUrl);
    return {ok:true,json:async()=>({url:link})};
  }});
  assert.equal(called,1);
  assert.equal(result.checkoutUrl,link);
});

test('checkout bloqueia valores falsos e URLs externas',async()=>{
  await assert.rejects(()=>createInfinitePayCheckout({...args,shippingCents:1}),{code:'checkout_total_mismatch'});
  assert.equal(isInfinitePayCheckoutUrl('https://checkout.infinitepay.com.br.evil.com'),false);
  await assert.rejects(()=>createInfinitePayCheckout({...args,fetchImpl:async()=>({
    ok:true,json:async()=>({url:'https://evil.example/pay'})})}),{code:'payment_provider_unavailable'});
});

function dbStub(history){
  return {
    prepare(sql){return {bind(...bind){history.push({sql,bind});return {
      first:async()=>({id,status:'awaiting_payment',currency:'BRL',total_cents:12544,
        payment_environment:'live',ip_order_id:id})
    }}}},
    batch:async statements=>{history.push({kind:'batch',length:statements.length});return [
      {meta:{changes:1}},{meta:{changes:1}},{meta:{changes:1}},
      {results:[{status:'paid',transaction_nsu:'abc123-789'}]}
    ]}
  };
}
const notice={order_nsu:id,invoice_slug:'slug123',transaction_nsu:'abc123-789'};
const env={
  DB:null,INFINITEPAY_API_KEY:'inchk_FAKE',INFINITEPAY_HANDLE:'douglas-borscheit',
  INFINITEPAY_CHECKOUT_ENABLED:'true'
};
function req(obj){return new Request('https://worker.test/api/payments/infinitepay-webhook',{
  method:'POST',body:JSON.stringify(obj),headers:{'content-type':'application/json'}
});}
const check={success:true,paid:true,amount:12544,paid_amount:12999,
  installments:3,capture_method:'credit_card'};

test('notificação nunca aprova pedido sem consulta autenticada ao provedor',async()=>{
  let fetches=0,queued=0;
  const history=[];
  const result=await processInfinitePayWebhook({
    request:req(notice),env:{...env,DB:dbStub(history)},
    fetchImpl:async(url,options)=>{
      fetches++;
      assert.equal(url,'https://api.checkout.infinitepay.io/payment_check');
      assert.equal(options.headers['X-Api-Key'],env.INFINITEPAY_API_KEY);
      assert.deepEqual(JSON.parse(options.body),{
        handle:env.INFINITEPAY_HANDLE,order_nsu:id,
        transaction_nsu:'abc123-789',slug:'slug123'});
      return {ok:true,json:async()=>check};
    },
    queueDraft:async()=>{queued++;return {queued:false}}
  });
  assert.equal(fetches,1);
  assert.equal(queued,1);
  assert.equal(result.processed,true);
  assert.equal(result.orderId,id);
  assert.equal(history.filter(x=>x.kind==='batch').length,1);
});

test('pagamento falso ou com valor divergente jamais é registrado',async()=>{
  for(const denied of [{success:true,paid:false,amount:12544},
    {...check,amount:12545},{...check,paid_amount:12000}]){
    const history=[];
    const result=()=>processInfinitePayWebhook({
      request:req(notice),env:{...env,DB:dbStub(history)},
      fetchImpl:async()=>({ok:true,json:async()=>denied}),
      queueDraft:async()=>{throw Error('must not queue')}
    });
    if(denied.paid===false)
      assert.equal((await result()).processed,false);
    else
      await assert.rejects(result,{code:'payment_mismatch'});
    assert.equal(history.some(x=>x.kind==='batch'),false);
  }
});

test('webhook de reembolso não transforma pedido em pagamento aprovado',async()=>{
  let called=false;
  const result=await processInfinitePayWebhook({
    request:req({event:'refunded',data:notice}),env:{...env,DB:dbStub([])},
    fetchImpl:async()=>{called=true;return {};}
  });
  assert.equal(result.processed,false);
  assert.equal(called,false);
});


test('HTTP 401, 403, 422 e 503 do gateway são identificados sem expor resposta',async()=>{
  for(const [status,expected] of [
    [401,'infinitepay_auth_failed'],
    [403,'infinitepay_auth_failed'],
    [422,'infinitepay_request_rejected'],
    [400,'infinitepay_request_rejected'],
    [503,'infinitepay_provider_unavailable']
  ]){
    await assert.rejects(
      ()=>createInfinitePayCheckout({...args,fetchImpl:async()=>({
        ok:false,status,json:async()=>({error:'dados privados ignorados'})
      })}),
      error=>{
        assert.equal(error.code,expected);
        assert.equal(error.providerHttpStatus,status);
        assert.equal(String(error.message).includes('dados privados'),false);
        return true;
      }
    );
  }
});
