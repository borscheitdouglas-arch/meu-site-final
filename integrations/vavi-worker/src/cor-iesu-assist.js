import {CatalogError} from './catalog.js';

// Edição comercial comprovada nas fotos: Marrom, P/M/G/GG.
// Estes SKUs pertencem à loja, NÃO são identificadores de fabricação VAVI.
// A VAVI recebe rascunho pago e o operador vincula o design D000007.
export const COR_IESU_ASSISTED_VARIANTS=Object.freeze({
  'cor-iesu-marrom-p':10990,
  'cor-iesu-marrom-m':10990,
  'cor-iesu-marrom-g':10990,
  'cor-iesu-marrom-gg':10990
});
export const COR_IESU_ASSISTED_SKUS=Object.freeze(Object.keys(COR_IESU_ASSISTED_VARIANTS));
export function isCorIesuAssistedSku(sku){
  return typeof sku==='string' && Object.hasOwn(COR_IESU_ASSISTED_VARIANTS,sku);
}
export function approvedCorIesuAssistedVariant(sku,priceCents){
  return isCorIesuAssistedSku(sku) && COR_IESU_ASSISTED_VARIANTS[sku]===priceCents;
}

/** Custo confirmado pelo lojista; sempre obtido do D1 privado.
 * Não utilizar o preço "a partir de" nem SKUs repetidos de capturas.
 * Uma divergência de design/técnica/custo BLOQUEIA o pagamento.
 */
export async function loadCorIesuAssistedCost(db,sku){
  if(!isCorIesuAssistedSku(sku) || !db?.prepare)return null;
  const row=await db.prepare(
    'SELECT supplier_design_code,method,configured_areas,confirmed_unit_cost_cents '+
    'FROM supplier_design_observations WHERE product_id=? LIMIT 1'
  ).bind('camiseta-cor-iesu-sacratissimum').first();
  if(row?.supplier_design_code!=='D000007' || row?.method!=='DTF' ||
     row?.configured_areas!==2 || row?.confirmed_unit_cost_cents!==5691)return null;
  return row.confirmed_unit_cost_cents;
}

export function assertCorIesuSingleItem(items){
  if(items.some(x=>isCorIesuAssistedSku(x.sku)) &&
     (items.length!==1 || items[0].quantity!==1))
    throw new CatalogError('shipping_package_unverified',
      'A edição Cor Iesu está disponível somente em pedido unitário até validar embalagens combinadas.',409);
}
