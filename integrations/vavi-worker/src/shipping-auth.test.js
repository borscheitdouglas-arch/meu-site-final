import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateVaviShipping} from './shipping.js';

// Contract confirmed against VAVI developer documentation (30 Oct 2026):
// POST /api/Auth/Token, grantType/clientId/clientSecret/expires;
// response data.access_token; Bearer token to /api/Customers/Simulate.
const env={
  VAVI_CLIENT_ID:'client-test-not-real',
  VAVI_CLIENT_SECRET:'secret-test-not-real',
  VAVI_SHIPPING_PRODUCTS_JSON:JSON.stringify({
    camisaG:{
      id:'497f6eca-6276-4993-bfeb-53cbbbba6f08',sku:'CAMISA-G-FAKE',
      amount:66.83,weight:0.25,height:30,width:250,length:350
    }
  })
};
test('VAVI JWT uses exact documented camelCase fields; freight uses resulting Bearer',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    if(String(url).endsWith('/api/Auth/Token')){
      assert.equal(options.method,'POST');
      assert.deepEqual(JSON.parse(options.body),{
        grantType:'client_credentials',
        clientId:'client-test-not-real',clientSecret:'secret-test-not-real',expires:1
      });
      assert.equal(options.headers.Authorization,undefined);
      return {ok:true,json:async()=>({code:0,data:{token_type:'Bearer',
        access_token:'jwt-fake-only',expires_in:3600}})};
    }
    assert.equal(url,'https://api.printbee.com.br/api/Customers/Simulate');
    assert.equal(options.headers.Authorization,'Bearer jwt-fake-only');
    const body=JSON.parse(options.body);
    assert.equal(body.zipCode,'13201000');
    assert.equal(body.compositions[0].sku,'CAMISA-G-FAKE');
    return {ok:true,json:async()=>({code:0,data:[{
      id:'carrier-fake',name:'Envio simulado',companyName:'Teste',
      shippingCost:15.54,deliveryTime:9,isActive:true
    }]})};
  };
  try {
    const options=await simulateVaviShipping(env,'13201000',[{
      sku:'camisaG',name:'Camiseta Salve Regina',quantity:1,unitPriceCents:10990
    }]);
    assert.equal(calls.length,2);
    assert.equal(options[0].shippingCost,15.54);
  } finally {globalThis.fetch=original;}
});
test('sem client secret ou cadastro de produtos a API não é chamada',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('Unexpected network call')};
  try {
    await assert.rejects(()=>simulateVaviShipping({...env,VAVI_CLIENT_SECRET:''},
      '13201000',[{sku:'camisaG',quantity:1}]),{code:'shipping_not_configured'});
  } finally {globalThis.fetch=original;}
});
