-- 02/11/2026: cadastro inicial das demais peças Salve Regina.
-- O design está identificado na VAVI, mas SKU final, embalagem, disponibilidade,
-- custo de expedição e frete POR VARIANTE ainda não foram homologados.
-- Estes registros permanecem INATIVOS: não permitem cobrança ou cotação.
-- Preços de vitrine são referências e só podem ser oferecidos após validação.
-- Operação idempotente. Não altera pedidos, flags ou produtos existentes.

INSERT OR IGNORE INTO products
 (id,name,description,image,enabled,verified,sort_order) VALUES
 ('caneca-salve-regina-preta','Caneca Preta Salve Regina — Partitura',
  'Arte gregoriana em caneca preta, sujeita à validação técnica da produção.',
  '/assets/img/loja/Salve-Regina/web/caneca-800.webp',0,0,31),
 ('caneca-salve-regina-pb','Caneca P&B Salve Regina — Nossa Senhora',
  'Arte mariana em caneca preto e branco, sujeita à validação técnica.',
  '/assets/img/loja/Salve-Regina/web/caneca-800.webp',0,0,32),
 ('ecobag-salve-regina-m','Ecobag Salve Regina — Algodão Cru M',
  'Ecobag de algodão cru tamanho M, aguardando validação da fabricação e envio.',
  '/assets/img/loja/Salve-Regina/web/ecobag-800.webp',0,0,41),
 ('ecobag-salve-regina-g','Ecobag Salve Regina — Algodão Cru G',
  'Ecobag de algodão cru tamanho G, aguardando validação da fabricação e envio.',
  '/assets/img/loja/Salve-Regina/web/ecobag-800.webp',0,0,42);

INSERT OR IGNORE INTO variants
 (sku,product_id,label,price_cents,available) VALUES
 ('caneca-salve-regina-preta','caneca-salve-regina-preta',
  'Preta · Partitura',4990,0),
 ('caneca-salve-regina-pb','caneca-salve-regina-pb',
  'P&B · Nossa Senhora',4990,0),
 ('ecobag-salve-regina-m','ecobag-salve-regina-m',
  'Algodão cru · M',3990,0),
 ('ecobag-salve-regina-g','ecobag-salve-regina-g',
  'Algodão cru · G',3990,0);

-- Para disponibilizar cada SKU depois, exigir comprovação de arte,
-- custo unitário, preço/margem, identificadores oficiais de produção,
-- embalagem do pedido e cotação real do transporte por CEP.
