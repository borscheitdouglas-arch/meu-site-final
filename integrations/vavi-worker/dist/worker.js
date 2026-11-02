// src/catalog.js
var CatalogError = class extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
function normalizeCart(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.items)) {
    throw new CatalogError("invalid_cart", "Informe uma lista de itens.");
  }
  if (body.items.length < 1 || body.items.length > 15) {
    throw new CatalogError("invalid_cart", "A sacola deve ter entre 1 e 15 linhas.");
  }
  const merged = /* @__PURE__ */ new Map();
  for (const item of body.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new CatalogError("invalid_item", "Item inv\xE1lido.");
    }
    const { sku, quantity } = item;
    if (typeof sku !== "string" || !/^[a-zA-Z0-9_.-]{1,90}$/.test(sku)) {
      throw new CatalogError("invalid_sku", "C\xF3digo de produto inv\xE1lido.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new CatalogError("invalid_quantity", "Quantidade deve ser de 1 a 10.");
    }
    const next = (merged.get(sku) || 0) + quantity;
    if (next > 10) throw new CatalogError("quantity_limit", "M\xE1ximo de 10 unidades por varia\xE7\xE3o.");
    merged.set(sku, next);
  }
  const items = [...merged].map(([sku, quantity]) => ({ sku, quantity }));
  if (items.reduce((sum, item) => sum + item.quantity, 0) > 30) {
    throw new CatalogError("cart_limit", "M\xE1ximo de 30 unidades por sacola.");
  }
  return items;
}
async function quoteCart(items, loadVariant2) {
  const lines = [];
  let subtotalCents = 0;
  for (const item of items) {
    const variant = await loadVariant2(item.sku);
    if (!variant || variant.product_enabled !== 1 || variant.product_verified !== 1 || variant.available !== 1 || !Number.isSafeInteger(variant.price_cents) || variant.price_cents <= 0) {
      throw new CatalogError("unavailable_product", "Um produto est\xE1 indispon\xEDvel ou n\xE3o foi conferido.", 409);
    }
    const totalCents = variant.price_cents * item.quantity;
    if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(subtotalCents + totalCents)) {
      throw new CatalogError("invalid_total", "N\xE3o foi poss\xEDvel calcular o total.");
    }
    subtotalCents += totalCents;
    lines.push({
      sku: item.sku,
      name: variant.name,
      variation: variant.label,
      quantity: item.quantity,
      unitPriceCents: variant.price_cents,
      totalCents
    });
  }
  return {
    currency: "BRL",
    lines,
    subtotalCents,
    freightCents: null,
    finalTotalCents: null,
    requiresShippingQuote: true,
    checkoutEnabled: false,
    message: "Pr\xE9via: total dos produtos validado no servidor. Frete e pagamentos ainda n\xE3o est\xE3o dispon\xEDveis."
  };
}
function groupCatalog(rows) {
  const products = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== "string" || typeof row.sku !== "string" || !Number.isSafeInteger(row.price_cents) || row.price_cents <= 0) continue;
    if (!products.has(row.id)) {
      products.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description || "",
        image: row.image,
        enabled: true,
        verified: true,
        variants: []
      });
    }
    products.get(row.id).variants.push({
      sku: row.sku,
      label: row.label,
      price: row.price_cents / 100,
      available: true
    });
  }
  return [...products.values()];
}

// src/shipping.js
var VAVI_BASE = "https://api.printbee.com.br";
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var NUMBER = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;
function normalizeZip(zip) {
  if (typeof zip !== "string" || !/^\d{5}-?\d{3}$/.test(zip.trim())) {
    throw new CatalogError("invalid_zip", "Informe um CEP v\xE1lido de oito d\xEDgitos.", 422);
  }
  return zip.replace("-", "");
}
function shippingPayload(zipCode, lines, rawConfig) {
  let config;
  try {
    config = JSON.parse(rawConfig);
  } catch {
    throw new CatalogError("shipping_not_configured", "Log\xEDstica ainda n\xE3o configurada.", 503);
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new CatalogError("shipping_not_configured", "Log\xEDstica ainda n\xE3o configurada.", 503);
  }
  if (lines.length !== 1 || lines[0]?.quantity !== 1) {
    throw new CatalogError(
      "shipping_package_unverified",
      "Cota\xE7\xE3o de m\xFAltiplas pe\xE7as ainda precisa de valida\xE7\xE3o da embalagem VAVI.",
      503
    );
  }
  let amount = 0, weight = 0, height = 0, width = 0, length = 0;
  const compositions = [];
  for (const line of lines) {
    const item = config[line.sku];
    if (!item || !UUID.test(item.id || "") || typeof item.sku !== "string" || !NUMBER(item.amount) || !NUMBER(item.weight) || !NUMBER(item.height) || !NUMBER(item.width) || !NUMBER(item.length)) {
      throw new CatalogError("shipping_product_unverified", "Produto ainda sem dados de frete conferidos.", 409);
    }
    const units = line.quantity;
    compositions.push({
      id: item.id,
      sku: item.sku,
      amount: item.amount,
      quantity: units,
      weight: item.weight,
      height: item.height,
      width: item.width,
      length: item.length
    });
    amount += item.amount * units;
    weight += item.weight * units;
    height = Math.max(height, item.height);
    width = Math.max(width, item.width);
    length = item.length;
  }
  return {
    zipCode,
    amount: Number(amount.toFixed(2)),
    weight: Number(weight.toFixed(3)),
    height,
    width,
    length,
    compositions
  };
}
async function postVavi(path, payload, token, timeoutMs = 8e3) {
  const res = await fetch(VAVI_BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...token ? { "Authorization": "Bearer " + token } : {}
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new CatalogError(
    "shipping_provider_unavailable",
    "N\xE3o foi poss\xEDvel consultar a transportadora.",
    503
  );
  return res.json();
}
function safeQuote(option) {
  if (!option || typeof option !== "object" || typeof option.id !== "string" || !/^[A-Za-z0-9_.:-]{1,120}$/.test(option.id) || typeof option.name !== "string" || !option.name.trim() || option.name.length > 120 || typeof option.shippingCost !== "number" || !Number.isFinite(option.shippingCost) || option.shippingCost < 0 || option.shippingCost > 1e4 || Math.abs(option.shippingCost * 100 - Math.round(option.shippingCost * 100)) > 1e-6 || !Number.isInteger(option.deliveryTime) || option.deliveryTime < 0 || option.deliveryTime > 365) return null;
  return {
    id: option.id,
    name: option.name,
    companyName: option.companyName || "",
    shippingCost: option.shippingCost,
    deliveryTime: option.deliveryTime,
    estimatedDeliveryDate: option.estimatedDeliveryDate || null,
    message: option.message || "",
    isActive: option.isActive === true
  };
}
async function simulateVaviShipping(env, zipCode, lines, diagnostic = null) {
  if (!env.VAVI_CLIENT_ID || !env.VAVI_CLIENT_SECRET || !env.VAVI_SHIPPING_PRODUCTS_JSON) {
    throw new CatalogError("shipping_not_configured", "Cota\xE7\xE3o VAVI ainda n\xE3o configurada.", 503);
  }
  const payload = shippingPayload(zipCode, lines, env.VAVI_SHIPPING_PRODUCTS_JSON);
  let auth;
  try {
    auth = await postVavi("/api/Auth/Token", {
      grantType: "client_credentials",
      clientId: env.VAVI_CLIENT_ID,
      clientSecret: env.VAVI_CLIENT_SECRET,
      expires: 1
    }, null);
  } catch (e) {
    if (e instanceof CatalogError) throw e;
    throw new CatalogError("shipping_provider_unavailable", "Cota\xE7\xE3o temporariamente indispon\xEDvel.", 503);
  }
  const token = auth?.data?.access_token;
  if (typeof token !== "string" || !token) {
    throw new CatalogError("shipping_provider_unavailable", "Autentica\xE7\xE3o de frete indispon\xEDvel.", 503);
  }
  let response;
  try {
    response = await postVavi("/api/Customers/Simulate", payload, token);
  } catch (e) {
    if (e instanceof CatalogError) throw e;
    throw new CatalogError("shipping_provider_unavailable", "Cota\xE7\xE3o temporariamente indispon\xEDvel.", 503);
  }
  if (!Array.isArray(response?.data)) throw new CatalogError(
    "shipping_provider_unavailable",
    "Resposta de frete inesperada.",
    503
  );
  const parsed = response.data.map(safeQuote);
  const valid = parsed.filter(Boolean);
  const options = valid.filter((x) => x.isActive);
  if (diagnostic && typeof diagnostic === "object") {
    const types = (option) => ({
      id: typeof option?.id,
      name: typeof option?.name,
      cost: typeof option?.shippingCost,
      days: typeof option?.deliveryTime,
      active: typeof option?.isActive,
      activeValue: option?.isActive === true ? "true" : option?.isActive === false ? "false" : "other",
      pickup: typeof option?.name === "string" && /retirada|retire|pickup/i.test(option.name),
      idValid: typeof option?.id === "string" && /^[A-Za-z0-9_.:-]{1,120}$/.test(option.id),
      nameValid: typeof option?.name === "string" && option.name.trim().length > 0 && option.name.length <= 120,
      costValid: typeof option?.shippingCost === "number" && Number.isFinite(option.shippingCost) && option.shippingCost >= 0 && option.shippingCost <= 1e4,
      costCents: typeof option?.shippingCost === "number" && Math.abs(option.shippingCost * 100 - Math.round(option.shippingCost * 100)) <= 1e-6,
      daysInteger: Number.isInteger(option?.deliveryTime),
      daysValid: Number.isInteger(option?.deliveryTime) && option.deliveryTime >= 0 && option.deliveryTime <= 365
    });
    Object.assign(diagnostic, {
      received: response.data.length,
      structurallyValid: valid.length,
      active: options.length,
      homeDelivery: options.filter((x) => !/retirada|retire|pickup/i.test(x.name)).length,
      fieldTypes: response.data.slice(0, 4).map(types)
    });
  }
  const ids = new Set(options.map((x) => x.id));
  if (ids.size !== options.length) throw new CatalogError(
    "shipping_provider_unavailable",
    "Cota\xE7\xF5es conflitantes da transportadora.",
    503
  );
  return options;
}

// src/order-state.js
var ALLOWED = Object.freeze({
  draft: ["awaiting_payment", "canceled"],
  awaiting_payment: ["paid", "payment_failed", "canceled", "manual_review"],
  payment_failed: ["awaiting_payment", "canceled", "manual_review"],
  paid: ["vavi_draft", "manual_review"],
  vavi_draft: ["in_production", "manual_review"],
  in_production: ["shipped", "manual_review"],
  shipped: ["delivered", "manual_review"],
  manual_review: ["paid", "vavi_draft", "in_production", "shipped", "canceled"],
  delivered: [],
  canceled: []
});
var ORDER_STATES = Object.freeze(Object.keys(ALLOWED));
function validateConfirmedPayment(order, payment) {
  if (!order || !payment || typeof payment !== "object" || !Number.isSafeInteger(order.total_cents) || order.total_cents <= 0 || typeof order.id !== "string" || order.id.length === 0) {
    throw new CatalogError("invalid_payment_check", "Verifica\xE7\xE3o incompleta.", 409);
  }
  const cents = Math.round(Number(payment.transaction_amount) * 100);
  if (payment.status !== "approved" || payment.currency_id !== "BRL" || payment.external_reference !== order.id || !Number.isSafeInteger(cents) || Math.abs(Number(payment.transaction_amount) * 100 - cents) > 1e-3 || cents !== order.total_cents) {
    throw new CatalogError("payment_mismatch", "Pagamento n\xE3o confere com o pedido.", 409);
  }
  return { orderId: order.id, paymentId: String(payment.id), status: "paid" };
}
function validateDraftTotals({ items, subtotalCents, shippingCents, totalCents }) {
  if (!Array.isArray(items) || items.length === 0 || !Number.isSafeInteger(subtotalCents) || subtotalCents <= 0 || !Number.isSafeInteger(shippingCents) || shippingCents < 0 || !Number.isSafeInteger(totalCents) || totalCents !== subtotalCents + shippingCents) {
    throw new CatalogError("invalid_order_total", "Total do pedido inv\xE1lido.", 409);
  }
  const sum = items.reduce((n, item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents <= 0) {
      throw new CatalogError("invalid_order_item", "Produto inv\xE1lido.", 409);
    }
    return n + item.quantity * item.unitPriceCents;
  }, 0);
  if (!Number.isSafeInteger(sum) || sum !== subtotalCents) {
    throw new CatalogError("invalid_order_total", "Subtotal n\xE3o confere.", 409);
  }
  return true;
}

