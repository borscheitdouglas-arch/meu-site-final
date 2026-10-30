import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBuyerDetails,encryptDelivery,decryptDelivery,storeEncryptedDelivery}
  from './delivery-repository.js';

const orderId='ord_0123456789abcdef0123456789abcdef';
const buyer={name:'Comprador Teste',email:'comprador@example.com',
 phone:'(11) 99999-0000',taxId:'123.456.789-09',zipCode:'13218-752',
 street:'Rua Exemplo',number:'12',complement:'apto 1',
 neighborhood:'Centro',city:'Jundiaí',state:'sp'};
// An explicit fake 256-bit AES key; never a production credential.
const key='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
test('validar CEP, endereço, telefone e CPF sem aceitar dados ausentes',()=>{
 const result=validateBuyerDetails(buyer);
 assert.equal(result.zipCode,'13218752');
 assert.equal(result.state,'SP');
 assert.equal(result.taxId,'12345678909');
 assert.throws(()=>validateBuyerDetails({...buyer,street:''}),
   {code:'invalid_delivery'});
 assert.throws(()=>validateBuyerDetails({...buyer,zipCode:'invalid'}),
   {code:'invalid_zip'});
});
test('AES-GCM roundtrip protege conteúdo e vincula criptografia ao pedido',async()=>{
 const envelope=await encryptDelivery(orderId,buyer,key);
 assert.equal(envelope.zipCode,'13218752');
 assert.ok(!JSON.stringify(envelope).includes('Comprador Teste'));
 assert.equal(envelope.iv.length,24);
 const decrypted=await decryptDelivery(orderId,{
   encrypted_payload:envelope.encryptedPayload,iv:envelope.iv
 },key);
 assert.equal(decrypted.name,'Comprador Teste');
 await assert.rejects(()=>decryptDelivery(
  'ord_ffffffffffffffffffffffffffffffff',{
   encrypted_payload:envelope.encryptedPayload,iv:envelope.iv
  },key),{code:'delivery_decryption_failed'});
});
test('sem chave criptográfica válida não grava dado em texto simples',async()=>{
 await assert.rejects(()=>encryptDelivery(orderId,buyer,''),{
   code:'delivery_encryption_not_configured'});
});
test('salva no D1 apenas se pedido estiver em draft e CEP coincidir',async()=>{
 const envelope=await encryptDelivery(orderId,buyer,key);
 let sql='',params=[];
 const db={prepare(query){sql=query;return {bind(...values){
   params=values;return {run:async()=>({meta:{changes:1}})}
 }}}};
 assert.equal((await storeEncryptedDelivery(db,envelope)).saved,true);
 assert.match(sql,/status='draft'/);
 assert.equal(params[0],'13218752');
 assert.ok(!params.join('|').includes('Comprador Teste'));
});
test('não salva entrega quando pedido não permite alteração',async()=>{
 const envelope=await encryptDelivery(orderId,buyer,key);
 const db={prepare(){return {bind(){return {run:async()=>({
   meta:{changes:0}
 })}}}}};
 await assert.rejects(()=>storeEncryptedDelivery(db,envelope),{
   code:'delivery_order_mismatch'});
});
