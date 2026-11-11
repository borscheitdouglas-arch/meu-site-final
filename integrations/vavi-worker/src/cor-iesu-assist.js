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

/**
 * Venda assistida da coleção Cor Iesu:
 * o lojista confirmou em 11/11/2026 que a precificação desta camiseta é
 * uniforme para as 11 cores e tamanhos P/M/G/GG (R$ 109,90).
 * O custo de fornecimento é obtido da observação PRIVADA do design D000007,
 * com DTF nas duas faces. O SKU de loja NÃO é um SKU da fábrica.
 *
 * Não inferir equivalência dos códigos VAVI a partir de prints conflitantes.
 * O pagamento gera apenas um pedido/rascunho, para conferência e associação
 * MANUAL de cor, tamanho, arte e produção pelo operador antes de fabricar.
 * A disponibilidade de cada SKU ainda deve ser autorizada explicitamente
 * no D1 (variants.available=1), em separado desta verificação de custo.
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
