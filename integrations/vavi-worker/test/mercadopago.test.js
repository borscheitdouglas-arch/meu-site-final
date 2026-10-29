import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {PaymentError,buildPreference,createPreference,verifyPayment} from '../src/mercadopago.js';
import {verifyWebhookSignature} from '../src/mp-webhook.js';

const order={
  code:'DA-ORDER-20261029-001',currency:'BRL',status:'ready_for_payment',
  pricingVerified:true,shippingVerified:true,subtotalCents:10000,
  shippingCents:2000,totalCents:12000,
  items:[{sku:'CAM-SALVE-M',name:'Camiseta Salve Regina',quantity:2,unitPriceCents:5000}]
};
const config={
  MP_ACCESS_TOKEN:'TEST_TOKEN_NOT_REAL',
  MP_SELLER_ID:'123456',
  MP_ENVIRONMENT:'test',
  MP_RETURN_BASE_URL:'https://www.douglasassumpcao.com.br/',
  MP_NOTIFICATION_URL:'https://payments.example.com/'
};
const fakePreference={
  id:'pref-1',
  init_point:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1'
};
test('nunca cria preferência se ainda falta frete, preço ou status',()=>{
  for (const change of [
    {shippingVerified:false},{pricingVerified:false},
    {status:'preview'},{shippingCents:null},{totalCents:10000}
  ]) {
    assert.throws(()=>buildPreference({...order,...change},{
      returnBaseUrl:config.MP_RETURN_BASE_URL,
      notificationUrl:config.MP_NOTIFICATION_URL
    }),PaymentError);
  }
});
test('preço e frete persistidos compõem itens da preferência uma vez só',()=>{
  const pref=buildPreference(order,{
    returnBaseUrl:config.MP_RETURN_BASE_URL,
    notificationUrl:config.MP_NOTIFICATION_URL
  });
  assert.equal(pref.external_reference,order.code);
  assert.equal(pref.items.length,2);
  assert.equal(pref.items[0].unit_price,50);
  assert.equal(pref.items[0].quantity,2);
  assert.equal(pref.items[1].title,'Frete');
  assert.equal(pref.items[1].unit_price,20);
  assert.equal(pref.shipments,undefined);
  assert.equal(pref.auto_return,'approved');
});
test('preferência precisa de segredo no servidor; resposta deve ser URL do Mercado Pago',async()=>{
  await assert.rejects(
    createPreference({order,env:{...config,MP_ACCESS_TOKEN:''},fetcher:()=>{throw Error('não') }}),
    PaymentError
  );
  const requests=[];
  const result=await createPreference({order,env:config,fetcher:async(url,options)=>{
    requests.push({url,options});
    return {ok:true,json:async()=>fakePreference};
  }});
  assert.equal(result.id,'pref-1');
  assert.equal(requests.length,1);
  assert.match(requests[0].options.headers.Authorization,/Bearer TEST_TOKEN/);
  assert.equal(result.checkoutUrl,fakePreference.init_point);
  await assert.rejects(createPreference({order,env:config,fetcher:async()=>({
    ok:true,json:async()=>({id:'x',init_point:'https://evil.example/collect'})
  })}), PaymentError);
});
test('pagamento é conciliado por referência, conta, ambiente e valor',async()=>{
  const payment={
    id:445566,external_reference:order.code,status:'approved',currency_id:'BRL',
    collector_id:123456,transaction_amount:120,live_mode:false
  };
  const makeFetcher=(overrides={})=>async()=>({ok:true,json:async()=>({...payment,...overrides})});
  const approved=await verifyPayment({paymentId:'445566',order,env:config,fetcher:makeFetcher()});
  assert.equal(approved.approved,true);
  const pending=await verifyPayment({paymentId:'445566',order,env:config,fetcher:makeFetcher({status:'pending'})});
  assert.equal(pending.approved,false);
  for (const changes of [
    {external_reference:'OTHER'},{transaction_amount:1},
    {collector_id:999},{currency_id:'USD'},{live_mode:true}
  ]) {
    await assert.rejects(
      verifyPayment({paymentId:'445566',order,env:config,fetcher:makeFetcher(changes)}),
      PaymentError
    );
  }
});
test('webhook exige assinatura real, timestamp recente e request-id',async()=>{
  const ts='1761760000000';
  const requestId='request-abc';
  const dataId='445566';
  const secret='segredo-de-teste';
  const manifest='id:'+dataId+';request-id:'+requestId+';ts:'+ts+';';
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(manifest));
  const hex=Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
  const req=new Request('https://payments.example.com/webhook?data.id='+dataId,
    {method:'POST',headers:{'x-request-id':requestId,'x-signature':'ts='+ts+',v1='+hex}});
  const params={request:req,secret,nowMs:Number(ts),subtle:webcrypto.subtle};
  assert.equal(await verifyWebhookSignature(params),true);
  assert.equal(await verifyWebhookSignature({...params,secret:'outro segredo'}),false);
  assert.equal(await verifyWebhookSignature({...params,nowMs:Number(ts)+11*60000}),false);
  const missing=new Request('https://payments.example.com/webhook?data.id='+dataId,{method:'POST'});
  assert.equal(await verifyWebhookSignature({...params,request:missing}),false);
});
