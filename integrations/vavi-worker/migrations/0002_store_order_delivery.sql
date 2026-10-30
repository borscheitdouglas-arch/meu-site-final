-- D1: pedido e entrega protegida (LGPD). Requires DELIVERY_ENCRYPTION_KEY_B64
-- 32 random bytes encoded as Base64, stored ONLY in a Cloudflare Worker secret.
-- Never copy encrypted blobs to application logs or frontend.
CREATE TABLE IF NOT EXISTS store_order_delivery (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  destination_zip TEXT NOT NULL CHECK(length(destination_zip)=8),
  encrypted_payload TEXT NOT NULL,
  iv TEXT NOT NULL CHECK(length(iv)=24),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_store_order_delivery_created
  ON store_order_delivery(created_at);
-- Retention / deletion policy for buyer PII must be formalized before live checkout.
