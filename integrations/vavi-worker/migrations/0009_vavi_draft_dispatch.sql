-- Outbox de rascunhos VAVI: sem dados de endereço, CPF ou credenciais.
-- A chave primária do pedido impede duplicação de registros.
CREATE TABLE IF NOT EXISTS store_vavi_draft_dispatch (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK(state IN ('pending','sending','submitted','needs_review')),
  vavi_draft_id TEXT,
  attempted_at TEXT,
  submitted_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_store_vavi_draft_dispatch_state
 ON store_vavi_draft_dispatch(state,created_at);
