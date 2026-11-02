import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
const base='https://example.test/api/checkout/test';
const secret='t'.repeat(48);
const env={DB:{},CHECKOUT_TEST_ENABLED:'true',WEBHOOK_PROCESSING_ENABLED:'true',
  DELIVERY_PERSISTENCE_ENABLED:'true',MERCADOPAGO_WEBHOOK_SECRET:'mock',
  CHECKOUT_TEST_API_KEY:secret};
const req=(authorization,body='{}')=>new Request(base,{
  method:'POST',headers:{'Content-Type':'application/json',
    ...(authorization?{'Authorization':authorization}:{})},body
});
test('nunca processa checkout quando flag está desligada',async()=>{
  const result=await worker.fetch(req('Bearer '+secret),{...env,CHECKOUT_TEST_ENABLED:'false'});
  assert.equal(result.status,503);
});
test('rejeita chamadas anônimas e token incorreto antes de gravar pedido',async()=>{
  for(const auth of [null,'Bearer '+'w'.repeat(48),'Bearer short']){
    const result=await worker.fetch(req(auth),env);
    assert.equal(result.status,401);
    assert.equal((await result.json()).error,'checkout_unauthorized');
  }
});
test('chave de homologação temporária expira e não substitui a chave original',async()=>{
  const temporary='p'.repeat(56);
  const now=Date.now();
  const base={...env,CHECKOUT_TEST_PROBE_KEY:temporary,
    CHECKOUT_TEST_PROBE_EXPIRES_AT:String(now+2*60*1000)};
  const valid=await worker.fetch(req('Bearer '+temporary,'{'),base);
  assert.equal(valid.status,400);
  const expired=await worker.fetch(req('Bearer '+temporary,'{'),{
    ...base,CHECKOUT_TEST_PROBE_EXPIRES_AT:String(now-1000)
  });
  assert.equal(expired.status,401);
  const original=await worker.fetch(req('Bearer '+secret,'{'),base);
  assert.equal(original.status,400);
  const tooLong=await worker.fetch(req('Bearer '+temporary,'{'),{
    ...base,CHECKOUT_TEST_PROBE_EXPIRES_AT:String(now+3600000)
  });
  assert.equal(tooLong.status,401);
});
test('resposta de autorização privada respeita CORS da vitrine autorizada',async()=>{
  const signed=req(null);
  const reqWithOrigin=new Request(signed.url,{method:'POST',
    headers:{'Content-Type':'application/json','Origin':'https://www.douglasassumpcao.com.br'},
    body:'{}'});
  const res=await worker.fetch(reqWithOrigin,{...env,
    ALLOWED_ORIGINS:'https://www.douglasassumpcao.com.br'});
  assert.equal(res.status,401);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'),
    'https://www.douglasassumpcao.com.br');
  assert.deepEqual(await res.json(),{error:'checkout_unauthorized'});
});
test('segredo aceito ainda valida JSON e nunca expõe sua chave',async()=>{
  const result=await worker.fetch(req('Bearer '+secret,'{'),env);
  assert.equal(result.status,400);
  const data=await result.text();
  assert.equal(data.includes(secret),false);
});

test('sem chave privada configurada a operação sempre falha de forma segura',async()=>{
  const result=await worker.fetch(req('Bearer '+secret),{
    ...env,CHECKOUT_TEST_API_KEY:undefined
  });
  assert.equal(result.status,503);
  assert.equal((await result.json()).error,'checkout_not_ready');
});

test('homologação bem-sucedida devolve link e cabeçalhos CORS para o Safari',async()=>{
  const origin='https://www.douglasassumpcao.com.br';
  const keyB64=Buffer.alloc(32,7).toString('base64');
  const sku='salve-regina-preta-g';
  const shippingConfig=JSON.stringify({[sku]:{
    id:'019aa7eb-d437-721a-bc8d-69d5a2754865',sku:'0000001',
    amount:25,weight:0.25,height:10,width:250,length:300
  }});
  const db={prepare(sql){return {
    bind(){return {
      first:async()=>({
        sku,label:'Preta G',price_cents:10990,available:0,
        name:'Camiseta Salve Regina',product_enabled:0,product_verified:0
      }),
      run:async()=>({meta:{changes:1}})
    };}
  };},batch:async statements=>statements.map(()=>({meta:{changes:1}}))};
  const testEnv={...env,DB:db,ALLOWED_ORIGINS:origin,
    CHECKOUT_TEST_CATALOG_OVERRIDE:'true',
    CHECKOUT_TEST_PAYMENT_MODE:'preferences',
    MERCADOPAGO_TEST_ACCESS_TOKEN:'test-token-only',
    DELIVERY_ENCRYPTION_KEY_B64:keyB64,
    VAVI_CLIENT_ID:'test-client',VAVI_CLIENT_SECRET:'test-secret',
    VAVI_SHIPPING_PRODUCTS_JSON:shippingConfig};
  const payload={items:[{sku,quantity:1}],zipCode:'13218752',
    shippingOptionId:'carrier-1',buyer:{
      name:'Comprador Fictício',email:'test@example.invalid',
      phone:'11999990000',taxId:'12345678909',zipCode:'13218752',
      street:'Rua Teste',number:'1',neighborhood:'Centro',
      city:'Jundiaí',state:'SP'
    }};
  const originalFetch=globalThis.fetch;
  const urls=[];
  globalThis.fetch=async url=>{
    urls.push(String(url));
    if(String(url).endsWith('/api/Auth/Token'))
      return Response.json({data:{access_token:'vavi-sandbox-token'}});
    if(String(url).endsWith('/api/Customers/Simulate'))
      return Response.json({data:[{id:'carrier-1',name:'SEDEX',
        shippingCost:13.69,deliveryTime:8,isActive:true}]});
    if(String(url).endsWith('/checkout/preferences'))
      return Response.json({id:'pref-test-only',
        init_point:'https://www.mercadopago.com.br/checkout/start?pref_id=test'});
    throw Error('Unexpected external network request');
  };
  try{
    const request=new Request(base,{method:'POST',headers:{
      'Origin':origin,'Content-Type':'application/json',
      'Authorization':'Bearer '+secret
    },body:JSON.stringify(payload)});
    const response=await worker.fetch(request,testEnv);
    assert.equal(response.status,201);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
    assert.match(response.headers.get('Vary')||'',/Origin/);
    const body=await response.json();
    assert.equal(body.mode,'test');
    assert.equal(body.amountCents,12359);
    assert.match(body.checkoutUrl,/^https:\/\/www\.mercadopago\.com\.br\//);
    assert.deepEqual(urls.map(x=>new URL(x).pathname),
      ['/api/Auth/Token','/api/Customers/Simulate','/checkout/preferences']);
  }finally{globalThis.fetch=originalFetch;}
});

test('erros de JSON da homologação também apresentam CORS',async()=>{
  const origin='https://www.douglasassumpcao.com.br';
  const request=new Request(base,{method:'POST',
    headers:{Origin:origin,'Content-Type':'application/json',
      Authorization:'Bearer '+secret},body:'{'});
  const response=await worker.fetch(request,{...env,ALLOWED_ORIGINS:origin});
  assert.equal(response.status,400);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
});
