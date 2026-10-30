-- One-time Mercado Pago preference diagnostic (no credentials, real buyer or shipment).
CREATE TABLE IF NOT EXISTS store_checkout_test_probe (
 id TEXT PRIMARY KEY,
 status TEXT NOT NULL,
 order_id TEXT,
 amount_cents INTEGER,
 checkout_url TEXT,
 error_code TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 finished_at TEXT
);
-- Keep private: contains a test checkout link. Remove the one-shot route
-- and GitHub workflow after inspecting the provider response.
