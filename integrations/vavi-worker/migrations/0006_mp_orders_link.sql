-- Provider Order IDs are not legacy numeric payment IDs.
-- This table is populated only by private Orders checkout after a D1
-- draft and verified delivery have been written. No production toggle here.
CREATE TABLE IF NOT EXISTS store_mp_order_links (
  provider_order_id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL UNIQUE REFERENCES store_orders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(provider_order_id GLOB 'ORDTST*')
);
CREATE INDEX IF NOT EXISTS idx_store_mp_order_links_order
  ON store_mp_order_links(order_id);
