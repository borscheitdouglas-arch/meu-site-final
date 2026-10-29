/**
 * Mercado Pago Checkout Pro (Preferences API).
 *
 * NÃO há rota HTTP pública que invoque estas funções. Somente habilitar
 * depois de: pedido persistido, variantes/valores verificados, frete real
 * confirmado, Webhook validado e conciliação de pagamento.
 *
 * Nunca aceitar price, total ou shipping do navegador.
 */
const API = 'https://api.mercadopago.com';

export class PaymentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}
function requirePositiveCents(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PaymentError('invalid_amount', name + ' inválido.');
  }
}
function validHttpsAddress(value, requireRoot = false) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.hash && !url.search && (!requireRoot || url.pathname === '/');
  } catch { return false; }
}
const centsToBRL = cents => cents / 100;
function matchesMoney(value, cents) {
  return typeof value === 'number' && Number.isFinite(value) &&
    Number.isSafeInteger(cents) && Math.round(value * 100) === cents &&
    Math.abs(value * 100 - cents) < 0.00001;
}
function validPaymentUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const host = url.hostname;
    return ['mercadopago.com', 'mercadopago.com.br'].some(domain =>
      host === domain || host.endsWith('.' + domain));
  } catch { return false; }
}
export function requireOrderReady(order) {
  if (!order || typeof order !== 'object' || order.status !== 'ready_for_payment' ||
      order.currency !== 'BRL' || order.pricingVerified !== true ||
      order.shippingVerified !== true) {
    throw new PaymentError('checkout_disabled', 'Pedido não está pronto para pagamento.');
  }
  if (typeof order.code !== 'string' || !/^[A-Za-z0-9_-]{5,80}$/.test(order.code)) {
    throw new PaymentError('invalid_order_code', 'Código de pedido inválido.');
  }
  if (!Number.isSafeInteger(order.shippingCents) || order.shippingCents < 0 ||
      !Number.isSafeInteger(order.subtotalCents) || order.subtotalCents < 1 ||
      !Number.isSafeInteger(order.totalCents) || order.totalCents < 1) {
    throw new PaymentError('invalid_total', 'Valores do pedido não conferidos.');
  }
  if (order.subtotalCents + order.shippingCents !== order.totalCents) {
    throw new PaymentError('total_mismatch', 'Total não corresponde aos itens e ao frete.');
  }
  if (!Array.isArray(order.items) || order.items.length < 1 || order.items.length > 15) {
    throw new PaymentError('invalid_items', 'Pedido sem itens.');
  }
  let subtotal = 0;
  for (const item of order.items) {
    if (typeof item.sku !== 'string' || !/^[a-zA-Z0-9_.-]{1,90}$/.test(item.sku) ||
        typeof item.name !== 'string' || item.name.trim().length < 1 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw new PaymentError('invalid_items', 'Item inválido.');
    }
    requirePositiveCents(item.unitPriceCents, 'Preço unitário');
    const line = item.unitPriceCents * item.quantity;
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(subtotal + line)) {
      throw new PaymentError('invalid_total', 'Subtotal inválido.');
    }
    subtotal += line;
  }
  if (subtotal !== order.subtotalCents) {
    throw new PaymentError('subtotal_mismatch', 'Subtotal não confere.');
  }
  return order;
}
export function buildPreference(order, settings) {
  requireOrderReady(order);
  const {returnBaseUrl, notificationUrl} = settings || {};
  if (!validHttpsAddress(returnBaseUrl, true) || !validHttpsAddress(notificationUrl)) {
    throw new PaymentError('invalid_urls', 'URLs HTTPS do checkout não configuradas.');
  }
  const base = returnBaseUrl.replace(/\/$/, '');
  const products = order.items.map(item => ({
    id: item.sku,
    title: item.name,
    quantity: item.quantity,
    currency_id: 'BRL',
    unit_price: centsToBRL(item.unitPriceCents)
  }));
  // Frete é uma linha de cobrança separada e validada pelo backend.
  // Não enviar novamente shipments.cost para evitar cobrança dupla.
  if (order.shippingCents > 0) {
    products.push({id:'frete',title:'Frete',quantity:1,currency_id:'BRL',
      unit_price:centsToBRL(order.shippingCents)});
  }
  return {
    items: products,
    external_reference: order.code,
    back_urls: {
      success: base + '/pages/pagamento-retorno.html?resultado=sucesso',
      pending: base + '/pages/pagamento-retorno.html?resultado=pendente',
      failure: base + '/pages/pagamento-retorno.html?resultado=falha'
    },
    notification_url: notificationUrl,
    auto_return: 'approved'
  };
}
export async function createPreference({order, env, fetcher = fetch}) {
  if (typeof env?.MP_ACCESS_TOKEN !== 'string' || env.MP_ACCESS_TOKEN.length < 10) {
    throw new PaymentError('missing_credentials', 'Access Token do Mercado Pago não configurado.');
  }
  if (!['test','production'].includes(env.MP_ENVIRONMENT) ||
      (env.MP_ENVIRONMENT === 'production' && env.MP_PRODUCTION_APPROVED !== 'true')) {
    throw new PaymentError('environment_not_approved', 'Ambiente de cobrança não habilitado.');
  }
  const body = buildPreference(order, {
    returnBaseUrl: env.MP_RETURN_BASE_URL,
    notificationUrl: env.MP_NOTIFICATION_URL
  });
  const response = await fetcher(API + '/checkout/preferences', {
    method:'POST',
    headers:{
      'Accept':'application/json',
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + env.MP_ACCESS_TOKEN
    },
    body:JSON.stringify(body)
  });
  if (!response.ok) throw new PaymentError('mp_preference_failed','Falha ao criar preferência de pagamento.');
  const data = await response.json();
  if (typeof data?.id !== 'string' || !data.id ||
      !validPaymentUrl(data.init_point)) {
    throw new PaymentError('mp_invalid_response','Resposta do checkout sem URL válida.');
  }
  return {id:data.id, checkoutUrl:data.init_point};
}
/**
 * Consultar pagamento pelo ID recebido via webhook assinado.
 * Chamar somente após carregar do banco a ordem de referência.
 * Retorna um resultado de conciliação; NÃO atualiza o pedido.
 */