// src/payment-verification.js
function webhookManifest({ dataId, requestId, timestamp }) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(String(dataId || "")) || !/^[a-zA-Z0-9_-]{1,150}$/.test(String(requestId || "")) || !/^\d{10,17}$/.test(String(timestamp || ""))) {
    throw new CatalogError("invalid_notification", "Notifica\xE7\xE3o inv\xE1lida.", 400);
  }
  return `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${timestamp};`;
}
function parseSignature(header) {
  if (typeof header !== "string" || header.length > 512) {
    throw new CatalogError("invalid_notification", "Assinatura ausente.", 401);
  }
  const parts = Object.fromEntries(header.split(",").map((part) => {
    const i = part.indexOf("=");
    return i < 0 ? ["", ""] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
  }));
  if (!/^\d{10,17}$/.test(parts.ts || "") || !/^[0-9a-f]{64}$/i.test(parts.v1 || "")) {
    throw new CatalogError("invalid_notification", "Assinatura inv\xE1lida.", 401);
  }
  return { ts: parts.ts, v1: parts.v1.toLowerCase() };
}
function hex(bytes) {
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
async function verifyWebhookSignature({ signature, requestId, dataId, secret, now = Date.now() }) {
  if (typeof secret !== "string" || !secret) {
    throw new CatalogError("webhook_not_configured", "Verifica\xE7\xE3o indispon\xEDvel.", 503);
  }
  const { ts, v1 } = parseSignature(signature);
  const tsMs = Number(ts.length === 10 ? Number(ts) * 1e3 : Number(ts));
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > 5 * 60 * 1e3) {
    throw new CatalogError("invalid_notification", "Notifica\xE7\xE3o fora do per\xEDodo permitido.", 401);
  }
  const manifest = webhookManifest({ dataId, requestId, timestamp: ts });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = hex(signatureBytes);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  if (diff !== 0) throw new CatalogError("invalid_notification", "Assinatura inv\xE1lida.", 401);
  return true;
}

// src/payment-repository.js
async function recordVerifiedPayment(db, verification, providerEventId) {
  if (!db || typeof db.batch !== "function" || typeof db.prepare !== "function") {
    throw new CatalogError("database_not_configured", "Banco indispon\xEDvel.", 503);
  }
  const { orderId, paymentId, status } = verification || {};
  if (status !== "paid" || !/^ord_[a-f0-9]{32}$/.test(orderId || "") || !/^\d{1,30}$/.test(paymentId || "") || typeof providerEventId !== "string" || !/^[a-zA-Z0-9_.:-]{1,150}$/.test(providerEventId)) {
    throw new CatalogError("invalid_payment_confirmation", "Confirma\xE7\xE3o inv\xE1lida.", 409);
  }
  let results;
  try {
    results = await db.batch([
      db.prepare(`UPDATE store_orders SET status='paid', mp_payment_id=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND status='awaiting_payment' AND mp_payment_id IS NULL`).bind(paymentId, orderId),
      db.prepare(`INSERT OR IGNORE INTO store_payment_events
        (provider_event_id,order_id,provider_payment_id,event_kind)
        SELECT ?,id,?,'payment.approved'
        FROM store_orders WHERE id=? AND status='paid' AND mp_payment_id=?`).bind(providerEventId, paymentId, orderId, paymentId),
      db.prepare(`SELECT id,status,mp_payment_id FROM store_orders WHERE id=?`).bind(orderId)
    ]);
  } catch {
    throw new CatalogError("payment_write_failed", "N\xE3o foi poss\xEDvel registrar pagamento.", 503);
  }
  const row = results?.[2]?.results?.[0];
  if (!row || row.status !== "paid" || String(row.mp_payment_id) !== paymentId) {
    throw new CatalogError(
      "payment_order_conflict",
      "Pagamento n\xE3o corresponde a um pedido aguardando pagamento.",
      409
    );
  }
  return {
    orderId,
    status: "paid",
    alreadyPaid: (results?.[0]?.meta?.changes || 0) === 0,
    // Receiving a payment must not silently initiate production.
    vaviOrderCreated: false
  };
}

