/** Validação de sacola e cálculo de preços no servidor, sem cobrança ou pedidos reais. */
export class CatalogError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function normalizeCart(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.items)) {
    throw new CatalogError('invalid_cart', 'Informe uma lista de itens.');
  }
  if (body.items.length < 1 || body.items.length > 15) {
    throw new CatalogError('invalid_cart', 'A sacola deve ter entre 1 e 15 linhas.');
  }
  const merged = new Map();
  for (const item of body.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new CatalogError('invalid_item', 'Item inválido.');
    }
    const {sku, quantity} = item;
    if (typeof sku !== 'string' || !/^[a-zA-Z0-9_.-]{1,90}$/.test(sku)) {
      throw new CatalogError('invalid_sku', 'Código de produto inválido.');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new CatalogError('invalid_quantity', 'Quantidade deve ser de 1 a 10.');
    }
    const next = (merged.get(sku) || 0) + quantity;
    if (next > 10) throw new CatalogError('quantity_limit', 'Máximo de 10 unidades por variação.');
    merged.set(sku, next);
  }
  const items = [...merged].map(([sku, quantity]) => ({sku, quantity}));
  if (items.reduce((sum, item) => sum + item.quantity, 0) > 30) {
    throw new CatalogError('cart_limit', 'Máximo de 30 unidades por sacola.');
  }
  return items;
}
export async function quoteCart(items, loadVariant) {
  const lines = [];
  let subtotalCents = 0;
  for (const item of items) {
    const variant = await loadVariant(item.sku);
    if (!variant || variant.product_enabled !== 1 || variant.product_verified !== 1 ||
        variant.available !== 1 || !Number.isSafeInteger(variant.price_cents) ||
        variant.price_cents <= 0) {
      throw new CatalogError('unavailable_product', 'Um produto está indisponível ou não foi conferido.', 409);
    }
    const totalCents = variant.price_cents * item.quantity;
    if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(subtotalCents + totalCents)) {
      throw new CatalogError('invalid_total', 'Não foi possível calcular o total.');
    }
    subtotalCents += totalCents;
    lines.push({
      sku: item.sku, name: variant.name, variation: variant.label,
      quantity: item.quantity, unitPriceCents: variant.price_cents, totalCents
    });
  }
  return {
    currency: 'BRL', lines, subtotalCents,
    freightCents: null, finalTotalCents: null,
    requiresShippingQuote: true, checkoutEnabled: false,
    message: 'Prévia: total dos produtos validado no servidor. Frete e pagamentos ainda não estão disponíveis.'
  };
}
export function groupCatalog(rows) {
  const products = new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || typeof row.sku !== 'string' ||
        !Number.isSafeInteger(row.price_cents) || row.price_cents <= 0) continue;
    if (!products.has(row.id)) {
      products.set(row.id, {
        id: row.id, name: row.name, description: row.description || '',
        image: row.image, enabled: true, verified: true, variants: []
      });
    }
    products.get(row.id).variants.push({
      sku: row.sku, label: row.label, price: row.price_cents / 100, available: true
    });
  }
  return [...products.values()];
}
