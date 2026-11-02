-- 2026-11-02 — Tabela PRIVADA de referências de custo e variação da VAVI.
-- As linhas de custo não entram no repositório público: são registradas apenas
-- no banco D1. Esta tabela não possui rota HTTP e não habilita pagamentos.
-- Valores observados no painel podem mudar entre consulta e fechamento.
CREATE TABLE IF NOT EXISTS supplier_variant_cost_observations (
  internal_sku TEXT PRIMARY KEY NOT NULL REFERENCES variants(sku),
  supplier_design_code TEXT NOT NULL,
  supplier_variant_sku TEXT NOT NULL,
  option_label TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL CHECK(base_price_cents>=0),
  customization_cents INTEGER NOT NULL CHECK(customization_cents>=0),
  subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents>=0),
  discount_percent INTEGER NOT NULL CHECK(discount_percent BETWEEN 0 AND 100),
  observed_total_cents INTEGER NOT NULL CHECK(observed_total_cents>=0),
  observed_on TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT 'VAVI dashboard screenshots',
  freight_config_verified INTEGER NOT NULL DEFAULT 0
    CHECK(freight_config_verified IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_supplier_variant_observation_design
ON supplier_variant_cost_observations(supplier_design_code);