// src/payment-webhook-service.js
var MP_API = "https://api.mercadopago.com";
var ID = /^\d{1,30}$/;
var ORDER_ID = /^ord_[0-9a-f]{32}$/;
async function processPaymentWebhook({ request, env, fetchImpl = fetch }) {
  if (env.WEBHOOK_PROCESSING_ENABLED !== "true" || !env.MERCADOPAGO_WEBHOOK_SECRET || !env.MERCADOPAGO_TEST_ACCESS_TOKEN || !env.DB) {
    throw new CatalogError("webhook_not_configured", "Notifica\xE7\xE3o ainda indispon\xEDvel.", 503);
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("data.id") || url.searchParams.get("id");
  const requestId = request.headers.get("x-request-id");
  if (!ID.test(id || "")) throw new CatalogError("invalid_notification", "ID inv\xE1lido.", 400);
  await verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId,
    dataId: id,
    secret: env.MERCADOPAGO_WEBHOOK_SECRET
  });
  let response;
  try {
    response = await fetchImpl(`${MP_API}/v1/payments/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.MERCADOPAGO_TEST_ACCESS_TOKEN}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(8e3)
    });
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Falha ao verificar pagamento.", 503);
  }
  if (!response.ok)
    throw new CatalogError("payment_provider_unavailable", "Falha ao verificar pagamento.", 503);
  let payment;
  try {
    payment = await response.json();
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Resposta inv\xE1lida.", 503);
  }
  if (String(payment?.id) !== id)
    throw new CatalogError("payment_mismatch", "Pagamento incorreto.", 409);
  const orderId = payment?.external_reference;
  if (!ORDER_ID.test(orderId || ""))
    throw new CatalogError("payment_mismatch", "Pedido n\xE3o reconhecido.", 409);
  const order = await env.DB.prepare(
    `SELECT id,status,currency,total_cents,mp_payment_id,mp_preference_id
     FROM store_orders WHERE id=? LIMIT 1`
  ).bind(orderId).first();
  if (!order || !["awaiting_payment", "paid"].includes(order.status))
    throw new CatalogError("payment_order_conflict", "Pedido n\xE3o dispon\xEDvel.", 409);
  if (payment.status !== "approved") return { processed: false, status: "not_approved" };
  const verified = validateConfirmedPayment(order, payment);
  const eventId = `mp:payment:${id}`;
  return await recordVerifiedPayment(env.DB, verified, eventId);
}

// src/mp-orders-sandbox.js
var ROOT = "https://api.mercadopago.com";
var ORDER = /^ord_[a-f0-9]{32}$/;
var ORDER_MP = /^ORD(?:TST)?[A-Z0-9]{12,50}$/;
var BRL = (x) => (x / 100).toFixed(2);
function buildOrdersCheckout({ order, items }) {
  if (!ORDER.test(order?.id || "") || !Number.isSafeInteger(order?.totalCents) || order.totalCents <= 0 || !Number.isSafeInteger(order?.shippingCents) || order.shippingCents < 0 || !Array.isArray(items) || items.length !== 1) {
    throw new CatalogError("orders_invalid_request", "Pedido de teste inv\xE1lido.", 409);
  }
  const item = items[0];
  if (item.sku !== "salve-regina-preta-g" || item.quantity !== 1 || item.unitPriceCents !== 10990 || !Number.isSafeInteger(item.totalCents) || item.totalCents !== 10990 || order.totalCents !== item.totalCents + order.shippingCents) {
    throw new CatalogError(
      "orders_invalid_total",
      "Total do checkout n\xE3o confere com o pedido.",
      409
    );
  }
  const paymentItems = [
    {
      title: "Camiseta Salve Regina - Preta G",
      quantity: 1,
      unit_price: BRL(item.unitPriceCents)
    }
  ];
  if (order.shippingCents > 0) paymentItems.push({
    title: "Frete VAVI",
    quantity: 1,
    unit_price: BRL(order.shippingCents)
  });
  return {
    type: "online",
    processing_mode: "manual",
    capture_mode: "automatic",
    total_amount: BRL(order.totalCents),
    external_reference: order.id,
    items: paymentItems
  };
}
function validateOrdersCheckoutResponse(response, expectedExternalReference) {
  if (!ORDER_MP.test(response?.id || "") || response?.external_reference !== expectedExternalReference || response?.status !== "created" || typeof response?.checkout_url !== "string")
    throw new CatalogError(
      "orders_invalid_response",
      "Resposta de homologa\xE7\xE3o inv\xE1lida.",
      503
    );
  let url;
  try {
    url = new URL(response.checkout_url);
  } catch {
    throw new CatalogError("orders_invalid_response", "URL de teste inv\xE1lida.", 503);
  }
  if (url.protocol !== "https:" || ![
    "www.mercadopago.com.br",
    "www.mercadopago.com"
  ].includes(url.hostname) || url.searchParams.get("order_id") !== response.id)
    throw new CatalogError("orders_invalid_response", "Checkout inesperado.", 503);
  return { providerOrderId: response.id, checkoutUrl: url.href };
}
async function createOrdersSandbox({ order, items, accessToken, fetchImpl = fetch }) {
  if (!accessToken || typeof accessToken !== "string")
    throw new CatalogError("orders_not_configured", "Token n\xE3o configurado.", 503);
  const payload = buildOrdersCheckout({ order, items });
  let response;
  try {
    response = await fetchImpl(ROOT + "/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Idempotency-Key": order.id
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1e4)
    });
  } catch {
    throw new CatalogError("orders_provider_unavailable", "Orders API indispon\xEDvel.", 503);
  }
  if (response.status !== 201)
    throw new CatalogError(
      "orders_provider_rejected",
      "Orders API n\xE3o aceitou a opera\xE7\xE3o de teste.",
      503
    );
  let json2;
  try {
    json2 = await response.json();
  } catch {
    throw new CatalogError("orders_invalid_response", "Resposta inv\xE1lida.", 503);
  }
  return validateOrdersCheckoutResponse(json2, order.id);
}
function validateOrdersPaymentStatus(provider, dbOrder, providerOrderId) {
  if (!ORDER_MP.test(providerOrderId || "") || provider?.id !== providerOrderId || provider?.external_reference !== dbOrder?.id || provider?.currency !== "BRL" || !Number.isSafeInteger(dbOrder?.total_cents)) {
    throw new CatalogError(
      "orders_payment_mismatch",
      "Order n\xE3o corresponde ao pedido.",
      409
    );
  }
  const parseCents = (value) => {
    if (typeof value !== "string" || !/^\d{1,8}\.\d{2}$/.test(value))
      throw new CatalogError("orders_payment_mismatch", "Valor inv\xE1lido.", 409);
    return Number(value.replace(".", ""));
  };
  if (parseCents(provider.total_amount) !== dbOrder.total_cents) {
    throw new CatalogError(
      "orders_payment_mismatch",
      "Valor da Order diverge do pedido.",
      409
    );
  }
  if (parseCents(provider.total_paid_amount || "0.00") !== dbOrder.total_cents || provider.status !== "processed" || provider.status_detail !== "accredited") {
    throw new CatalogError(
      "orders_not_approved",
      "Order ainda n\xE3o est\xE1 aprovada.",
      409
    );
  }
  const payments = provider.transactions?.payments;
  if (!Array.isArray(payments) || payments.length !== 1 || payments[0].status !== "processed" || payments[0].status_detail !== "accredited" || parseCents(payments[0].paid_amount) !== dbOrder.total_cents) {
    throw new CatalogError(
      "orders_payment_mismatch",
      "Transa\xE7\xE3o n\xE3o conciliada.",
      409
    );
  }
  return { orderId: dbOrder.id, providerOrderId, status: "verified_test_only" };
}

// src/mp-orders-webhook.js
var ORD = /^ORDTST[A-Z0-9]{12,50}$/;
var MP_API2 = "https://api.mercadopago.com";
async function saveOrdersLink(db, providerOrderId, orderId) {
  if (!ORD.test(providerOrderId || "") || !/^ord_[a-f0-9]{32}$/.test(orderId || "")) {
    throw new CatalogError("orders_invalid_link", "V\xEDnculo inv\xE1lido.", 409);
  }
  const r = await db.prepare(`INSERT INTO store_mp_order_links
    (provider_order_id,order_id)
    SELECT ?,id FROM store_orders
    WHERE id=? AND status='awaiting_payment' AND mp_payment_id IS NULL`).bind(providerOrderId, orderId).run();
  if (r?.meta?.changes !== 1)
    throw new CatalogError("orders_link_conflict", "V\xEDnculo n\xE3o criado.", 409);
  return { saved: true };
}
async function processOrdersWebhook({ request, env, fetchImpl = fetch }) {
  if (env.MP_ORDERS_WEBHOOK_ENABLED !== "true" || !env.MERCADOPAGO_WEBHOOK_SECRET || !env.MERCADOPAGO_TEST_ACCESS_TOKEN || !env.DB) {
    throw new CatalogError("orders_webhook_disabled", "Notifica\xE7\xE3o Orders n\xE3o habilitada.", 503);
  }
  const url = new URL(request.url);
  const providerOrderId = url.searchParams.get("data.id");
  if (url.searchParams.get("type") !== "order" || !ORD.test(providerOrderId || "")) {
    throw new CatalogError("orders_invalid_notification", "Notifica\xE7\xE3o Order inv\xE1lida.", 400);
  }
  await verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId: providerOrderId,
    secret: env.MERCADOPAGO_WEBHOOK_SECRET
  });
  const link = await env.DB.prepare(`SELECT l.provider_order_id,l.order_id,
      o.status,o.total_cents,o.currency
      FROM store_mp_order_links l JOIN store_orders o ON o.id=l.order_id
      WHERE l.provider_order_id=? LIMIT 1`).bind(providerOrderId).first();
  if (!link || !["awaiting_payment", "paid"].includes(link.status) || link.currency !== "BRL") {
    throw new CatalogError("orders_unknown_order", "Pedido n\xE3o encontrado.", 409);
  }
  let res;
  try {
    res = await fetchImpl(MP_API2 + "/v1/orders/" + providerOrderId, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + env.MERCADOPAGO_TEST_ACCESS_TOKEN,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(8e3)
    });
  } catch {
    throw new CatalogError("orders_provider_unavailable", "N\xE3o foi poss\xEDvel consultar Order.", 503);
  }
  if (!res?.ok) throw new CatalogError("orders_provider_unavailable", "Order indispon\xEDvel.", 503);
  let provider;
  try {
    provider = await res.json();
  } catch {
    throw new CatalogError("orders_provider_unavailable", "Resposta inv\xE1lida.", 503);
  }
  if (provider?.status !== "processed" || provider?.status_detail !== "accredited") {
    return { processed: false, status: "not_approved" };
  }
  validateOrdersPaymentStatus(
    provider,
    { id: link.order_id, total_cents: link.total_cents },
    providerOrderId
  );
  let results;
  try {
    results = await env.DB.batch([
      env.DB.prepare(`UPDATE store_orders SET status='paid',
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND status='awaiting_payment'
        AND EXISTS (SELECT 1 FROM store_mp_order_links
          WHERE provider_order_id=? AND order_id=?)`).bind(link.order_id, providerOrderId, link.order_id),
      env.DB.prepare(`INSERT OR IGNORE INTO store_payment_events
        (provider_event_id,order_id,provider_payment_id,event_kind)
        SELECT ?,id,NULL,'order.processed'
        FROM store_orders WHERE id=? AND status='paid'`).bind("mp:order:" + providerOrderId, link.order_id),
      env.DB.prepare(`SELECT id,status FROM store_orders WHERE id=?`).bind(link.order_id)
    ]);
  } catch {
    throw new CatalogError("orders_persistence_failed", "N\xE3o foi poss\xEDvel registrar aprova\xE7\xE3o.", 503);
  }
  if (results?.[2]?.results?.[0]?.status !== "paid") {
    throw new CatalogError("orders_status_conflict", "Aprova\xE7\xE3o n\xE3o registrada.", 409);
  }
  return {
    processed: true,
    status: "paid",
    orderId: link.order_id,
    alreadyPaid: (results[0]?.meta?.changes || 0) === 0,
    vaviOrderCreated: false
  };
}

// src/order-repository.js
var SKU = /^[A-Za-z0-9_.-]{1,90}$/;
var ZIP = /^\d{8}$/;
var SHIPPING = /^[A-Za-z0-9_.:-]{1,120}$/;
function prepareDraftOrder({
  lines,
  subtotalCents,
  shippingCents,
  shippingOptionId,
  destinationZip,
  orderId
}) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 15 || typeof orderId !== "string" || !/^ord_[a-f0-9]{32}$/.test(orderId) || !ZIP.test(destinationZip || "") || !SHIPPING.test(shippingOptionId || "")) {
    throw new CatalogError("invalid_order", "Pedido ainda n\xE3o est\xE1 pronto.", 409);
  }
  const seen = /* @__PURE__ */ new Set();
  const items = lines.map((line) => {
    if (!line || !SKU.test(line.sku || "") || seen.has(line.sku) || typeof line.name !== "string" || !line.name.trim() || typeof line.variation !== "string" || line.name.length > 180 || line.variation.length > 180 || !Number.isSafeInteger(line.totalCents) || line.totalCents !== line.quantity * line.unitPriceCents) {
      throw new CatalogError("invalid_order_item", "Itens inv\xE1lidos.", 409);
    }
    seen.add(line.sku);
    return {
      sku: line.sku,
      label: (line.name + " \u2014 " + line.variation).slice(0, 360),
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents: line.totalCents
    };
  });
  const totalCents = subtotalCents + shippingCents;
  validateDraftTotals({ items, subtotalCents, shippingCents, totalCents });
  return {
    id: orderId,
    status: "draft",
    currency: "BRL",
    subtotalCents,
    shippingCents,
    totalCents,
    shippingOptionId,
    destinationZip,
    items
  };
}
function newOrderId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return "ord_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function insertDraftOrder(db, draft) {
  if (!db || typeof db.batch !== "function" || typeof db.prepare !== "function") {
    throw new CatalogError("database_not_configured", "Banco indispon\xEDvel.", 503);
  }
  const d = prepareDraftOrder({
    lines: draft?.items?.map((i) => ({
      sku: i.sku,
      name: i.label,
      variation: "",
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      totalCents: i.lineTotalCents
    })),
    subtotalCents: draft?.subtotalCents,
    shippingCents: draft?.shippingCents,
    shippingOptionId: draft?.shippingOptionId,
    destinationZip: draft?.destinationZip,
    orderId: draft?.id
  });
  const statements = [
    db.prepare(`INSERT INTO store_orders
      (id,status,currency,subtotal_cents,shipping_cents,total_cents,
       shipping_option_id,destination_zip)
      VALUES (?,'draft','BRL',?,?,?,?,?)`).bind(
      d.id,
      d.subtotalCents,
      d.shippingCents,
      d.totalCents,
      d.shippingOptionId,
      d.destinationZip
    ),
    ...d.items.map((i) => db.prepare(`INSERT INTO store_order_items
      (order_id,sku,label,quantity,unit_price_cents,line_total_cents)
      VALUES (?,?,?,?,?,?)`).bind(
      d.id,
      i.sku,
      i.label,
      i.quantity,
      i.unitPriceCents,
      i.lineTotalCents
    ))
  ];
  try {
    await db.batch(statements);
  } catch {
    throw new CatalogError("order_write_failed", "N\xE3o foi poss\xEDvel registrar pedido.", 503);
  }
  return { id: d.id, status: "draft", totalCents: d.totalCents };
}

// src/mercado-pago.js
function buildPreference({ lines, shippingCents, orderId, siteBaseUrl, notificationUrl }) {
  if (!Array.isArray(lines) || lines.length === 0 || !Number.isSafeInteger(shippingCents) || shippingCents < 0 || typeof orderId !== "string" || !/^[a-zA-Z0-9_-]{8,90}$/.test(orderId)) {
    throw new CatalogError("checkout_invalid_order", "Pedido ainda n\xE3o est\xE1 pronto para pagamento.", 409);
  }
  let site;
  let notification;
  try {
    site = new URL(siteBaseUrl);
    notification = new URL(notificationUrl);
  } catch {
    throw new CatalogError("checkout_invalid_configuration", "URLs de checkout n\xE3o configuradas.", 503);
  }
  if (site.protocol !== "https:" || notification.protocol !== "https:") {
    throw new CatalogError("checkout_invalid_configuration", "HTTPS obrigat\xF3rio.", 503);
  }
  const items = lines.map((line) => {
    if (!line || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents <= 0 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10 || typeof line.name !== "string" || line.name.length < 1 || typeof line.sku !== "string") {
      throw new CatalogError("checkout_invalid_order", "Itens de pagamento inv\xE1lidos.", 409);
    }
    return {
      id: line.sku,
      title: line.name,
      quantity: line.quantity,
      currency_id: "BRL",
      unit_price: line.unitPriceCents / 100
    };
  });
  const shipments = { cost: shippingCents / 100, mode: "not_specified" };
  const base = site.origin;
  return {
    items,
    shipments,
    external_reference: orderId,
    back_urls: {
      success: base + "/pages/resultado-pagamento.html?pagamento=sucesso",
      pending: base + "/pages/resultado-pagamento.html?pagamento=pendente",
      failure: base + "/pages/resultado-pagamento.html?pagamento=falha"
    },
    notification_url: notification.toString(),
    auto_return: "approved"
  };
}
function validatePreferenceResponse(body) {
  const url = body?.init_point;
  if (typeof url !== "string") {
    throw new CatalogError("payment_provider_unavailable", "Checkout indispon\xEDvel.", 503);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Checkout indispon\xEDvel.", 503);
  }
  if (parsed.protocol !== "https:" || ![
    "www.mercadopago.com.br",
    "www.mercadopago.com",
    "mercadopago.com.br",
    "mercadopago.com"
  ].includes(parsed.hostname)) {
    throw new CatalogError("payment_provider_unavailable", "Checkout inv\xE1lido.", 503);
  }
  return url;
}

// src/payment-preference-client.js
async function createTestPreference({
  order,
  lines,
  shippingCents,
  accessToken,
  siteBaseUrl,
  notificationUrl,
  fetchImpl = fetch
}) {
  if (!order || order.status !== "draft" || !Number.isSafeInteger(order.totalCents) || typeof accessToken !== "string" || !accessToken) {
    throw new CatalogError("checkout_not_ready", "Pagamento de teste n\xE3o est\xE1 configurado.", 503);
  }
  const lineTotal = lines?.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(shippingCents) || order.totalCents !== lineTotal + shippingCents) {
    throw new CatalogError("checkout_total_mismatch", "Valor do pagamento n\xE3o confere.", 409);
  }
  const preference = buildPreference({
    lines,
    shippingCents,
    orderId: order.id,
    siteBaseUrl,
    notificationUrl
  });
  let response;
  try {
    response = await fetchImpl("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Idempotency-Key": order.id
      },
      body: JSON.stringify(preference),
      signal: AbortSignal.timeout(1e4)
    });
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Mercado Pago indispon\xEDvel.", 503);
  }
  if (!response.ok) {
    throw new CatalogError("payment_provider_unavailable", "Mercado Pago recusou a prefer\xEAncia.", 503);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Resposta de pagamento inv\xE1lida.", 503);
  }
  const checkoutUrl = validatePreferenceResponse(data);
  if (typeof data.id !== "string" || !data.id) {
    throw new CatalogError("payment_provider_unavailable", "Identificador de prefer\xEAncia ausente.", 503);
  }
  return { preferenceId: data.id, checkoutUrl };
}

// src/delivery-repository.js
var clean = (value, max) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
var digits = (value) => typeof value === "string" ? value.replace(/\D/g, "") : "";
function validateBuyerDetails(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new CatalogError("invalid_delivery", "Dados de entrega inv\xE1lidos.", 422);
  const name = clean(input.name, 160), email = clean(input.email, 200), phone = digits(input.phone), taxId = digits(input.taxId), street = clean(input.street, 180), number = clean(input.number, 30), neighborhood = clean(input.neighborhood, 90), city = clean(input.city, 90), state = typeof input.state === "string" ? input.state.trim().toUpperCase() : "";
  const complement = typeof input.complement === "string" ? input.complement.trim() : "";
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{10,13}$/.test(phone) || !/^(\d{11}|\d{14})$/.test(taxId) || !street || !number || !neighborhood || !city || !/^[A-Z]{2}$/.test(state) || complement.length > 120)
    throw new CatalogError("invalid_delivery", "Preencha os dados de entrega e contato.", 422);
  return {
    name,
    email,
    phone,
    taxId,
    zipCode: normalizeZip(input.zipCode),
    street,
    number,
    complement,
    neighborhood,
    city,
    state
  };
}
function decodeKey(base64) {
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(base64))
    throw new CatalogError(
      "delivery_encryption_not_configured",
      "Prote\xE7\xE3o dos dados de entrega n\xE3o configurada.",
      503
    );
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean64 = base64.slice(0, -1);
  let bits = 0, buffer = 0;
  const bytes = [];
  for (const c of clean64) {
    const n = alphabet.indexOf(c);
    if (n < 0) throw new Error("bad base64");
    buffer = buffer << 6 | n;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  if (bytes.length !== 32) throw new CatalogError(
    "delivery_encryption_not_configured",
    "Chave de prote\xE7\xE3o inv\xE1lida.",
    503
  );
  return new Uint8Array(bytes);
}
async function aesKey(base64) {
  return crypto.subtle.importKey("raw", decodeKey(base64), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
var hex2 = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
var unhex = (value) => new Uint8Array(value.match(/.{2}/g)?.map((v) => parseInt(v, 16)) || []);
async function encryptDelivery(orderId, buyer, keyBase64) {
  if (!/^ord_[0-9a-f]{32}$/.test(orderId || ""))
    throw new CatalogError("invalid_order_id", "Pedido inv\xE1lido.", 422);
  const normalized = validateBuyerDetails(buyer);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(normalized));
  const ciphertext = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: new TextEncoder().encode(orderId)
  }, await aesKey(keyBase64), encoded);
  return {
    orderId,
    zipCode: normalized.zipCode,
    encryptedPayload: hex2(new Uint8Array(ciphertext)),
    iv: hex2(iv)
  };
}
async function decryptDelivery(orderId, record, keyBase64) {
  if (!/^ord_[0-9a-f]{32}$/.test(orderId || "") || !/^[a-f0-9]{24}$/.test(record?.iv || "") || !/^(?:[a-f0-9]{2}){16,4096}$/.test(record?.encrypted_payload || "")) {
    throw new CatalogError("invalid_delivery_record", "Entrega n\xE3o dispon\xEDvel.", 409);
  }
  try {
    const plaintext = await crypto.subtle.decrypt({
      name: "AES-GCM",
      iv: unhex(record.iv),
      additionalData: new TextEncoder().encode(orderId)
    }, await aesKey(keyBase64), unhex(record.encrypted_payload));
    return validateBuyerDetails(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    throw new CatalogError("delivery_decryption_failed", "Entrega indispon\xEDvel para confer\xEAncia.", 503);
  }
}
async function storeEncryptedDelivery(db, envelope) {
  if (!db?.prepare || !/^ord_[a-f0-9]{32}$/.test(envelope?.orderId || ""))
    throw new CatalogError("invalid_delivery_record", "Entrega inv\xE1lida.", 409);
  try {
    const result = await db.prepare(`INSERT INTO store_order_delivery
      (order_id,destination_zip,encrypted_payload,iv)
      SELECT id,?,?,? FROM store_orders
      WHERE id=? AND status='draft' AND destination_zip=?`).bind(
      envelope.zipCode,
      envelope.encryptedPayload,
      envelope.iv,
      envelope.orderId,
      envelope.zipCode
    ).run();
    if (result.meta?.changes !== 1)
      throw new CatalogError("delivery_order_mismatch", "Endere\xE7o e pedido n\xE3o conferem.", 409);
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    throw new CatalogError("delivery_write_failed", "N\xE3o foi poss\xEDvel salvar a entrega.", 503);
  }
  return { orderId: envelope.orderId, saved: true };
}

// src/checkout-orchestrator.js
var PRICE_TO_CENTS = (x) => Number.isFinite(x) ? Math.round(x * 100) : NaN;
async function createCheckoutTest(env, body, deps = {}) {
  if (env.CHECKOUT_TEST_ENABLED !== "true" || env.WEBHOOK_PROCESSING_ENABLED !== "true" || env.DELIVERY_PERSISTENCE_ENABLED !== "true") {
    throw new CatalogError(
      "checkout_not_ready",
      "Checkout indispon\xEDvel at\xE9 finalizar notifica\xE7\xF5es e entrega.",
      503
    );
  }
  if (!env.DB || !env.MERCADOPAGO_TEST_ACCESS_TOKEN || !env.VAVI_SHIPPING_PRODUCTS_JSON || !env.DELIVERY_ENCRYPTION_KEY_B64) {
    throw new CatalogError(
      "checkout_not_configured",
      "Pagamento de teste ou frete n\xE3o configurado.",
      503
    );
  }
  const buyer = validateBuyerDetails(body?.buyer);
  const cart = normalizeCart(body);
  if (cart.length !== 1 || cart[0].quantity !== 1) {
    throw new CatalogError(
      "checkout_quantity_not_supported",
      "No lan\xE7amento, uma camiseta por pedido.",
      422
    );
  }
  const zip = normalizeZip(body.zipCode);
  if (buyer.zipCode !== zip) throw new CatalogError(
    "delivery_zip_mismatch",
    "O CEP da cota\xE7\xE3o n\xE3o confere com o endere\xE7o.",
    422
  );
  if (!deps.loadVariant && cart[0].sku !== "salve-regina-preta-g") {
    throw new CatalogError(
      "checkout_test_sku_restricted",
      "Somente a camiseta G pode ser testada.",
      409
    );
  }
  const load = deps.loadVariant || (async (sku) => {
    const variant = await env.DB.prepare(
      `SELECT v.sku,v.label,v.price_cents,v.available,p.name,
       p.enabled AS product_enabled,p.verified AS product_verified
       FROM variants v JOIN products p ON p.id=v.product_id
       WHERE v.sku=? LIMIT 1`
    ).bind(sku).first();
    if (!variant || variant.sku !== "salve-regina-preta-g" || variant.price_cents !== 10990 || env.CHECKOUT_TEST_CATALOG_OVERRIDE !== "true") {
      throw new CatalogError(
        "checkout_test_product_unverified",
        "Produto de homologa\xE7\xE3o n\xE3o conferido.",
        409
      );
    }
    return { ...variant, product_enabled: 1, product_verified: 1, available: 1 };
  });
  const quote = await quoteCart(cart, load);
  const freight = await (deps.simulateShipping || simulateVaviShipping)(
    env,
    zip,
    quote.lines
  );
  if (!Array.isArray(freight) || !freight.length) {
    throw new CatalogError("shipping_unavailable", "Frete indispon\xEDvel.", 409);
  }
  const selected = freight.find((x) => String(x.id) === body.shippingOptionId && !/retirada|retire|pickup/i.test(String(x.name || "")));
  if (!selected || selected.isActive !== true || typeof selected.shippingCost !== "number" || selected.shippingCost < 0) {
    throw new CatalogError(
      "shipping_option_invalid",
      "Selecione um frete v\xE1lido para seu CEP.",
      422
    );
  }
  const freightCents = PRICE_TO_CENTS(selected.shippingCost);
  if (!Number.isSafeInteger(freightCents) || freightCents < 0)
    throw new CatalogError("shipping_option_invalid", "Frete inv\xE1lido.", 422);
  const orderId = newOrderId();
  const envelope = await (deps.encryptBuyer || encryptDelivery)(
    orderId,
    buyer,
    env.DELIVERY_ENCRYPTION_KEY_B64
  );
  const draft = prepareDraftOrder({
    orderId,
    lines: quote.lines,
    subtotalCents: quote.subtotalCents,
    shippingCents: freightCents,
    shippingOptionId: String(selected.id),
    destinationZip: zip
  });
  await (deps.insertDraft || insertDraftOrder)(env.DB, draft);
  await (deps.storeDelivery || storeEncryptedDelivery)(env.DB, envelope);
  if (env.CHECKOUT_TEST_PAYMENT_MODE === "orders") {
    if (env.MP_ORDERS_WEBHOOK_ENABLED !== "true") {
      throw new CatalogError(
        "orders_webhook_disabled",
        "Confirma\xE7\xE3o Orders ainda n\xE3o est\xE1 habilitada.",
        503
      );
    }
    const provider = await (deps.createOrders || createOrdersSandbox)({
      order: draft,
      items: quote.lines,
      accessToken: env.MERCADOPAGO_TEST_ACCESS_TOKEN
    });
    const update2 = await env.DB.prepare(`UPDATE store_orders
      SET status='awaiting_payment',
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=? AND status='draft' AND mp_preference_id IS NULL`).bind(orderId).run();
    if (update2?.meta?.changes !== 1) throw new CatalogError(
      "checkout_persistence_failed",
      "Pedido n\xE3o confirmado para Orders.",
      503
    );
    await (deps.saveOrdersLink || saveOrdersLink)(env.DB, provider.providerOrderId, orderId);
    return {
      mode: "test_orders",
      orderId,
      amountCents: draft.totalCents,
      checkoutUrl: provider.checkoutUrl
    };
  }
  const preference = await (deps.createPreference || createTestPreference)({
    order: draft,
    lines: quote.lines,
    shippingCents: freightCents,
    accessToken: env.MERCADOPAGO_TEST_ACCESS_TOKEN,
    siteBaseUrl: "https://www.douglasassumpcao.com.br",
    notificationUrl: "https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/webhook"
  });
  const update = await env.DB.prepare(`UPDATE store_orders
    SET status='awaiting_payment', mp_preference_id=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=? AND status='draft' AND mp_preference_id IS NULL`).bind(preference.preferenceId, orderId).run();
  if (update?.meta?.changes !== 1) {
    throw new CatalogError(
      "checkout_persistence_failed",
      "Pagamento n\xE3o liberado: pedido n\xE3o confirmado no banco.",
      503
    );
  }
  return {
    mode: "test",
    orderId,
    amountCents: draft.totalCents,
    checkoutUrl: preference.checkoutUrl
  };
}

// src/salve-regina-variants.js
var SALVE_REGINA_VARIANTS = Object.freeze({
  "salve-regina-preta-p": { size: "P", priceCents: 10990 },
  "salve-regina-preta-m": { size: "M", priceCents: 10990 },
  "salve-regina-preta-g": { size: "G", priceCents: 10990 },
  "salve-regina-preta-gg": { size: "GG", priceCents: 10990 },
  "salve-regina-preta-xg": { size: "XG", priceCents: 11990 }
});
var SALVE_REGINA_SKUS = Object.keys(SALVE_REGINA_VARIANTS);
function approvedVariant(sku, priceCents) {
  return Object.hasOwn(SALVE_REGINA_VARIANTS, sku) && SALVE_REGINA_VARIANTS[sku].priceCents === priceCents;
}

// src/checkout-live.js
var SITE = "https://www.douglasassumpcao.com.br";
var NOTIFY = "https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/payments/live-webhook";
function liveCheckoutReady(env) {
  return Boolean(env.DB && env.LIVE_CHECKOUT_ENABLED === "true" && env.LIVE_PRODUCT_APPROVED === "true" && env.LIVE_POLICY_APPROVED === "true" && env.LIVE_WEBHOOK_ENABLED === "true" && env.DELIVERY_PERSISTENCE_ENABLED === "true" && env.MERCADOPAGO_LIVE_ACCESS_TOKEN && env.MERCADOPAGO_LIVE_WEBHOOK_SECRET && env.SHOP_ADMIN_API_KEY && env.SHOP_ADMIN_API_KEY.length >= 32 && env.DELIVERY_ENCRYPTION_KEY_B64 && env.VAVI_CLIENT_ID && env.VAVI_CLIENT_SECRET && env.VAVI_SHIPPING_PRODUCTS_JSON);
}
async function createCheckoutLive(env, body, deps = {}) {
  if (!liveCheckoutReady(env))
    throw new CatalogError("live_checkout_disabled", "Compra online ainda indispon\xEDvel.", 503);
  const buyer = validateBuyerDetails(body?.buyer);
  const items = normalizeCart(body);
  if (items.length !== 1 || !Object.hasOwn(SALVE_REGINA_VARIANTS, items[0].sku) || items[0].quantity !== 1)
    throw new CatalogError(
      "live_product_unavailable",
      "Somente uma camiseta Salve Regina preta por pedido.",
      409
    );
  const zip = normalizeZip(body.zipCode);
  if (buyer.zipCode !== zip)
    throw new CatalogError("delivery_zip_mismatch", "O CEP do endere\xE7o difere do CEP do frete.", 422);
  const load = deps.loadVariant || ((sku) => env.DB.prepare(
    `SELECT v.sku,v.label,v.price_cents,v.available,p.name,
    p.enabled AS product_enabled,p.verified AS product_verified
    FROM variants v JOIN products p ON p.id=v.product_id
    WHERE v.sku=? LIMIT 1`
  ).bind(sku).first());
  const quote = await quoteCart(items, load);
  if (!approvedVariant(items[0].sku, quote.lines[0]?.unitPriceCents) || quote.subtotalCents !== SALVE_REGINA_VARIANTS[items[0].sku].priceCents)
    throw new CatalogError("live_price_unapproved", "Pre\xE7o da camiseta precisa ser revisado.", 503);
  const quotes = await (deps.simulateShipping || simulateVaviShipping)(env, zip, quote.lines);
  const option = Array.isArray(quotes) && quotes.find((x) => x.isActive === true && String(x.id) === body.shippingOptionId && !/retirada|retire|pickup/i.test(String(x.name || "")));
  if (!option || !Number.isFinite(option.shippingCost) || option.shippingCost < 0 || Math.abs(option.shippingCost * 100 - Math.round(option.shippingCost * 100)) > 1e-6)
    throw new CatalogError("shipping_option_invalid", "Frete n\xE3o dispon\xEDvel para este CEP.", 422);
  const shippingCents = Math.round(option.shippingCost * 100);
  if (!Number.isSafeInteger(shippingCents) || shippingCents > 1e5)
    throw new CatalogError("shipping_option_invalid", "Frete inv\xE1lido.", 422);
  const orderId = newOrderId();
  const draft = prepareDraftOrder({
    orderId,
    lines: quote.lines,
    subtotalCents: quote.subtotalCents,
    shippingCents,
    shippingOptionId: String(option.id),
    destinationZip: zip
  });
  const envelope = await (deps.encryptDelivery || encryptDelivery)(
    orderId,
    buyer,
    env.DELIVERY_ENCRYPTION_KEY_B64
  );
  await (deps.insertDraftOrder || insertDraftOrder)(env.DB, draft);
  const mode = await env.DB.prepare(`UPDATE store_orders SET payment_environment='live'
    WHERE id=? AND status='draft' AND payment_environment='test'`).bind(orderId).run();
  if (mode?.meta?.changes !== 1)
    throw new CatalogError("live_schema_unavailable", "Checkout n\xE3o configurado no banco.", 503);
  await (deps.storeEncryptedDelivery || storeEncryptedDelivery)(env.DB, envelope);
  const preference = await (deps.createPreference || createTestPreference)({
    order: draft,
    lines: quote.lines,
    shippingCents,
    accessToken: env.MERCADOPAGO_LIVE_ACCESS_TOKEN,
    siteBaseUrl: SITE,
    notificationUrl: NOTIFY
  });
  const update = await env.DB.prepare(`UPDATE store_orders
    SET status='awaiting_payment',mp_preference_id=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=? AND status='draft' AND payment_environment='live'
    AND mp_preference_id IS NULL`).bind(preference.preferenceId, orderId).run();
  if (update?.meta?.changes !== 1)
    throw new CatalogError("checkout_persistence_failed", "Pedido n\xE3o preparado para pagamento.", 503);
  return {
    mode: "live",
    orderId,
    totalCents: draft.totalCents,
    checkoutUrl: preference.checkoutUrl
  };
}

// src/vavi-order-contract.js
var ORDER_ID2 = /^ord_[0-9a-f]{32}$/;
var CEP = /^\d{8}$/;
var STR = (x, max = 160) => typeof x === "string" && x.trim().length > 0 && x.trim().length <= max;
var MONEY = (n) => Number.isSafeInteger(n) && n >= 0;
var brl = (cents) => Number((cents / 100).toFixed(2));
function buildVaviIntegrationOrder({ order, buyer, items }) {
  if (!order || !ORDER_ID2.test(order.id || "") || order.status !== "paid" || !MONEY(order.subtotalCents) || !MONEY(order.shippingCents) || !MONEY(order.totalCents) || order.totalCents !== order.subtotalCents + order.shippingCents || !STR(order.mpPaymentId, 80)) {
    throw new CatalogError(
      "vavi_unverified_payment",
      "N\xE3o \xE9 poss\xEDvel enviar pedido sem confirma\xE7\xE3o persistida de pagamento.",
      409
    );
  }
  if (!buyer || !STR(buyer.name, 160) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email || "") || !/^[\d+()\s-]{8,24}$/.test(buyer.phone || "") || !/^\d{11}$|^\d{14}$/.test(buyer.taxId || "") || !CEP.test(buyer.zipCode || "") || !STR(buyer.street, 180) || !STR(buyer.number, 30) || !STR(buyer.neighborhood, 90) || !STR(buyer.city, 90) || !/^[A-Z]{2}$/.test(buyer.state || "")) {
    throw new CatalogError(
      "vavi_invalid_buyer",
      "Dados de entrega incompletos para o pedido.",
      422
    );
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 15) {
    throw new CatalogError("vavi_invalid_items", "Itens do pedido inv\xE1lidos.", 409);
  }
  const clean2 = items.map((item) => {
    if (!item || !STR(item.name, 180) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 || !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents <= 0 || item.sku !== void 0 && item.sku !== null && !STR(item.sku, 90)) {
      throw new CatalogError("vavi_invalid_items", "Itens do pedido inv\xE1lidos.", 409);
    }
    return {
      name: item.name,
      sku: item.sku || void 0,
      quantity: item.quantity,
      unitPrice: brl(item.unitPriceCents)
    };
  });
  const sum = items.reduce((total, i) => total + i.unitPriceCents * i.quantity, 0);
  if (!Number.isSafeInteger(sum) || sum !== order.subtotalCents || buyer.zipCode !== order.destinationZip) {
    throw new CatalogError("vavi_total_mismatch", "Pedido e entrega n\xE3o conferem.", 409);
  }
  return {
    code: order.id,
    requestClientId: order.id,
    buyer: {
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      taxId: buyer.taxId,
      zipCode: buyer.zipCode,
      street: buyer.street,
      number: buyer.number,
      complement: buyer.complement || "",
      neighborhood: buyer.neighborhood,
      city: buyer.city,
      state: buyer.state
    },
    status: "paid",
    freightAmount: brl(order.shippingCents),
    paidAmount: brl(order.totalCents),
    items: clean2
  };
}

// src/vavi-draft-client.js
var ROOT2 = "https://api.printbee.com.br";
async function createVaviDraft({
  payload,
  accessToken,
  approvedPayment,
  fetchImpl = fetch
}) {
  if (!approvedPayment || approvedPayment.status !== "paid" || !/^[A-Za-z0-9_-]{8,90}$/.test(approvedPayment.orderId || "") || typeof accessToken !== "string" || !accessToken || !payload || typeof payload !== "object" || Array.isArray(payload) || typeof payload.code !== "string" || payload.code !== approvedPayment.orderId || !Array.isArray(payload.items) || payload.items.length === 0 || !payload.items.every((x) => x && typeof x.name === "string" && x.name.trim() && Number.isInteger(x.quantity) && x.quantity >= 1)) {
    throw new CatalogError(
      "vavi_draft_not_ready",
      "Rascunho VAVI bloqueado: pedido ainda n\xE3o foi validado.",
      409
    );
  }
  let response;
  try {
    response = await fetchImpl(ROOT2 + "/api/Customers/Integrations/Orders", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1e4)
    });
  } catch {
    throw new CatalogError("vavi_unavailable", "VAVI temporariamente indispon\xEDvel.", 503);
  }
  if (response.status !== 202) {
    throw new CatalogError(
      "vavi_draft_rejected",
      "A VAVI n\xE3o confirmou a cria\xE7\xE3o do rascunho.",
      503
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new CatalogError(
      "vavi_invalid_response",
      "N\xE3o foi poss\xEDvel confirmar o rascunho.",
      503
    );
  }
  const result = data?.data;
  const allowed = /* @__PURE__ */ new Set(["Pending", "Reviewing", "Ready", "Converted"]);
  if (data?.code !== 202 || !result || typeof result.draftId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.draftId) || !allowed.has(result.status)) {
    throw new CatalogError(
      "vavi_draft_requires_review",
      "Rascunho n\xE3o foi confirmado como utiliz\xE1vel na VAVI.",
      503
    );
  }
  return { status: "vavi_draft", response: data };
}

// src/vavi-auth.js
var TOKEN_URL = "https://api.printbee.com.br/api/Auth/Token";
async function obtainVaviAccessToken(env, fetchImpl = fetch) {
  const clientId = env?.VAVI_CLIENT_ID;
  const clientSecret = env?.VAVI_CLIENT_SECRET;
  if (typeof clientId !== "string" || !clientId || typeof clientSecret !== "string" || !clientSecret)
    throw new CatalogError("vavi_credentials_missing", "Credenciais VAVI indispon\xEDveis.", 503);
  let response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        grantType: "client_credentials",
        clientId,
        clientSecret,
        expires: 1
      }),
      signal: AbortSignal.timeout(8e3)
    });
  } catch {
    throw new CatalogError("vavi_auth_unavailable", "Autentica\xE7\xE3o VAVI indispon\xEDvel.", 503);
  }
  if (!response?.ok)
    throw new CatalogError("vavi_auth_failed", "Credenciais VAVI n\xE3o autorizadas.", 503);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new CatalogError("vavi_auth_invalid", "Resposta de autentica\xE7\xE3o inv\xE1lida.", 503);
  }
  const accessToken = data?.data?.access_token;
  if (typeof accessToken !== "string" || !accessToken.trim() || accessToken.length > 8192)
    throw new CatalogError("vavi_auth_invalid", "Token VAVI inv\xE1lido.", 503);
  return accessToken;
}

// src/vavi-auto-draft.js
var ID2 = /^ord_[a-f0-9]{32}$/;
var LIMIT = 3;
function vaviAutoDraftReady(env) {
  return env?.VAVI_AUTO_DRAFT_ENABLED === "true" && env?.LIVE_WEBHOOK_ENABLED === "true" && env?.LIVE_PRODUCT_APPROVED === "true" && env?.LIVE_POLICY_APPROVED === "true" && typeof env?.VAVI_CLIENT_ID === "string" && env.VAVI_CLIENT_ID.length > 0 && typeof env?.VAVI_CLIENT_SECRET === "string" && env.VAVI_CLIENT_SECRET.length > 0 && Boolean(env.DB?.prepare && env.DELIVERY_ENCRYPTION_KEY_B64);
}
async function enqueuePaidVaviDraft(env, orderId) {
  if (!vaviAutoDraftReady(env)) return { queued: false, reason: "disabled" };
  if (!ID2.test(orderId || "")) throw new CatalogError("invalid_order_id", "Pedido inv\xE1lido.", 400);
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO store_vavi_draft_dispatch(order_id,state)
    SELECT id,'pending' FROM store_orders
    WHERE id=? AND status='paid' AND payment_environment='live'
    AND mp_payment_id IS NOT NULL AND vavi_order_id IS NULL`).bind(orderId).run();
  return { queued: result.meta?.changes === 1 };
}
async function dispatchVaviDraft(env, orderId, sendDraft = createVaviDraft, authenticate = obtainVaviAccessToken) {
  if (!vaviAutoDraftReady(env)) return { sent: false, reason: "disabled" };
  if (!ID2.test(orderId || "")) throw new CatalogError("invalid_order_id", "Pedido inv\xE1lido.", 400);
  const claim = await env.DB.prepare(`UPDATE store_vavi_draft_dispatch
    SET state='sending',attempted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    last_error=NULL
    WHERE order_id=? AND state='pending'
      AND EXISTS (SELECT 1 FROM store_orders
        WHERE id=? AND status='paid' AND payment_environment='live'
          AND mp_payment_id IS NOT NULL AND vavi_order_id IS NULL)`).bind(orderId, orderId).run();
  if (claim.meta?.changes !== 1) return { sent: false, reason: "already_claimed" };
  try {
    const order = await env.DB.prepare(`SELECT id,status,subtotal_cents,shipping_cents,
      total_cents,destination_zip,mp_payment_id,payment_environment
      FROM store_orders WHERE id=? LIMIT 1`).bind(orderId).first();
    if (!order || order.status !== "paid" || order.payment_environment !== "live" || !/^\d{1,30}$/.test(order.mp_payment_id || ""))
      throw new CatalogError("vavi_unverified_payment", "Pagamento n\xE3o confirmado.", 409);
    const [itemsResult, delivery] = await Promise.all([
      env.DB.prepare(`SELECT sku,label,quantity,unit_price_cents
        FROM store_order_items WHERE order_id=? ORDER BY sku`).bind(orderId).all(),
      env.DB.prepare(`SELECT encrypted_payload,iv
        FROM store_order_delivery WHERE order_id=?`).bind(orderId).first()
    ]);
    if (!delivery) throw new CatalogError("delivery_not_found", "Dados protegidos indispon\xEDveis.", 503);
    const buyer = await decryptDelivery(orderId, delivery, env.DELIVERY_ENCRYPTION_KEY_B64);
    const items = (itemsResult.results || []).map((x) => ({
      name: x.label,
      sku: x.sku,
      quantity: x.quantity,
      unitPriceCents: x.unit_price_cents
    }));
    const payload = buildVaviIntegrationOrder({
      order: {
        id: order.id,
        status: order.status,
        subtotalCents: order.subtotal_cents,
        shippingCents: order.shipping_cents,
        totalCents: order.total_cents,
        mpPaymentId: order.mp_payment_id,
        destinationZip: order.destination_zip
      },
      buyer,
      items
    });
    const accessToken = await authenticate(env);
    const accepted = await sendDraft({
      payload,
      accessToken,
      approvedPayment: { orderId, status: "paid" }
    });
    const returned = accepted?.response?.data;
    const draftId = returned?.draftId ?? returned?.id;
    if (accepted?.status !== "vavi_draft" || typeof draftId !== "string" && typeof draftId !== "number" || !String(draftId).trim())
      throw new CatalogError("vavi_draft_unconfirmed", "Rascunho sem identificador confirmado.", 503);
    const saved = await env.DB.prepare(`UPDATE store_vavi_draft_dispatch
      SET state='submitted',vavi_draft_id=?,
      submitted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),last_error=NULL
      WHERE order_id=? AND state='sending'`).bind(String(draftId), orderId).run();
    if (saved.meta?.changes !== 1)
      throw new CatalogError("vavi_draft_persistence_failed", "Registro remoto exige confer\xEAncia.", 503);
    return { sent: true, orderId, draftId: String(draftId) };
  } catch (error) {
    try {
      await env.DB.prepare(`UPDATE store_vavi_draft_dispatch
        SET state='needs_review',last_error='remote_result_requires_review'
        WHERE order_id=? AND state='sending'`).bind(orderId).run();
    } catch {
    }
    return { sent: false, orderId, reason: "needs_review" };
  }
}
async function processPendingPaidVaviDrafts(env, sendDraft = createVaviDraft) {
  if (!vaviAutoDraftReady(env)) return { processed: 0, reason: "disabled" };
  const candidates = await env.DB.prepare(`SELECT id FROM store_orders
    WHERE status='paid' AND payment_environment='live'
      AND mp_payment_id IS NOT NULL AND vavi_order_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM store_vavi_draft_dispatch
        WHERE order_id=store_orders.id)
    ORDER BY created_at ASC LIMIT ?`).bind(LIMIT).all();
  for (const row of candidates.results || []) await enqueuePaidVaviDraft(env, row.id);
  const pending = await env.DB.prepare(`SELECT q.order_id FROM store_vavi_draft_dispatch q
    JOIN store_orders o ON o.id=q.order_id
    WHERE q.state='pending' AND o.status='paid'
      AND o.payment_environment='live' AND o.mp_payment_id IS NOT NULL
      AND o.vavi_order_id IS NULL
    ORDER BY q.created_at ASC LIMIT ?`).bind(LIMIT).all();
  const results = [];
  for (const row of pending.results || []) results.push(await dispatchVaviDraft(env, row.order_id, sendDraft));
  return {
    processed: results.length,
    submitted: results.filter((x) => x.sent).length,
    requiresReview: results.filter((x) => x.reason === "needs_review").length
  };
}

