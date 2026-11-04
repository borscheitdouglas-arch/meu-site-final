-- Diagnóstico técnico sem dados pessoais, tokens, payload ou URL do checkout.
-- Uma linha por pedido com falha ao iniciar uma cobrança.
CREATE TABLE IF NOT EXISTS store_checkout_failures (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK(stage IN ('provider','save_link','save_status')),
  error_code TEXT NOT NULL,
  provider_http_status INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_store_checkout_failures_created
  ON store_checkout_failures(created_at);
