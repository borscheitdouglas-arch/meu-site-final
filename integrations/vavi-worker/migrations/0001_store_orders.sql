-- Migração futura: somente estrutura, NÃO executada automaticamente.
-- Executar após revisão: wrangler d1 migrations apply douglas-loja-db --remote
-- Nunca criar pedidos apenas com base em retorno do navegador.
CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','awaiting_payment','paid','vavi_draft','in_production','shipped','delivered','canceled','payment_failed','manual_review')),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK(currency = 'BRL'),
  subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents >= 0),
  shipping_cents INTEGER NOT NULL CHECK(shipping_cents >= 0),
  total_cents INTEGER NOT NULL CHECK(total_cents > 0),
  shipping_option_id TEXT NOT NULL,
  destination_zip TEXT NOT NULL CHECK(length(destination_zip)=8),
  mp_preference_id TEXT UNIQUE,
  mp_payment_id TEXT UNIQUE,
  vavi_order_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(total_cents = subtotal_cents + shipping_cents)
);
CREATE TABLE IF NOT EXISTS store_order_items (
  order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  label TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents > 0),
  line_total_cents INTEGER NOT NULL CHECK(line_total_cents = quantity * unit_price_cents),
  PRIMARY KEY(order_id,sku)
);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE TABLE IF NOT EXISTS store_payment_events (
  provider_event_id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT REFERENCES store_orders(id),
  provider_payment_id TEXT,
  event_kind TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Dados pessoais de clientes e endereços serão modelados separadamente
-- com política de retenção LGPD; não registrar tokens/payloads inteiros.