// src/live-payment-webhook.js
var MP_API3 = "https://api.mercadopago.com";
var PAYMENT_ID = /^\d{1,30}$/;
var ORDER_ID3 = /^ord_[a-f0-9]{32}$/;
async function processLivePaymentWebhook({ request, env, fetchImpl = fetch }) {
  if (env.LIVE_WEBHOOK_ENABLED !== "true" || !env.DB || !env.MERCADOPAGO_LIVE_ACCESS_TOKEN || !env.MERCADOPAGO_LIVE_WEBHOOK_SECRET)
    throw new CatalogError("live_webhook_disabled", "Notifica\xE7\xE3o de produ\xE7\xE3o indispon\xEDvel.", 503);
  const url = new URL(request.url);
  const id = url.searchParams.get("data.id") || url.searchParams.get("id");
  if (url.searchParams.get("type") !== "payment" || !PAYMENT_ID.test(id || ""))
    throw new CatalogError("invalid_notification", "Evento de pagamento inv\xE1lido.", 400);
  await verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId: id,
    secret: env.MERCADOPAGO_LIVE_WEBHOOK_SECRET
  });
  let response;
  try {
    response = await fetchImpl(MP_API3 + "/v1/payments/" + id, {
      headers: {
        Authorization: "Bearer " + env.MERCADOPAGO_LIVE_ACCESS_TOKEN,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(8e3)
    });
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Verifica\xE7\xE3o de produ\xE7\xE3o indispon\xEDvel.", 503);
  }
  if (!response?.ok)
    throw new CatalogError("payment_provider_unavailable", "Pagamento n\xE3o consultado.", 503);
  let payment;
  try {
    payment = await response.json();
  } catch {
    throw new CatalogError("payment_provider_unavailable", "Resposta do pagamento inv\xE1lida.", 503);
  }
  if (String(payment?.id) !== id || payment?.live_mode !== true || !ORDER_ID3.test(payment.external_reference || ""))
    throw new CatalogError("payment_mismatch", "Pagamento n\xE3o pertence \xE0 loja de produ\xE7\xE3o.", 409);
  const order = await env.DB.prepare(`SELECT id,status,currency,total_cents,
    mp_payment_id,mp_preference_id,payment_environment
    FROM store_orders WHERE id=? LIMIT 1`).bind(payment.external_reference).first();
  if (!order || order.payment_environment !== "live" || !order.mp_preference_id || order.currency !== "BRL" || !["awaiting_payment", "paid"].includes(order.status))
    throw new CatalogError("payment_order_conflict", "Pedido de produ\xE7\xE3o n\xE3o encontrado.", 409);
  if (payment.status !== "approved") return { processed: false, status: "not_approved" };
  const verified = validateConfirmedPayment(order, payment);
  const result = await recordVerifiedPayment(env.DB, verified, "mp:live:payment:" + id);
  const queue = await enqueuePaidVaviDraft(env, result.orderId);
  return { ...result, vaviQueued: queue.queued };
}

