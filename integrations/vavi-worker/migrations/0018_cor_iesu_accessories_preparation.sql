-- 2026-11-11: preparacao dos acessorios Cor Iesu / sem autorizacao para vender.
-- Nao registrar SKU de fornecedor, preco de custo ou credenciais no repositorio.
-- Identificadores internos de produtos NAO substituem os codigos de variacao VAVI.
-- Registros ficam com enabled=0, verified=0 e sem variantes comercializadas.
INSERT OR IGNORE INTO products
 (id,name,description,image,enabled,verified,sort_order) VALUES
 ('bone-cor-iesu-sacratissimum',
 'Boné Sagrado Coração de Jesus | Cor Iesu Sacratissimum',
 'Boné Frente Americana; uma area DTF; design VAVI D000008. Aguardando validacao.',
 '',0,0,23),
 ('ecobag-cor-iesu-sacratissimum',
 'Ecobag Sagrado Coração de Jesus | Cor Iesu Sacratissimum',
 'Ecobag Algodão Cru; uma area DTF; design VAVI D000009. Tamanhos M e G em validacao.',
 '',0,0,24);

-- Registro privado de observacoes do painel do fornecedor.
-- Preco exibido "a partir de" NAO e custo final homologado.
CREATE TABLE IF NOT EXISTS supplier_design_observations (
 product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 supplier_design_code TEXT NOT NULL UNIQUE,
 method TEXT NOT NULL CHECK(method IN ('DTF','DTG')),
 configured_areas INTEGER NOT NULL CHECK(configured_areas BETWEEN 1 AND 5),
 displayed_start_cents INTEGER CHECK(displayed_start_cents >= 0),
 confirmed_unit_cost_cents INTEGER CHECK(confirmed_unit_cost_cents > 0),
 sizes_observed TEXT NOT NULL DEFAULT '',
 colors_observed TEXT NOT NULL DEFAULT '',
 supplier_variants_verified INTEGER NOT NULL DEFAULT 0
   CHECK(supplier_variants_verified IN (0,1)),
 observed_on TEXT NOT NULL,
 evidence_note TEXT NOT NULL
);
