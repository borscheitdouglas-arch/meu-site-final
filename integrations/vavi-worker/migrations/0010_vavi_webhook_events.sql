-- VAVI: histórico mínimo de eventos autenticados, sem armazenar destinatário,
-- endereço, CPF, tokens ou payload original.
CREATE TABLE IF NOT EXISTS store_vavi_webhook_events (
  webhook_sent_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  vavi_order_id TEXT,
  draft_id TEXT,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS store_vavi_order_tracking (
  vavi_order_id TEXT PRIMARY KEY NOT NULL,
  order_status TEXT,
  order_nsu TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  carrier_name TEXT,
  shipment_status TEXT,
  last_event_at TEXT NOT NULL
);
