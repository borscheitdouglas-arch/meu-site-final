import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogError, normalizeCart, quoteCart, groupCatalog} from '../src/catalog.js';

test('consolida SKUs repetidos sem aceitar preços enviados pelo navegador', () => {
  assert.deepEqual(normalizeCart({items:[
    {sku:'CAM-01-M',quantity:2,price:0},
    {sku:'CAM-01-M',quantity:1,paid:true}
  ]}),[{sku:'CAM-01-M',quantity:3}]);
});
test('recusa quantidade inválida e SKU suspeito', () => {
  assert.throws(() => normalizeCart({items:[{sku:'../secret',quantity:1}]}), CatalogError);
  assert.throws(() => normalizeCart({items:[{sku:'CAM-M',quantity:0}]}), CatalogError);
  assert.throws(() => normalizeCart({items:[{sku:'CAM-M',quantity:11}]}), CatalogError);
  assert.throws(() => normalizeCart({items:[{sku:'CAM-M',quantity:6},{sku:'CAM-M',quantity:5}]}), CatalogError);
});
test('calcula subtotal apenas com preço guardado no servidor', async () => {
  const cart = normalizeCart({items:[{sku:'CAM-M',quantity:2,unitPriceCents:1}]});
  const quote = await quoteCart(cart, async sku => ({
    sku,name:'Camiseta',label:'M',price_cents:8500,
    product_enabled:1,product_verified:1,available:1
  }));
  assert.equal(quote.subtotalCents,17000);
  assert.equal(quote.checkoutEnabled,false);
  assert.equal(quote.finalTotalCents,null);
});
test('impede venda quando produto não está verificado', async () => {
  await assert.rejects(quoteCart([{sku:'CAM-M',quantity:1}], async () => ({
    price_cents:8500,product_enabled:1,product_verified:0,available:1
  })), CatalogError);
});
test('catálogo público lista apenas variantes já filtradas', () => {
  const grouped=groupCatalog([
    {id:'c1',name:'Camiseta',description:'Arte',image:'../assets/c1.png',sku:'CAM-P',label:'P',price_cents:7500},
    {id:'c1',name:'Camiseta',description:'Arte',image:'../assets/c1.png',sku:'CAM-M',label:'M',price_cents:7800}
  ]);
  assert.equal(grouped.length,1);
  assert.equal(grouped[0].variants.length,2);
});