export async function verifyPayment({paymentId, order, env, fetcher = fetch}) {
  if (!/^\d{1,24}$/.test(String(paymentId ?? ''))) {
    throw new PaymentError('invalid_payment_id','ID de pagamento inválido.');
  }
  requireOrderReady(order);
  if (typeof env?.MP_ACCESS_TOKEN !== 'string' || env.MP_ACCESS_TOKEN.length < 10 ||
      !/^\d+$/.test(String(env.MP_SELLER_ID ?? '')) ||
      !['test','production'].includes(env.MP_ENVIRONMENT)) {
    throw new PaymentError('missing_credentials','Credenciais de verificação não configuradas.');
  }
  const response = await fetcher(API + '/v1/payments/' + String(paymentId), {
    method:'GET',
    headers:{'Accept':'application/json','Authorization':'Bearer ' + env.MP_ACCESS_TOKEN}
  });
  if (!response.ok) throw new PaymentError('mp_payment_lookup_failed','Não foi possível consultar o pagamento.');
  const payment = await response.json();
  if (String(payment.id) !== String(paymentId) ||
      payment.external_reference !== order.code ||
      payment.currency_id !== 'BRL' ||
      String(payment.collector_id) !== String(env.MP_SELLER_ID) ||
      !matchesMoney(payment.transaction_amount, order.totalCents)) {
    throw new PaymentError('payment_mismatch','O pagamento não pertence ao pedido ou não tem o valor esperado.');
  }
  if (env.MP_ENVIRONMENT === 'test' && payment.live_mode !== false ||
      env.MP_ENVIRONMENT === 'production' && payment.live_mode !== true) {
    throw new PaymentError('payment_environment_mismatch','Ambiente de pagamento incorreto.');
  }
  return {
    id:String(payment.id),
    orderCode:order.code,
    status:payment.status,
    approved:payment.status === 'approved'
  };
}
