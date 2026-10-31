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