// src/live-order-admin.js
async function authorizedLiveAdmin(request, env) {
  const expected = env.SHOP_ADMIN_API_KEY;
  const input = request.headers.get("Authorization") || "";
  if (typeof expected !== "string" || expected.length < 32 || !input.startsWith("Bearer ") || input.length > 512) return false;
  const compare = async (s) => new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s)
  ));
  const a = await compare(expected), b = await compare(input.slice(7));
  let delta = 0;
  for (let i = 0; i < a.length; i++) delta |= a[i] ^ b[i];
  return delta === 0;
}
async function listLivePaidOrders(env) {
  if (!env.DB) throw new CatalogError("database_not_configured", "Banco indispon\xEDvel.", 503);
  const res = await env.DB.prepare(`SELECT o.id,o.status,o.subtotal_cents,o.shipping_cents,
    o.total_cents,o.shipping_option_id,o.destination_zip,o.vavi_order_id,
    o.created_at,o.updated_at,
    q.state AS vavi_draft_state,q.vavi_draft_id
    FROM store_orders o
    LEFT JOIN store_vavi_draft_dispatch q ON q.order_id=o.id
    WHERE o.payment_environment='live' AND
    o.status IN ('paid','manual_review','vavi_draft','in_production','shipped')
    ORDER BY o.created_at DESC LIMIT 50`).all();
  return { orders: res.results || [] };
}
async function getLivePaidDelivery(env, id) {
  if (!/^ord_[a-f0-9]{32}$/.test(id || ""))
    throw new CatalogError("invalid_order_id", "Pedido inv\xE1lido.", 400);
  const order = await env.DB.prepare(`SELECT o.id,o.status,o.shipping_option_id,o.total_cents,o.vavi_order_id,
    o.destination_zip,q.state AS vavi_draft_state,q.vavi_draft_id
    FROM store_orders o LEFT JOIN store_vavi_draft_dispatch q ON q.order_id=o.id
    WHERE o.id=? AND o.payment_environment='live'
    AND o.status IN ('paid','manual_review','vavi_draft','in_production','shipped')`).bind(id).first();
  if (!order) throw new CatalogError("order_not_found", "Pedido pago n\xE3o encontrado.", 404);
  const encrypted = await env.DB.prepare(`SELECT encrypted_payload,iv
    FROM store_order_delivery WHERE order_id=? LIMIT 1`).bind(id).first();
  if (!encrypted)
    throw new CatalogError("delivery_not_found", "Dados de entrega n\xE3o dispon\xEDveis.", 503);
  const buyer = await decryptDelivery(id, encrypted, env.DELIVERY_ENCRYPTION_KEY_B64);
  return { order, buyer };
}
async function registerManualVaviOrder(env, id, vaviOrderId) {
  if (!env.DB?.prepare)
    throw new CatalogError("database_not_configured", "Banco indispon\xEDvel.", 503);
  if (!/^ord_[a-f0-9]{32}$/.test(id || ""))
    throw new CatalogError("invalid_order_id", "Pedido inv\xE1lido.", 400);
  if (typeof vaviOrderId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(vaviOrderId))
    throw new CatalogError("invalid_vavi_order_id", "Identificador VAVI inv\xE1lido.", 422);
  let res;
  try {
    res = await env.DB.prepare(`UPDATE store_orders
      SET vavi_order_id=?,status='vavi_draft',
          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=? AND payment_environment='live'
        AND status='paid' AND vavi_order_id IS NULL`).bind(vaviOrderId, id).run();
  } catch {
    throw new CatalogError(
      "fulfillment_conflict",
      "Identificador VAVI j\xE1 registrado ou banco indispon\xEDvel.",
      409
    );
  }
  if (res.meta?.changes === 1)
    return { orderId: id, vaviOrderId, status: "vavi_draft", alreadyRegistered: false };
  const order = await env.DB.prepare(`SELECT status,vavi_order_id
    FROM store_orders WHERE id=? AND payment_environment='live'`).bind(id).first();
  if (order && order.vavi_order_id === vaviOrderId && ["vavi_draft", "in_production", "shipped", "delivered"].includes(order.status))
    return { orderId: id, vaviOrderId, status: order.status, alreadyRegistered: true };
  throw new CatalogError(
    "fulfillment_not_allowed",
    "Pedido n\xE3o est\xE1 pago ou foi encaminhado com outro identificador.",
    409
  );
}

