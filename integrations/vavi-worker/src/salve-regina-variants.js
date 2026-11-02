/** Lista fechada: somente camiseta preta, 1 unidade por pedido.
 * Design VAVI D000001; base 0001581, DTF, 2 areas.
 * A variante VAVI de GG foi observada como 0001590, XG como 0001591.
 * Os demais identificadores de fornecedor ainda exigem conferência.
 */
export const SALVE_REGINA_VARIANTS=Object.freeze({
  'salve-regina-preta-p': {size:'P',priceCents:10990},
  'salve-regina-preta-m': {size:'M',priceCents:10990},
  'salve-regina-preta-g': {size:'G',priceCents:10990},
  'salve-regina-preta-gg':{size:'GG',priceCents:10990},
  'salve-regina-preta-xg':{size:'XG',priceCents:11990}
});
export const SALVE_REGINA_SKUS=Object.keys(SALVE_REGINA_VARIANTS);
export function approvedVariant(sku,priceCents) {
  return Object.hasOwn(SALVE_REGINA_VARIANTS,sku) &&
    SALVE_REGINA_VARIANTS[sku].priceCents===priceCents;
}

/**
 * Peças adicionais com preço de vitrine já definido.
 * A presença nesta lista NÃO habilita venda: a variante ainda deve existir
 * no D1 com produto enabled/verified, variante available e frete VAVI válido.
 * SKU aqui é interno da loja, NUNCA o SKU do fornecedor.
 */
export const EXTRA_DIRECT_PRICES=Object.freeze({
  'caneca-salve-regina-preta':4990,
  'caneca-salve-regina-pb':4990,
  'ecobag-salve-regina-m':3990,
  'ecobag-salve-regina-g':3990
});
export const DIRECT_CHECKOUT_SKUS=Object.freeze([
  ...SALVE_REGINA_SKUS,...Object.keys(EXTRA_DIRECT_PRICES)
]);
export function approvedDirectVariant(sku,priceCents){
  return approvedVariant(sku,priceCents) ||
    (Object.hasOwn(EXTRA_DIRECT_PRICES,sku) &&
     EXTRA_DIRECT_PRICES[sku]===priceCents);
}
