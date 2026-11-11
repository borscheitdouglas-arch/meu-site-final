import {CatalogError} from './catalog.js';

// Edição comercial comprovada nas fotos: Marrom, P/M/G/GG.
// Estes SKUs pertencem à loja, NÃO são identificadores de fabricação VAVI.
// A VAVI recebe rascunho pago e o operador vincula o design D000007.
// 11 opções da galeria. Não presumir equivalência de mockup e cor oficial VAVI.
// Todas as demais cores dependem de validação individual e aprovação no D1.
// Estas chaves são SKUs internos; jamais códigos de variação da VAVI.
export const COR_IESU_COLOR_OPTIONS=Object.freeze([
  {slug:'marrom',name:'Marrom'},
  {slug:'branco',name:'Branco'},
  {slug:'preto',name:'Preto'},
  {slug:'off-white',name:'Off-white'},
  {slug:'azul-marinho',name:'Azul-marinho'},
  {slug:'azul-royal',name:'Azul-royal'},
  {slug:'verde',name:'Verde'},
  {slug:'cinza-claro',name:'Cinza-claro'},
  {slug:'cinza-escuro',name:'Cinza-escuro'},
  {slug:'areia',name:'Areia'},
  {slug:'bordo',name:'Bordô'}
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
  // A homologação unitária de Marrom é histórica e permanece válida.
  if(/^cor-iesu-marrom-(p|m|g|gg)$/.test(sku))return row.confirmed_unit_cost_cents;
  // Para outras cores, exigir evidência privada, frete conferido e código único
  // de fabricação. A mera presença da cor na galeria não habilita cobrança.
  const item=await db.prepare(
    'SELECT supplier_design_code,supplier_variant_sku,observed_total_cents,freight_config_verified '+
    'FROM supplier_variant_cost_observations WHERE internal_sku=? LIMIT 1'
  ).bind(sku).first();
  if(item?.supplier_design_code!=='D000007' || item?.freight_config_verified!==1 ||
     !/^\\d{7}$/.test(String(item?.supplier_variant_sku||'')) ||
     !Number.isSafeInteger(item?.observed_total_cents) ||
     item.observed_total_cents<=0)return null;
  const duplicates=await db.prepare(
    'SELECT COUNT(*) AS n FROM supplier_variant_cost_observations '+
    'WHERE supplier_design_code=? AND supplier_variant_sku=?'
  ).bind('D000007',item.supplier_variant_sku).first();
  if(duplicates?.n!==1)return null;
  return item.observed_total_cents;
}

export function assertCorIesuSingleItem(items){
  if(items.some(x=>isCorIesuAssistedSku(x.sku)) &&
     (items.length!==1 || items[0].quantity!==1))
    throw new CatalogError('shipping_package_unverified',
      'A edição Cor Iesu está disponível somente em pedido unitário até validar embalagens combinadas.',409);
}