// src/vavi-webhook.js
var UUID2 = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
var TYPES = /* @__PURE__ */ new Set([
  "integration_order.converted",
  "integration_order.failed",
  "order.status_changed",
  "order.tracking"
]);
function vaviWebhookReady(env) {
  return Boolean(env?.VAVI_WEBHOOK_ENABLED === "true" && typeof env?.VAVI_WEBHOOK_SECRET === "string" && env.VAVI_WEBHOOK_SECRET.startsWith("whsec_") && env.DB?.batch && env.DB?.prepare);
}
async function verifyVaviWebhook({ request, raw, secret, now = Date.now() }) {
  const signature = request.headers.get("X-Webhook-Signature") || "";
  const match = /^t=(\d{9,12}),v1=([a-f0-9]{64})$/.exec(signature);
  if (!match || !/^whsec_[A-Za-z0-9_-]{8,}$/.test(secret || ""))
    throw new CatalogError("vavi_webhook_unauthorized", "Assinatura inv\xE1lida.", 401);
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp * 1e3) > 5 * 60 * 1e3)
    throw new CatalogError("vavi_webhook_expired", "Notifica\xE7\xE3o expirada.", 401);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(match[1] + "." + raw)
  ));
  const expected = Uint8Array.from(match[2].match(/../g), (x) => parseInt(x, 16));
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= digest[i] ^ expected[i];
  if (diff !== 0)
    throw new CatalogError("vavi_webhook_unauthorized", "Assinatura inv\xE1lida.", 401);
}
function sanitizedText(v, max = 150) {
  return typeof v === "string" && v.length <= max ? v : null;
}
async function processVaviWebhook({ request, env, now = Date.now() }) {
  if (!vaviWebhookReady(env))
    throw new CatalogError("vavi_webhook_disabled", "Webhook indispon\xEDvel.", 503);
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
    throw new CatalogError("invalid_vavi_webhook", "Tipo de conte\xFAdo inv\xE1lido.", 415);
  const raw = await request.text();
  if (raw.length > 65536)
    throw new CatalogError("vavi_webhook_too_large", "Notifica\xE7\xE3o excede limite.", 413);
  await verifyVaviWebhook({ request, raw, secret: env.VAVI_WEBHOOK_SECRET, now });
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    throw new CatalogError("invalid_vavi_webhook", "JSON inv\xE1lido.", 400);
  }
  if (message?.test === true) return { ok: true, ignored: "ping" };
  const id = message?.webhookSentId;
  if (!UUID2.test(id || "") || request.headers.get("X-Webhook-Id") !== id || request.headers.get("X-Webhook-Event") !== message.eventType || message.payloadVersion !== 1 || !TYPES.has(message.eventType) || !Number.isFinite(Date.parse(message.occurredAt || "")) || !message.data || typeof message.data !== "object")
    throw new CatalogError("invalid_vavi_webhook", "Evento incompat\xEDvel.", 400);
  const type = message.eventType;
  const data = message.data;
  const vaviOrderId = data.orderId;
  const draftId = data.draftId;
  if (type.startsWith("integration_order.")) {
    if (!UUID2.test(draftId || "") || type === "integration_order.converted" && !UUID2.test(vaviOrderId || ""))
      throw new CatalogError("invalid_vavi_webhook", "Rascunho inv\xE1lido.", 400);
  } else if (!UUID2.test(vaviOrderId || "")) {
    throw new CatalogError("invalid_vavi_webhook", "Pedido inv\xE1lido.", 400);
  }
  const event = env.DB.prepare(`INSERT OR IGNORE INTO store_vavi_webhook_events
    (webhook_sent_id,event_type,vavi_order_id,draft_id)
    VALUES (?,?,?,?)`).bind(
    id,
    type,
    UUID2.test(vaviOrderId || "") ? vaviOrderId : null,
    UUID2.test(draftId || "") ? draftId : null
  );
  const statements = [event];
  if (type === "integration_order.converted") {
    statements.push(env.DB.prepare(`UPDATE store_orders
      SET vavi_order_id=?,status='vavi_draft',
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id IN (SELECT order_id FROM store_vavi_draft_dispatch
        WHERE vavi_draft_id=? AND state='submitted')
      AND payment_environment='live' AND status='paid'
      AND vavi_order_id IS NULL`).bind(vaviOrderId, draftId));
  } else if (type === "integration_order.failed") {
    statements.push(env.DB.prepare(`UPDATE store_vavi_draft_dispatch
      SET state='needs_review',last_error='vavi_reported_failed'
      WHERE vavi_draft_id=? AND state='submitted'`).bind(draftId));
  } else {
    const details = type === "order.tracking" ? data.tracking || {} : {};
    const status = sanitizedText(type === "order.tracking" ? details.orderStatus || data.status : data.newStatus, 50);
    const nsu = sanitizedText(data.orderNSU || details.orderNSU, 40);
    const code = sanitizedText(details.trackingCode, 120);
    const url = sanitizedText(details.trackingUrl, 400);
    const safeUrl = url && /^https:\/\//i.test(url) ? url : null;
    const carrier = sanitizedText(details.carrierName, 120);
    const shipment = sanitizedText(details.shipmentStatus, 60);
    const occurred = message.occurredAt;
    statements.push(env.DB.prepare(`INSERT INTO store_vavi_order_tracking
      (vavi_order_id,order_status,order_nsu,tracking_code,tracking_url,
       carrier_name,shipment_status,last_event_at)
      SELECT ?,?,?,?,?,?,?,? WHERE EXISTS
        (SELECT 1 FROM store_orders
          WHERE vavi_order_id=? AND payment_environment='live')
      ON CONFLICT(vavi_order_id) DO UPDATE SET
        order_status=excluded.order_status,
        order_nsu=COALESCE(excluded.order_nsu,order_nsu),
        tracking_code=COALESCE(excluded.tracking_code,tracking_code),
        tracking_url=COALESCE(excluded.tracking_url,tracking_url),
        carrier_name=COALESCE(excluded.carrier_name,carrier_name),
        shipment_status=COALESCE(excluded.shipment_status,shipment_status),
        last_event_at=excluded.last_event_at
      WHERE excluded.last_event_at>=store_vavi_order_tracking.last_event_at`).bind(vaviOrderId, status, nsu, code, safeUrl, carrier, shipment, occurred, vaviOrderId));
  }
  await env.DB.batch(statements);
  return { ok: true, received: true };
}

