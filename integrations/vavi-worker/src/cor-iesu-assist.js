import {CatalogError} from './catalog.js';

// Edição comercial comprovada nas fotos: Marrom, P/M/G/GG.
// Estes SKUs pertencem à loja, NÃO são identificadores de fabricação VAVI.
// A VAVI recebe rascunho pago e o operador vincula o design D000007.
// Cores vistas nas capturas VAVI. São NOMES DE TRABALHO até confirmação
// dos nomes oficiais e do custo por cor. Só Marrom está ativo no D1.
// Estas chaves são SKUs internos; jamais códigos de variação da VAVI.
export const COR_IESU_COLOR_OPTIONS=Object.freeze([
  {slug:'marrom',name:'Marrom'},
  {slug:'bege',name:'Bege'},
  {slug:'vinho',name:'Vinho'},
  {slug:'verde-escuro',name:'Verde escuro'},
  {slug:'cinza-claro',name:'Cinza claro'},
  {slug:'grafite',name:'Grafite'}
]);
export const COR_IESU_ASSISTED_VARIANTS=Object.freeze(Object.fromEntries(
  COR_IESU_COLOR_OPTIONS.flatMap(color=>['p','m','g','gg'].map(size=>
    ['cor-iesu-'+color.slug+'-'+size,10990]))
));
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
