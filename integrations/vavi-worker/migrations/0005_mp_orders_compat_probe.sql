-- One-off Orders API compatibility probe only; no customer PII.
CREATE TABLE IF NOT EXISTS store_mp_orders_compat_probe (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  provider_id TEXT,
  checkout_url TEXT,
  error_code TEXT,
  checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
