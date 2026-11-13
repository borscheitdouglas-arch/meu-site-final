import {CatalogError} from './catalog.js';

// SKUs internos. Os códigos VAVI foram observados em capturas de 13/11/2026.
// Cada variante precisa ser conferida no D1 antes de ser aceita para pagamento.
export const ACCESSORY_VARIANTS=Object.freeze({
  'cor-iesu-bone-preto':Object.freeze({priceCents:7990,productId:'bone-cor-iesu-sacratissimum',design:'D000008',supplierSku:'0001447'}),
  'cor-iesu-bone-azul-escuro':Object.freeze({priceCents:7990,productId:'bone-cor-iesu-sacratissimum',design:'D000008',supplierSku:'0001449'}),
  'cor-iesu-ecobag-m':Object.freeze({priceCents:3990,productId:'ecobag-cor-iesu-sacratissimum',design:'D000009',supplierSku:'0000564'}),
  'cor-iesu-ecobag-g':Object.freeze({priceCents:3990,productId:'ecobag-cor-iesu-sacratissimum',design:'D000011',supplierSku:'0000565'})
});
export const ACCESSORY_SKUS=Object.freeze(Object.keys(ACCESSORY_VARIANTS));
export const isAccessorySku=sku=>typeof sku==='string' && Object.hasOwn(ACCESSORY_VARIANTS,sku);
export const approvedAccessoryVariant=(sku,price)=>
  isAccessorySku(sku) && ACCESSORY_VARIANTS[sku].priceCents===price;
export const accessoryDesign=sku=>isAccessorySku(sku)?ACCESSORY_VARIANTS[sku].design:null;

// Fail-closed: nao autoriza vender por print, por preco no navegador nem por
// codigo de design isolado. Exige ficha privada de frete homologada em D1,
// correspondencia da variante real e custo confirmado SEM depender de desconto.
export async function loadApprovedAccessoryCost(db,sku){
  const expected=ACCESSORY_VARIANTS[sku];
  if(!expected || !db?.prepare)return null;
  try{
    const row=await db.prepare(
      'SELECT supplier_design_code,supplier_variant_sku,subtotal_cents,observed_total_cents,freight_config_verified '+
      'FROM supplier_variant_cost_observations WHERE internal_sku=? LIMIT 1'
    ).bind(sku).first();
    if(row?.supplier_design_code!==expected.design ||
       row?.supplier_variant_sku!==expected.supplierSku ||
       row?.freight_config_verified!==1 ||
       !Number.isSafeInteger(row.subtotal_cents) || row.subtotal_cents<=0 ||
       !Number.isSafeInteger(row.observed_total_cents) ||
       row.observed_total_cents<=0 ||
       row.observed_total_cents>row.subtotal_cents)return null;
    // O frete considera o custo sem desconto; descontos condicionais podem expirar.
    return row.subtotal_cents;
  }catch{return null;}
}
export function assertAccessorySingleItem(items){
  if(items.some(x=>isAccessorySku(x.sku)) &&
     (items.length!==1 || items[0].quantity!==1))
    throw new CatalogError('shipping_package_unverified',
      'Boné e ecobag Cor Iesu estão disponíveis somente em pedidos unitários.',409);
}
