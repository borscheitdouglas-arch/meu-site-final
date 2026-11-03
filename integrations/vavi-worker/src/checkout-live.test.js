import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutLive,liveCheckoutReady} from './checkout-live.js';
import {processLivePaymentWebhook} from './live-payment-webhook.js';
import {authorizedLiveAdmin} from './live-order-admin.js';
import worker from './index.js';
import {webhookManifest} from './payment-verification.js';

const flags={
  LIVE_CHECKOUT_ENABLED:'true',LIVE_PRODUCT_APPROVED:'true',LIVE_POLICY_APPROVED:'true',
  LIVE_WEBHOOK_ENABLED:'true',DELIVERY_PERSISTENCE_ENABLED:'true',
  MERCADOPAGO_LIVE_ACCESS_TOKEN:'APP_USR_FAKE_LIVE_TOKEN',
  MERCADOPAGO_LIVE_WEBHOOK_SECRET:'FAKE-LIVE-SECRET',
  SHOP_ADMIN_API_KEY:'x'.repeat(40),
  DELIVERY_ENCRYPTION_KEY_B64:'placeholder-key',
  VAVI_CLIENT_ID:'fake',VAVI_CLIENT_SECRET:'fake',
  VAVI_SHIPPING_PRODUCTS_JSON:'{}'
};
const buyer={name:'Teste de pagamento',email:'teste@example.com',
  phone:'11999990000',taxId:'12345678909',zipCode:'13218752',
  street:'Rua Exemplo',number:'10',neighborhood:'Centro',
  city:'Jundiaí',state:'SP'};
const payload={items:[{sku:'salve-regina-preta-g',quantity:1}],
  zipCode:'13218752',shippingOptionId:'carrier-1',buyer};
const enabled={...flags,DB:{}};
const disabled={...enabled,LIVE_CHECKOUT_ENABLED:'false'};
const variant={sku:'salve-regina-preta-g',label:'Preta G',name:'Camiseta Salve Regina',
  product_enabled:1,product_verified:1,available:1,price_cents:10990};
const quote=[{id:'carrier-1',name:'Transportadora',shippingCost:15.54,
  isActive:true,deliveryTime:5}];

test('checkout permanece inativo, mesmo que o navegador solicite habilitação',async()=>{
  assert.equal(liveCheckoutReady(disabled),false);
  await assert.rejects(
    ()=>createCheckoutLive(disabled,{...payload,LIVE_CHECKOUT_ENABLED:'true'}),
    {code:'live_checkout_disabled'});
  const req=new Request('https://example.test/api/checkout/live',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)});
  const res=await worker.fetch(req,disabled);
  assert.equal(res.status,503);
  assert.equal((await res.json()).error,'live_checkout_disabled');
});

test('token test nunca é suficiente para liberar checkout real',()=>{
  const env={...enabled,MERCADOPAGO_LIVE_ACCESS_TOKEN:null,
    MERCADOPAGO_TEST_ACCESS_TOKEN:'TEST-CRED'};
  assert.equal(liveCheckoutReady(env),false);
});

