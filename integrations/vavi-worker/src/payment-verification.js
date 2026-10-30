import {CatalogError} from './catalog.js';
import {validateConfirmedPayment} from './order-state.js';

const MP_API = 'https://api.mercadopago.com';

/** Mercado Pago signature: id:[data.id];request-id:[x-request-id];ts:[ts]; */
export function webhookManifest({dataId,requestId,timestamp}) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(String(dataId || '')) ||
      !/^[a-zA-Z0-9_-]{1,150}$/.test(String(requestId || '')) ||
      !/^\d{10,17}$/.test(String(timestamp || ''))) {
    throw new CatalogError('invalid_notification','Notificação inválida.',400);
  }
  return `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${timestamp};`;
}
export function parseSignature(header) {
  if (typeof header !== 'string' || header.length > 512) {
    throw new CatalogError('invalid_notification','Assinatura ausente.',401);
  }
  const parts = Object.fromEntries(header.split(',').map(part=>{
    const i=part.indexOf('=');
    return i<0?['','']:[part.slice(0,i).trim(),part.slice(i+1).trim()];
  }));
  if (!/^\d{10,17}$/.test(parts.ts || '') || !/^[0-9a-f]{64}$/i.test(parts.v1 || '')) {
    throw new CatalogError('invalid_notification','Assinatura inválida.',401);
  }
  return {ts:parts.ts,v1:parts.v1.toLowerCase()};
}
function hex(bytes) {
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function verifyWebhookSignature({signature,requestId,dataId,secret,now=Date.now()}) {
  if (typeof secret !== 'string' || !secret) {
    throw new CatalogError('webhook_not_configured','Verificação indisponível.',503);
  }
  const {ts,v1}=parseSignature(signature);
  const tsMs=Number(ts.length===10?Number(ts)*1000:Number(ts));
  if (!Number.isFinite(tsMs) || Math.abs(now-tsMs)>5*60*1000) {
    throw new CatalogError('invalid_notification','Notificação fora do período permitido.',401);
  }
  const manifest=webhookManifest({dataId,requestId,timestamp:ts});
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signatureBytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(manifest));
  const expected=hex(signatureBytes);
  // Constant-size comparison without early exit.
  let diff=0;
  for (let i=0;i<expected.length;i++) diff|=expected.charCodeAt(i)^v1.charCodeAt(i);
  if (diff!==0) throw new CatalogError('invalid_notification','Assinatura inválida.',401);
  return true;
}

/** This function is only to be called after signature verification.
 * Payment is independently read from Mercado Pago, never from webhook payload. */
export async function fetchAndVerifyPayment({paymentId,accessToken,order,fetchImpl=fetch}) {
  if (!/^\d{1,30}$/.test(String(paymentId ?? '')) ||
      typeof accessToken!=='string' || accessToken.length<1) {
    throw new CatalogError('payment_not_configured','Verificação indisponível.',503);
  }
  let response;
  try {
    response=await fetchImpl(`${MP_API}/v1/payments/${paymentId}`,{
      method:'GET',
      headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json'},
      signal:AbortSignal.timeout(8000)
    });
  } catch {
    throw new CatalogError('payment_provider_unavailable','Não foi possível conferir pagamento.',503);
  }
  if (!response.ok) {
    throw new CatalogError('payment_provider_unavailable','Não foi possível conferir pagamento.',503);
  }
  let payment;
  try { payment=await response.json(); } catch {
    throw new CatalogError('payment_provider_unavailable','Resposta de pagamento inválida.',503);
  }
  if (String(payment?.id)!==String(paymentId)) {
    throw new CatalogError('payment_mismatch','Pagamento incorreto.',409);
  }
  return validateConfirmedPayment(order,payment);
}
