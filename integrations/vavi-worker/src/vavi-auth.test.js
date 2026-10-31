import test from 'node:test';
import assert from 'node:assert/strict';
import {obtainVaviAccessToken} from './vavi-auth.js';

const credentials={VAVI_CLIENT_ID:'pb_demo',VAVI_CLIENT_SECRET:'private-demo'};

test('troca client credentials por Bearer JWT sem expor o secret',async()=>{
  let calls=0;
  const token=await obtainVaviAccessToken(credentials,async(url,options)=>{
    calls++;
    assert.equal(url,'https://api.printbee.com.br/api/Auth/Token');
    assert.equal(options.method,'POST');
    assert.equal(options.headers['Content-Type'],'application/json');
    assert.deepEqual(JSON.parse(options.body),{
      grantType:'client_credentials',
      clientId:credentials.VAVI_CLIENT_ID,
      clientSecret:credentials.VAVI_CLIENT_SECRET,
      expires:1
    });
    return {ok:true,json:async()=>({code:200,data:{
      token_type:'Bearer',access_token:'jwt-test-token',
      expires_in:3600
    }})};
  });
  assert.equal(token,'jwt-test-token');
  assert.equal(calls,1);
});

test('não tenta API VAVI sem Client ID e Secret',async()=>{
  await assert.rejects(()=>obtainVaviAccessToken({},
    ()=>{throw Error('should not be called')}),{code:'vavi_credentials_missing'});
});

test('resposta sem token válido é recusada',async()=>{
  await assert.rejects(()=>obtainVaviAccessToken(credentials,
    async()=>({ok:true,json:async()=>({data:{}})})),{code:'vavi_auth_invalid'});
});

test('401 não devolve conteúdo do segredo',async()=>{
  await assert.rejects(()=>obtainVaviAccessToken(credentials,
    async()=>({ok:false,status:401})),err=>{
      assert.equal(err.code,'vavi_auth_failed');
      assert.ok(!err.message.includes('private-demo'));
      return true;
    });
});