// src/launch-readiness.js
var TRACKING_TABLES = ["store_vavi_webhook_events", "store_vavi_order_tracking"];
async function getPrivateLaunchReadiness(env, loadProduct, loadTables) {
  if (!env.DB?.prepare)
    throw new CatalogError("database_not_configured", "Banco indispon\xEDvel.", 503);
  const query = loadProduct || ((sku) => env.DB.prepare(`SELECT
    p.enabled,p.verified,v.available,v.price_cents
    FROM products p JOIN variants v ON v.product_id=p.id
    WHERE v.sku=? LIMIT 1`).bind(sku).first());
  const variants = await Promise.all(SALVE_REGINA_SKUS.map(async (sku) => {
    const row = await query(sku);
    const priceMatches = Boolean(row && approvedVariant(sku, row.price_cents));
    let shippingReady = false;
    if (env.VAVI_CLIENT_ID && env.VAVI_CLIENT_SECRET) {
      try {
        shippingPayload("01001000", [{ sku, quantity: 1 }], env.VAVI_SHIPPING_PRODUCTS_JSON);
        shippingReady = true;
      } catch {
      }
    }
    return {
      sku,
      size: SALVE_REGINA_VARIANTS[sku].size,
      expectedPriceCents: SALVE_REGINA_VARIANTS[sku].priceCents,
      catalogPresent: Boolean(row),
      priceMatches,
      productReady: priceMatches && row.enabled === 1 && row.verified === 1 && row.available === 1,
      shippingConfigured: shippingReady
    };
  }));
  const productMatches = variants.every((v) => v.priceMatches);
  const productReady = variants.every((v) => v.productReady);
  const shippingConfigured = variants.every((v) => v.shippingConfigured);
  let trackingTablesPresent = false;
  try {
    const tables = loadTables ? await loadTables() : (await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all()).results;
    trackingTablesPresent = TRACKING_TABLES.every((name) => tables.some((t) => t.name === name));
  } catch {
  }
  const paymentsConfigured = Boolean(env.MERCADOPAGO_LIVE_ACCESS_TOKEN && env.MERCADOPAGO_LIVE_WEBHOOK_SECRET);
  const deliveryConfigured = Boolean(env.DELIVERY_ENCRYPTION_KEY_B64 && env.DELIVERY_PERSISTENCE_ENABLED === "true" && typeof env.SHOP_ADMIN_API_KEY === "string" && env.SHOP_ADMIN_API_KEY.length >= 32);
  const checks = [
    {
      id: "catalog",
      label: "Cinco tamanhos \u2014 P a GG R$ 109,90; XG R$ 119,90",
      ok: productMatches,
      detail: productMatches ? "Cinco SKUs e pre\xE7os conferidos no banco" : "Conferir os cinco SKUs e respectivos pre\xE7os no banco"
    },
    {
      id: "product",
      label: "Todos os tamanhos aprovados e dispon\xEDveis",
      ok: productReady,
      detail: productReady ? "Cinco tamanhos habilitados no cat\xE1logo" : "Conferir arte, fornecedor, custo e estoque antes de habilitar"
    },
    {
      id: "shipping",
      label: "Configura\xE7\xE3o de frete dos cinco tamanhos",
      ok: shippingConfigured,
      detail: shippingConfigured ? "Formato validado; cota\xE7\xE3o real de cada tamanho ainda precisa ser testada" : "Conferir credenciais e pacote real de cada tamanho"
    },
    {
      id: "mercadopago",
      label: "Credenciais do Mercado Pago configuradas",
      ok: paymentsConfigured,
      detail: paymentsConfigured ? "Configuradas; pagamento de ponta a ponta n\xE3o validado" : "Configurar token e assinatura do webhook"
    },
    {
      id: "delivery",
      label: "Armazenamento cifrado e painel administrativo",
      ok: deliveryConfigured,
      detail: deliveryConfigured ? "Controles de acesso configurados" : "Configurar chave de cifra e acesso administrativo"
    },
    {
      id: "fiscal",
      label: "Identifica\xE7\xE3o comercial revisada e aprovada",
      ok: env.LIVE_POLICY_APPROVED === "true",
      detail: env.LIVE_POLICY_APPROVED === "true" ? "Aprova\xE7\xE3o registrada" : "Publicar nome empresarial e CNPJ do CCMEI e conferir as condi\xE7\xF5es"
    },
    {
      id: "productApproval",
      label: "Libera\xE7\xE3o comercial do produto",
      ok: env.LIVE_PRODUCT_APPROVED === "true",
      detail: env.LIVE_PRODUCT_APPROVED === "true" ? "Libera\xE7\xE3o registrada" : "Confirmar produto efetivamente vend\xE1vel na VAVI"
    },
    {
      id: "webhook",
      label: "Confirma\xE7\xE3o de pagamentos reais habilitada",
      ok: env.LIVE_WEBHOOK_ENABLED === "true",
      detail: env.LIVE_WEBHOOK_ENABLED === "true" ? "Processamento habilitado; conferir testes" : "Testar assinatura, pagamento e registro no banco antes de habilitar"
    },
    {
      id: "vaviAutoDraft",
      label: "Envio autom\xE1tico do rascunho pago \xE0 VAVI",
      ok: vaviAutoDraftReady(env),
      detail: vaviAutoDraftReady(env) ? "Automa\xE7\xE3o de rascunhos habilitada; vincula\xE7\xE3o, frete e pagamento da produ\xE7\xE3o exigem confer\xEAncia no portal" : "Validar envio de pedidos pagos e os controles necess\xE1rios antes de ativar"
    },
    {
      id: "vaviTrackingSchema",
      label: "Tabelas de eventos e rastreamento VAVI",
      ok: trackingTablesPresent,
      detail: trackingTablesPresent ? "Tabelas encontradas; recep\xE7\xE3o de eventos ainda precisa ser homologada" : "Conferir e aplicar a migra\xE7\xE3o 0010_vavi_webhook_events.sql antes de ativar o acompanhamento"
    },
    {
      id: "vaviWebhook",
      label: "Recep\xE7\xE3o autenticada de eventos VAVI",
      ok: trackingTablesPresent && vaviWebhookReady(env),
      detail: trackingTablesPresent && vaviWebhookReady(env) ? "Configura\xE7\xE3o habilitada; validar ping, assinatura e eventos reais" : "Conferir tabelas, segredo de assinatura e libera\xE7\xE3o do webhook VAVI"
    },
    {
      id: "checkout",
      label: "Checkout de produ\xE7\xE3o habilitado",
      ok: env.LIVE_CHECKOUT_ENABLED === "true",
      detail: env.LIVE_CHECKOUT_ENABLED === "true" ? "Chave de libera\xE7\xE3o ligada" : "Habilitar somente depois dos demais testes"
    }
  ].concat(variants.map((v) => ({
    id: "variant-" + v.size.toLowerCase(),
    label: "Camiseta preta \u2014 tamanho " + v.size,
    ok: v.productReady && v.shippingConfigured,
    detail: [
      v.priceMatches ? "SKU e pre\xE7o corretos" : "SKU ausente ou pre\xE7o divergente",
      v.productReady ? "produto aprovado" : "produto ainda bloqueado",
      v.shippingConfigured ? "configura\xE7\xE3o de frete presente" : "configura\xE7\xE3o de frete pendente"
    ].join("; ")
  })));
  const ready = Boolean(liveCheckoutReady(env) && productReady);
  return {
    mode: "operator-read-only",
    checkoutEnabled: ready,
    checks,
    variants,
    fulfillment: {
      draftAutomationConfigured: vaviAutoDraftReady(env),
      productionRequiresOperator: true,
      customerNotifications: "manual"
    },
    outstanding: checks.filter((c) => !c.ok).map((c) => c.id),
    operationalValidations: [
      "Confirmar no CCMEI o nome empresarial e CNPJ publicados no site",
      "Conferir que a arte, SKU, tamanho, custo, embalagem e disponibilidade correspondem a um produto produz\xEDvel pela VAVI",
      "Testar cota\xE7\xE3o real da VAVI para cada um dos cinco tamanhos e um CEP de entrega v\xE1lido",
      "Simular o fluxo de pagamento e a concilia\xE7\xE3o por webhook sem cobran\xE7a acidental",
      "Confirmar quem conferir\xE1 rascunho, arte, variante, frete e pagamento da produ\xE7\xE3o no portal VAVI e comunicar\xE1 o rastreamento ao cliente"
    ],
    doesNotCharge: true,
    doesNotEnableCheckout: true
  };
}

