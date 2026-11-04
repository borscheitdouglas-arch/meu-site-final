-- InfinitePay em tabelas próprias; mantém intactos os pedidos e recibos do Mercado Pago.
-- Aplicar no D1 remoto ANTES de ativar INFINITEPAY_CHECKOUT_ENABLED.
CREATE TABLE IF NOT EXISTS store_infinitepay_links (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  checkout_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS store_infinitepay_payments (
  transaction_nsu TEXT PRIMARY KEY NOT NULL,
  order_id TEXT UNIQUE NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  invoice_slug TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  paid_amount_cents INTEGER NOT NULL CHECK(paid_amount_cents >= amount_cents),
  capture_method TEXT NOT NULL CHECK(capture_method IN ('pix','credit_card')),
  installments INTEGER NOT NULL CHECK(installments BETWEEN 1 AND 12),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_infinitepay_payments_order ON store_infinitepay_payments(order_id);
