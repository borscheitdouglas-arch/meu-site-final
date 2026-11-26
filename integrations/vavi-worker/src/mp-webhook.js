/**
 * Verificação de assinatura de Webhooks Mercado Pago para Cloudflare Workers.
 * Esta função valida SOMENTE a origem da notificação. Após validar, o servidor
 * deve consultar /v1/payments/{id}, conciliar valores/conta/pedido no DB,
 * e registrar transição idempotente antes de enviar o rascunho à VAVI.
 * NÃO há endpoint público de webhook habilitado nesta etapa.
 */
export async function verifyWebhookSignature({
  request, secret, nowMs = Date.now(), subtle = crypto.subtle, toleranceMs = 10 * 60 * 1000
}) {
  if (typeof secret !== 'string' || !secret) return false;
  if (!(request instanceof Request) || request.method !== 'POST') return false;
  const requestId = request.headers.get('x-request-id');
  const signature = request.headers.get('x-signature');
  const dataId = new URL(request.url).searchParams.get('data.id');
  if (!requestId || !signature || !dataId ||
      requestId.length > 180 || !/^[a-zA-Z0-9_.-]{1,90}$/.test(dataId)) return false;

  const parts = {};
  for (const part of signature.split(',')) {
    const [key, value] = part.trim().split('=');
    if (key && value && !parts[key]) parts[key] = value;
  }
  const ts = parts.ts;
  const provided = parts.v1;
  if (!/^\d{10,16}$/.test(ts || '') || !/^[0-9a-f]{64}$/i.test(provided || '')) return false;
  const epoch = Number(ts);
  if (!Number.isFinite(epoch) || Math.abs(nowMs - epoch) > toleranceMs) return false;

  // Mercado Pago WebhookSignatureValidator: id (minúsculo), request-id, ts.
  const manifest = 'id:' + dataId.toLowerCase() +
    ';request-id:' + requestId + ';ts:' + ts + ';';
  const encoder = new TextEncoder();
  const key = await subtle.importKey('raw', encoder.encode(secret),
    {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const bytes = new Uint8Array(provided.match(/.{2}/g).map(hex => parseInt(hex, 16)));
  try {
    return await subtle.verify('HMAC', key, bytes, encoder.encode(manifest));
  } catch {
    return false;
  }
}