// src/index.js
async function authorizedTestCheckout(request, env) {
  const secret = env.CHECKOUT_TEST_API_KEY;
  const header = request.headers.get("Authorization") || "";
  if (typeof secret !== "string" || secret.length < 32 || !header.startsWith("Bearer ") || header.length > 512) return false;
  const given = header.slice(7);
  const h = async (value) => new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  ));
  const a = await h(secret), b = await h(given);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra
    }
  });
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return { allowed: true, headers: {} };
  const origins = (env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!origins.includes(origin)) return { allowed: false, headers: { "Vary": "Origin" } };
  return { allowed: true, headers: {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  } };
}
async function getCatalog(db) {
  const result = await db.prepare(
    `SELECT p.id,p.name,p.description,p.image,v.sku,v.label,v.price_cents
     FROM products p JOIN variants v ON v.product_id = p.id
     WHERE p.enabled = 1 AND p.verified = 1 AND v.available = 1
     ORDER BY p.sort_order,p.name,v.label`
  ).all();
  return groupCatalog(result.results || []);
}
async function loadVariant(db, sku) {
  return db.prepare(
    `SELECT v.sku,v.label,v.price_cents,v.available,p.name,
      p.enabled AS product_enabled,p.verified AS product_verified
     FROM variants v JOIN products p ON p.id = v.product_id WHERE v.sku = ? LIMIT 1`
  ).bind(sku).first();
}
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (!cors.allowed) return json({ error: "origin_not_allowed" }, 403, cors.headers);
    if (request.method === "OPTIONS") {
      const adminOptions = url.pathname === "/api/internal/launch/shipping-check" || url.pathname === "/api/internal/launch-readiness" || url.pathname === "/api/internal/live-orders" || url.pathname.startsWith("/api/internal/live-orders/") && /^ord_[a-f0-9]{32}$/.test(url.pathname.slice("/api/internal/live-orders/".length)) || /^\/api\/internal\/live-orders\/ord_[a-f0-9]{32}\/fulfillment$/.test(url.pathname);
      if (!adminOptions && !["/api/catalog", "/api/quote", "/api/shipping/quote", "/api/shipping/preview", "/api/checkout/test", "/api/checkout/live", "/api/internal/vavi/shipping-check"].includes(url.pathname))
        return json({ error: "not_found" }, 404, cors.headers);
      return new Response(null, { status: 204, headers: cors.headers });
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, mode: "preview", payments: false, vaviOrders: false }, 200, cors.headers);
    }
    if (url.pathname === "/api/checkout/live/readiness" && request.method === "GET") {
      if (!liveCheckoutReady(env)) return json({ checkoutEnabled: false }, 200, cors.headers);
      try {
        const checked = await Promise.all(SALVE_REGINA_SKUS.map(async (sku) => {
          const p = await loadVariant(env.DB, sku);
          return p && p.product_enabled === 1 && p.product_verified === 1 && p.available === 1 && approvedVariant(sku, p.price_cents);
        }));
        return json({ checkoutEnabled: checked.every(Boolean) }, 200, cors.headers);
      } catch {
        return json({ checkoutEnabled: false }, 200, cors.headers);
      }
    }
    if (url.pathname === "/api/internal/launch-readiness" && request.method === "GET") {
      if (!await authorizedLiveAdmin(request, env))
        return json({ error: "unauthorized" }, 401, cors.headers);
      try {
        const report = await getPrivateLaunchReadiness(env);
        return json(report, 200, cors.headers);
      } catch (error) {
        if (error instanceof CatalogError)
          return json({ error: error.code }, error.status, cors.headers);
        return json({ error: "launch_readiness_unavailable" }, 503, cors.headers);
      }
    }
    if (url.pathname === "/api/internal/launch/shipping-check" && request.method === "POST") {
      if (!await authorizedLiveAdmin(request, env))
        return json({ error: "unauthorized" }, 401, cors.headers);
      if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
        return json({ error: "unsupported_media_type" }, 415, cors.headers);
      const textBody = await request.text();
      if (textBody.length > 200)
        return json({ error: "request_too_large" }, 413, cors.headers);
      try {
        const body = JSON.parse(textBody);
        const zipCode = normalizeZip(body?.zipCode);
        const options = await simulateVaviShipping(
          env,
          zipCode,
          [{ sku: "salve-regina-preta-g", quantity: 1 }]
        );
        return json({
          mode: "diagnostic",
          zipCode,
          currency: "BRL",
          options: options.filter((x) => !/retirada|retire|pickup/i.test(x.name)),
          checkoutEnabled: false,
          createsPayment: false,
          createsVaviOrder: false
        }, 200, cors.headers);
      } catch (error) {
        if (error instanceof CatalogError)
          return json({ error: error.code }, error.status, cors.headers);
        if (error instanceof SyntaxError)
          return json({ error: "invalid_json" }, 400, cors.headers);
        return json({ error: "vavi_shipping_unavailable" }, 503, cors.headers);
      }
    }
    if ((url.pathname === "/api/internal/live-orders" || url.pathname.startsWith("/api/internal/live-orders/") && /^ord_[a-f0-9]{32}$/.test(url.pathname.slice("/api/internal/live-orders/".length))) && request.method === "GET") {
      if (!await authorizedLiveAdmin(request, env))
        return json({ error: "unauthorized" }, 401);
      try {
        const result = url.pathname === "/api/internal/live-orders" ? await listLivePaidOrders(env) : await getLivePaidDelivery(env, url.pathname.slice("/api/internal/live-orders/".length));
        return json(result, 200, cors.headers);
      } catch (error) {
        if (error instanceof CatalogError) return json({ error: error.code }, error.status);
        return json({ error: "admin_orders_unavailable" }, 503);
      }
    }
    const fulfillmentMatch = url.pathname.match(
      /^\/api\/internal\/live-orders\/(ord_[a-f0-9]{32})\/fulfillment$/
    );
    if (fulfillmentMatch && request.method === "POST") {
      if (!await authorizedLiveAdmin(request, env))
        return json({ error: "unauthorized" }, 401, cors.headers);
      if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
        return json({ error: "unsupported_media_type" }, 415, cors.headers);
      const raw = await request.text();
      if (raw.length > 350) return json({ error: "request_too_large" }, 413, cors.headers);
      try {
        const data = JSON.parse(raw);
        const result = await registerManualVaviOrder(env, fulfillmentMatch[1], data?.vaviOrderId);
        return json(result, 200, cors.headers);
      } catch (error) {
        if (error instanceof CatalogError) return json({ error: error.code }, error.status, cors.headers);
        if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400, cors.headers);
        return json({ error: "fulfillment_unavailable" }, 503, cors.headers);
      }
    }
    if (url.pathname === "/api/store/readiness" && request.method === "GET") {
      if (!env.DB) return json({
        mode: "preview",
        ready: false,
        checks: { database: false, product: false, freight: false, payments: false, webhook: false }
      }, 503, cors.headers);
      const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM products p
        JOIN variants v ON v.product_id=p.id
        WHERE p.enabled=1 AND p.verified=1 AND v.available=1
        AND v.price_cents>0`).first();
      const checks = {
        database: true,
        product: Number(count?.n || 0) > 0,
        freight: Boolean(env.VAVI_SHIPPING_PRODUCTS_JSON && env.VAVI_CLIENT_ID && env.VAVI_CLIENT_SECRET),
        payments: false,
        // not enabled until complete end-to-end tests
        webhook: false
        // the route is still guarded, not consuming notifications
      };
      return json({ mode: "preview", ready: false, checks }, 200, cors.headers);
    }
    if (url.pathname === "/api/payments/live-webhook" && request.method === "POST") {
      try {
        const outcome = await processLivePaymentWebhook({ request, env });
        if (outcome.vaviQueued === true && typeof ctx?.waitUntil === "function")
          ctx.waitUntil(dispatchVaviDraft(env, outcome.orderId));
        return json({ ok: true, processed: outcome.processed !== false }, 200);
      } catch (error) {
        if (error instanceof CatalogError)
          return json({ error: error.code }, error.status);
        console.error("Live webhook unavailable:", error?.name || "unknown");
        return json({ error: "webhook_processing_failed" }, 503);
      }
    }
    if (url.pathname === "/api/webhooks/vavi" && request.method === "POST") {
      try {
        const outcome = await processVaviWebhook({ request, env });
        return json(outcome, 200);
      } catch (error) {
        if (error instanceof CatalogError)
          return json({ error: error.code }, error.status);
        return json({ error: "vavi_webhook_unavailable" }, 503);
      }
    }
    if (url.pathname === "/api/payments/webhook" && request.method === "POST") {
      try {
        const result = new URL(request.url).searchParams.get("type") === "order" ? await processOrdersWebhook({ request, env }) : await processPaymentWebhook({ request, env });
        return json({ ok: true, processed: result.processed !== false }, 200);
      } catch (error) {
        if (error instanceof CatalogError)
          return json({ error: error.code }, error.status);
        console.error("Falha ao processar notifica\xE7\xE3o:", error?.name || "unknown");
        return json({ error: "webhook_processing_failed" }, 503);
      }
    }
    if (url.pathname === "/api/internal/vavi/shipping-check" && request.method === "POST") {
      if (!env.CHECKOUT_TEST_API_KEY || !await authorizedTestCheckout(request, env))
        return json({ error: "unauthorized" }, 401);
      if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
        return json({ error: "unsupported_media_type" }, 415);
      const payload = await request.text();
      if (payload.length > 1e3) return json({ error: "request_too_large" }, 413);
      try {
        const body = JSON.parse(payload);
        const zipCode = normalizeZip(body?.zipCode);
        const lines = [{ sku: "salve-regina-preta-g", quantity: 1 }];
        const options = await simulateVaviShipping(env, zipCode, lines);
        return json({
          mode: "diagnostic",
          sku: "salve-regina-preta-g",
          zipCode,
          options,
          createsOrder: false,
          createsPayment: false
        }, 200);
      } catch (e) {
        if (e instanceof CatalogError) return json({ error: e.code }, e.status);
        if (e instanceof SyntaxError) return json({ error: "invalid_json" }, 400);
        console.error("VAVI diagnostic error:", e?.name || "unknown");
        return json({ error: "shipping_diagnostic_failed" }, 503);
      }
    }
    if (url.pathname === "/api/shipping/preview" && request.method === "POST") {
      const origin = request.headers.get("Origin");
      const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim());
      if (!origin || !allowed.includes(origin))
        return json({ error: "origin_not_allowed" }, 403);
      if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
        return json({ error: "unsupported_media_type" }, 415, cors.headers);
      const textBody = await request.text();
      if (textBody.length > 200) return json({ error: "request_too_large" }, 413, cors.headers);
      try {
        const body = JSON.parse(textBody);
        const zipCode = normalizeZip(body?.zipCode);
        const sku = body?.sku || "salve-regina-preta-g";
        if (!Object.hasOwn(SALVE_REGINA_VARIANTS, sku))
          throw new CatalogError("invalid_sku", "Tamanho da camiseta inv\xE1lido.", 422);
        const diagnostic = body?.diagnose === true ? {} : null;
        const options = await simulateVaviShipping(
          env,
          zipCode,
          [{ sku, quantity: 1 }],
          diagnostic
        );
        const delivery = options.filter((x) => !/retirada|retire|pickup/i.test(x.name));
        return json({
          mode: "preview",
          sku,
          zipCode,
          currency: "BRL",
          options: delivery,
          checkoutEnabled: false,
          ...diagnostic ? { diagnostic } : {}
        }, 200, cors.headers);
      } catch (error) {
        if (error instanceof CatalogError)
          return json({ error: error.code }, error.status, cors.headers);
        if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400, cors.headers);
        return json({ error: "shipping_provider_unavailable" }, 503, cors.headers);
      }
    }
    if (!env.DB) return json({ error: "database_not_configured" }, 503, cors.headers);
    try {
      if (url.pathname === "/api/checkout/live" && request.method === "POST") {
        if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
          return json({ error: "unsupported_media_type" }, 415, cors.headers);
        if (!liveCheckoutReady(env))
          return json({ error: "live_checkout_disabled" }, 503, cors.headers);
        const bodyText = await request.text();
        if (bodyText.length > 12e3)
          return json({ error: "request_too_large" }, 413, cors.headers);
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return json({ error: "invalid_json" }, 400, cors.headers);
        }
        const payment = await createCheckoutLive(env, body);
        return json(payment, 201, cors.headers);
      }
      if (url.pathname === "/api/checkout/test" && request.method === "POST") {
        if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
          return json({ error: "unsupported_media_type" }, 415, cors.headers);
        if (env.CHECKOUT_TEST_ENABLED !== "true" || env.WEBHOOK_PROCESSING_ENABLED !== "true" || env.DELIVERY_PERSISTENCE_ENABLED !== "true" || !env.MERCADOPAGO_WEBHOOK_SECRET || !env.CHECKOUT_TEST_API_KEY) {
          return json({ error: "checkout_not_ready" }, 503, cors.headers);
        }
        if (!await authorizedTestCheckout(request, env)) {
          return json({ error: "checkout_unauthorized" }, 401);
        }
        const bodyText = await request.text();
        if (bodyText.length > 12e3) return json({ error: "request_too_large" }, 413);
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        const result = await createCheckoutTest(env, body);
        return json(result, 201);
      }
      if (url.pathname === "/api/catalog" && request.method === "GET") {
        return json({ mode: "preview", currency: "BRL", products: await getCatalog(env.DB) }, 200, cors.headers);
      }
      if (["/api/quote", "/api/shipping/quote"].includes(url.pathname) && request.method === "POST") {
        if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
          return json({ error: "unsupported_media_type" }, 415, cors.headers);
        }
        const bodyText = await request.text();
        if (bodyText.length > 12e3) return json({ error: "request_too_large" }, 413, cors.headers);
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return json({ error: "invalid_json" }, 400, cors.headers);
        }
        const cart = normalizeCart(body);
        const preview = await quoteCart(cart, (sku) => loadVariant(env.DB, sku));
        if (url.pathname === "/api/quote") return json(preview, 200, cors.headers);
        const zipCode = normalizeZip(body.zipCode);
        const shipping = await simulateVaviShipping(env, zipCode, preview.lines);
        return json({
          mode: "preview",
          currency: "BRL",
          zipCode,
          options: shipping,
          checkoutEnabled: false
        }, 200, cors.headers);
      }
      return json({ error: "not_found" }, 404, cors.headers);
    } catch (error) {
      if (error instanceof CatalogError) return json({ error: error.code, message: error.message }, error.status, cors.headers);
      console.error("Falha ao consultar cat\xE1logo ou calcular pr\xE9via:", error?.name || "unknown");
      return json({ error: "internal_error" }, 500, cors.headers);
    }
  },
  // Executa uma pequena fila com recuperação para pagamentos já confirmados.
  // Não cria rascunhos nem ordens enquanto o operador não ativar o recurso.
  async scheduled(_event, env, ctx) {
    if (typeof ctx?.waitUntil === "function")
      ctx.waitUntil(processPendingPaidVaviDrafts(env));
    else
      await processPendingPaidVaviDrafts(env);
  }
};
export {
  index_default as default
};
