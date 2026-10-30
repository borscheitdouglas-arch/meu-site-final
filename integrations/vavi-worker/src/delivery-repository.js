import {CatalogError} from './catalog.js';
import {normalizeZip} from './shipping.js';

const clean=(value,max)=>typeof value==='string' && value.trim().length>0 && value.trim().length<=max
  ? value.trim() : null;
const digits=(value)=>typeof value==='string'?value.replace(/\D/g,''):'';

export function validateBuyerDetails(input) {
  if(!input || typeof input!=='object' || Array.isArray(input))
    throw new CatalogError('invalid_delivery','Dados de entrega inválidos.',422);
  const name=clean(input.name,160),email=clean(input.email,200),
    phone=digits(input.phone),taxId=digits(input.taxId),
    street=clean(input.street,180),number=clean(input.number,30),
    neighborhood=clean(input.neighborhood,90),city=clean(input.city,90),
    state=typeof input.state==='string'?input.state.trim().toUpperCase():'';
  const complement=typeof input.complement==='string'?input.complement.trim():'';
  if(!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
     !/^\d{10,13}$/.test(phone) || !/^(\d{11}|\d{14})$/.test(taxId) ||
     !street || !number || !neighborhood || !city ||
     !/^[A-Z]{2}$/.test(state) || complement.length>120)
    throw new CatalogError('invalid_delivery','Preencha os dados de entrega e contato.',422);
  return {name,email,phone,taxId,zipCode:normalizeZip(input.zipCode),
    street,number,complement,neighborhood,city,state};
}

function decodeKey(base64) {
  if(typeof base64!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(base64))
    throw new CatalogError('delivery_encryption_not_configured',
      'Proteção dos dados de entrega não configurada.',503);
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean64=base64.slice(0,-1);
  let bits=0,buffer=0;
  const bytes=[];
  for(const c of clean64){const n=alphabet.indexOf(c);if(n<0)throw new Error('bad base64');
    buffer=(buffer<<6)|n;bits+=6;
    if(bits>=8){bits-=8;bytes.push((buffer>>bits)&255);}
  }
  if(bytes.length!==32)throw new CatalogError('delivery_encryption_not_configured',
    'Chave de proteção inválida.',503);
  return new Uint8Array(bytes);
}
async function aesKey(base64) {
  return crypto.subtle.importKey('raw',decodeKey(base64),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=value=>new Uint8Array(value.match(/.{2}/g)?.map(v=>parseInt(v,16))||[]);

/** Store encrypted delivery PII only; ZIP and order ID remain for shipment lookup.
 * AAD ties the ciphertext to its order; copying ciphertext to another order fails.
 */
export async function encryptDelivery(orderId,buyer,keyBase64) {
  if(!/^ord_[0-9a-f]{32}$/.test(orderId||''))
    throw new CatalogError('invalid_order_id','Pedido inválido.',422);
  const normalized=validateBuyerDetails(buyer);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encoded=new TextEncoder().encode(JSON.stringify(normalized));
  const ciphertext=await crypto.subtle.encrypt({
    name:'AES-GCM',iv,additionalData:new TextEncoder().encode(orderId)
  },await aesKey(keyBase64),encoded);
  return {orderId,zipCode:normalized.zipCode,
    encryptedPayload:hex(new Uint8Array(ciphertext)),iv:hex(iv)};
}

export async function decryptDelivery(orderId,record,keyBase64) {
  if(!/^ord_[0-9a-f]{32}$/.test(orderId||'') ||
    !/^[a-f0-9]{24}$/.test(record?.iv||'') ||
    !/^(?:[a-f0-9]{2}){16,4096}$/.test(record?.encrypted_payload||'')) {
    throw new CatalogError('invalid_delivery_record','Entrega não disponível.',409);
  }
  try {
    const plaintext=await crypto.subtle.decrypt({
      name:'AES-GCM',iv:unhex(record.iv),
      additionalData:new TextEncoder().encode(orderId)
    },await aesKey(keyBase64),unhex(record.encrypted_payload));
    return validateBuyerDetails(JSON.parse(new TextDecoder().decode(plaintext)));
  }catch {
    throw new CatalogError('delivery_decryption_failed','Entrega indisponível para conferência.',503);
  }
}

export async function storeEncryptedDelivery(db,envelope) {
  if(!db?.prepare || !/^ord_[a-f0-9]{32}$/.test(envelope?.orderId||''))
    throw new CatalogError('invalid_delivery_record','Entrega inválida.',409);
  try {
    const result=await db.prepare(`INSERT INTO store_order_delivery
      (order_id,destination_zip,encrypted_payload,iv)
      SELECT id,?,?,? FROM store_orders
      WHERE id=? AND status='draft' AND destination_zip=?`)
      .bind(envelope.zipCode,envelope.encryptedPayload,envelope.iv,
        envelope.orderId,envelope.zipCode).run();
    if(result.meta?.changes!==1)
      throw new CatalogError('delivery_order_mismatch','Endereço e pedido não conferem.',409);
  }catch(error) {
    if(error instanceof CatalogError)throw error;
    throw new CatalogError('delivery_write_failed','Não foi possível salvar a entrega.',503);
  }
  return {orderId:envelope.orderId,saved:true};
}