test('checkout real: servidor calcula total e armazena entrega antes de criar preferência',async()=>{
  const seq=[];
  const db={prepare(sql){return {bind(){return {
    run:async()=>{seq.push(sql.includes("SET payment_environment='live'")?'mode':'awaiting');
      return {meta:{changes:1}};}
  };}}}};
  const result=await createCheckoutLive({...enabled,DB:db},
    {...payload,subtotalCents:1,freightCents:1,shippingCost:1}, {
      loadVariant:async()=>variant,
      simulateShipping:async()=>quote,
      encryptDelivery:async()=>{seq.push('encrypt');return {orderId:'x',encryptedPayload:'fake'};},
      insertDraftOrder:async()=>{seq.push('draft');},
      storeEncryptedDelivery:async()=>{seq.push('address');},
      createPreference:async input=>{
        seq.push('preference');
        assert.equal(input.shippingCents,1554);
        assert.equal(input.order.totalCents,12544);
        assert.equal(input.accessToken,flags.MERCADOPAGO_LIVE_ACCESS_TOKEN);
        assert.ok(input.notificationUrl.endsWith('/api/payments/live-webhook'));
        assert.equal(input.sandbox,false);
        return {preferenceId:'pref_live',checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
      }
    });
  assert.equal(result.mode,'live');
  assert.equal(result.totalCents,12544);
  assert.deepEqual(seq,['encrypt','draft','mode','address','preference','awaiting']);
});

test('sem persistência protegida do endereço não se cria pagamento',async()=>{
  let called=false;
  const db={prepare(){return {bind(){return {run:async()=>({meta:{changes:1}})};}}}};
  await assert.rejects(()=>createCheckoutLive({...enabled,DB:db},payload,{
    loadVariant:async()=>variant,
    simulateShipping:async()=>quote,
    encryptDelivery:async()=>({encryptedPayload:'fake'}),
    insertDraftOrder:async()=>{},
    storeEncryptedDelivery:async()=>{throw Error('failed storage');},
    createPreference:async()=>{called=true;return {};}
  }),/failed storage/);
  assert.equal(called,false);
});

test('endereço e CEP diferentes impedem cotação e pagamento',async()=>{
  await assert.rejects(()=>createCheckoutLive(enabled,{
    ...payload,buyer:{...buyer,zipCode:'01001000'}
  }),{code:'delivery_zip_mismatch'});
});

test('webhook de produção rejeita pagamento de teste ainda que HMAC seja válido',async()=>{
  const dataId='1234',requestId='req123';
  const ts=String(Date.now());
  const key=await crypto.subtle.importKey('raw',
    new TextEncoder().encode(flags.MERCADOPAGO_LIVE_WEBHOOK_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode(webhookManifest({dataId,requestId,timestamp:ts})));
  const mac=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const request=new Request('https://example.test/api/payments/live-webhook?type=payment&data.id=1234',{
    method:'POST',headers:{'x-signature':'ts='+ts+',v1='+mac,'x-request-id':requestId}
  });
  let dbCalls=0;
  const env={...enabled,DB:{prepare(){dbCalls++;throw Error('Should not touch D1')}}};
  await assert.rejects(()=>processLivePaymentWebhook({request,env,
    fetchImpl:async()=>({ok:true,json:async()=>({
      id:1234,live_mode:false,status:'approved',
      external_reference:'ord_'+'a'.repeat(32)
    })})}),{code:'payment_mismatch'});
  assert.equal(dbCalls,0);
});

test('admin só aceita segredo privado e não oferece dados de clientes sem ele',async()=>{
  assert.equal(await authorizedLiveAdmin(new Request('https://api.test/'),enabled),false);
  assert.equal(await authorizedLiveAdmin(new Request('https://api.test/',{
    headers:{Authorization:'Bearer '+'x'.repeat(40)}}),enabled),true);
});


test('navegador pode fazer preflight do painel sem acessar pedidos sem autorização',async()=>{
  const origin='https://www.douglasassumpcao.com.br';
  const env={...disabled,ALLOWED_ORIGINS:origin};
  for(const pathname of ['/api/internal/live-orders','/api/internal/live-orders/ord_'+'a'.repeat(32)]){
    const preflight=await worker.fetch(new Request('https://example.test'+pathname,{
      method:'OPTIONS',headers:{Origin:origin,
        'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'Authorization'}
    }),env);
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
    assert.match(preflight.headers.get('Access-Control-Allow-Headers')||'',/Authorization/);
  }
  const denied=await worker.fetch(new Request('https://example.test/api/internal/live-orders'),env);
  assert.equal(denied.status,401);
});

test('XG custa R$ 119,90 e o total é calculado no servidor',async()=>{
  const db={prepare(){return {bind(){return {run:async()=>({meta:{changes:1}})};}}}};
  const result=await createCheckoutLive({...enabled,DB:db},{
    ...payload,items:[{sku:'salve-regina-preta-xg',quantity:1}],
    subtotalCents:1
  },{
    loadVariant:async()=>({...variant,sku:'salve-regina-preta-xg',price_cents:11990}),
    simulateShipping:async()=>quote,
    encryptDelivery:async()=>({encryptedPayload:'encrypted',iv:'x'.repeat(24)}),
    insertDraftOrder:async()=>{},
    storeEncryptedDelivery:async()=>{},
    createPreference:async input=>{
      assert.equal(input.order.subtotalCents,11990);
      assert.equal(input.order.totalCents,13544);
      return {preferenceId:'fake',checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
    }
  });
  assert.equal(result.totalCents,13544);
});

test('XG não pode custar R$ 109,90 no banco durante checkout',async()=>{
  await assert.rejects(()=>createCheckoutLive(enabled,{
    ...payload,items:[{sku:'salve-regina-preta-xg',quantity:1}]
  },{
    loadVariant:async()=>({...variant,sku:'salve-regina-preta-xg',price_cents:10990})
  }),{code:'live_price_unapproved'});
});

test('tamanho não cadastrado é rejeitado antes de cobrar',async()=>{
  await assert.rejects(()=>createCheckoutLive(enabled,{
    ...payload,items:[{sku:'salve-regina-preta-xxg',quantity:1}]
  }),{code:'live_product_unavailable'});
});

test('caneca sem aprovação comercial é rejeitada antes de cotar ou cobrar',async()=>{
  let shippingCalled=false,paymentCalled=false;
  await assert.rejects(()=>createCheckoutLive(enabled,{
    ...payload,items:[{sku:'caneca-salve-regina-preta',quantity:1}]
  },{
    loadVariant:async()=>({
      ...variant,sku:'caneca-salve-regina-preta',
      price_cents:4990,product_enabled:0,product_verified:0,available:0
    }),
    simulateShipping:async()=>{shippingCalled=true;return quote;},
    createPreference:async()=>{paymentCalled=true;return {};}
  }),{code:'unavailable_product'});
  assert.equal(shippingCalled,false);
  assert.equal(paymentCalled,false);
});

test('caneca comercialmente aprovada só cria preferência após cotação e persistência',async()=>{
  const events=[];
  const db={prepare(){return {bind(){return {
    run:async()=>({meta:{changes:1}})
  };}}}};
  const result=await createCheckoutLive({...enabled,DB:db},{
    ...payload,items:[{sku:'caneca-salve-regina-preta',quantity:1}],
    subtotalCents:1
  },{
    loadVariant:async()=>({
      ...variant,sku:'caneca-salve-regina-preta',
      name:'Caneca Preta Salve Regina',label:'Partitura',
      price_cents:4990
    }),
    simulateShipping:async()=>{events.push('frete');return quote;},
    encryptDelivery:async()=>({encryptedPayload:'encrypted',iv:'x'.repeat(24)}),
    insertDraftOrder:async()=>{events.push('pedido');},
    storeEncryptedDelivery:async()=>{events.push('endereco');},
    createPreference:async input=>{
      events.push('pagamento');
      assert.equal(input.order.subtotalCents,4990);
      assert.equal(input.order.totalCents,6544);
      return {preferenceId:'fake',checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
    }
  });
  assert.equal(result.totalCents,6544);
  assert.deepEqual(events,['frete','pedido','endereco','pagamento']);
});


test('carrinho com duas camisetas: flag desligada bloqueia antes de cobrar',async()=>{
  let queries=0;
  const db={prepare(){queries++;throw Error('Não consultar dados nem chamar pagamento')}};
  await assert.rejects(()=>createCheckoutLive({...enabled,DB:db},{
    ...payload,items:[{sku:'salve-regina-preta-g',quantity:2}]
  }),{code:'live_multicart_disabled'});
  assert.equal(queries,0);
});

test('duas camisetas aprovadas criam preferência única após frete reconferido',async()=>{
  const events=[];
  const cfg=JSON.stringify({'salve-regina-preta-g':{
    id:'019aa7eb-d437-721a-bc8d-69d5a2754865',
    sku:'0001589',amount:70.71,weight:0.25,height:10,width:250,length:300
  }});
  const db={prepare(sql){
    return {bind(){
      return {
        first:async()=>{
          if(sql.includes('supplier_variant_cost_observations')){
            events.push('supplier');
            return {supplier_variant_sku:'0001589',observed_total_cents:7071};
          }
          throw Error('unexpected first');
        },
        run:async()=>({meta:{changes:1}})
      };
    }};
  }};
  const result=await createCheckoutLive({
    ...enabled,DB:db,LIVE_MULTICART_CHECKOUT_ENABLED:'true',
    VAVI_SHIPPING_PRODUCTS_JSON:cfg
  },{
    ...payload,items:[{sku:'salve-regina-preta-g',quantity:2}]
  },{
    loadVariant:async()=>variant,
    simulateShippingCart:async(env,zip,lines)=>{
      events.push('shipping');
      assert.equal(zip,'13218752');
      assert.deepEqual(lines,[{sku:'salve-regina-preta-g',
        quantity:2,supplierSku:'0001589',unitCostCents:7071}]);
      return quote;
    },
    encryptDelivery:async()=>({encryptedPayload:'cipher',iv:'f'.repeat(24)}),
    insertDraftOrder:async()=>{events.push('draft');},
    storeEncryptedDelivery:async()=>{events.push('address');},
    createPreference:async input=>{
      events.push('payment');
      assert.equal(input.order.subtotalCents,21980);
      assert.equal(input.order.totalCents,23534);
      assert.equal(input.lines.length,1);
      assert.equal(input.lines[0].quantity,2);
      return {preferenceId:'pref_multi',checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
    }
  });
  assert.equal(result.mode,'live');
  assert.equal(result.totalCents,23534);
  assert.deepEqual(events,['supplier','shipping','draft','address','payment']);
});

test('carrinho múltiplo com frete individual não cadastrado não inicia pagamento',async()=>{
  let paid=false;
  const db={prepare(){throw Error('does not reach DB')}};
  await assert.rejects(()=>createCheckoutLive({
    ...enabled,DB:db,LIVE_MULTICART_CHECKOUT_ENABLED:'true',
    VAVI_SHIPPING_PRODUCTS_JSON:'{}'
  },{
    ...payload,items:[{sku:'salve-regina-preta-g',quantity:2}]
  },{
    loadVariant:async()=>variant,
    createPreference:async()=>{paid=true;return {};}
  }),{code:'shipping_product_unverified'});
  assert.equal(paid,false);
});

test('P e XG podem utilizar cotação oficial por SKU quando há aprovação de produção manual',async()=>{
  for(const [size,variantSku,amount,cents] of [
    ['p','0001587',7071,10990],
    ['xg','0001591',8235,11990]
  ]){
    const steps=[];
    const db={
      prepare(sql){return {bind(){
        return {
          first:async()=>{
            if(!sql.includes('supplier_variant_cost_observations'))
              throw Error('Unexpected lookup');
            return {supplier_variant_sku:variantSku,observed_total_cents:amount};
          },
          run:async()=>({meta:{changes:1}})
        };
      }};}
    };
    const result=await createCheckoutLive({
      ...enabled,DB:db,VAVI_SHIPPING_PRODUCTS_JSON:'{}',
      LIVE_SHIRT_MANUAL_FULFILLMENT_ENABLED:'true'
    },{
      ...payload,items:[{sku:'salve-regina-preta-'+size,quantity:1}]
    },{
      loadVariant:async()=>({
        ...variant,sku:'salve-regina-preta-'+size,price_cents:cents
      }),
      simulateShippingCart:async(_env,_zip,lines)=>{
        assert.equal(lines.length,1);
        assert.equal(lines[0].supplierSku,variantSku);
        assert.equal(lines[0].quantity,1);
        steps.push('shipping');
        return quote;
      },
      encryptDelivery:async()=>({encryptedPayload:'encrypted',iv:'f'.repeat(24)}),
      insertDraftOrder:async()=>{steps.push('order');},
      storeEncryptedDelivery:async()=>{steps.push('address');},
      createPreference:async input=>{
        steps.push('payment');
        assert.equal(input.order.totalCents,cents+1554);
        return {preferenceId:'pref_'+size,checkoutUrl:'https://www.mercadopago.com.br/checkout/start'};
      }
    });
    assert.equal(result.totalCents,cents+1554);
    assert.deepEqual(steps,['shipping','order','address','payment']);
  }
});

test('camisetas não configuradas continuam sem cobrança com liberação manual desligada',async()=>{
  let called=false;
  await assert.rejects(()=>createCheckoutLive({
    ...enabled,VAVI_SHIPPING_PRODUCTS_JSON:'{}',
    LIVE_SHIRT_MANUAL_FULFILLMENT_ENABLED:'false'
  },{
    ...payload,items:[{sku:'salve-regina-preta-p',quantity:2}]
  },{
    loadVariant:async()=>({...variant,sku:'salve-regina-preta-p'}),
    createPreference:async()=>{called=true;return {};}
  }),{code:'shipping_product_unverified'});
  assert.equal(called,false);
});
