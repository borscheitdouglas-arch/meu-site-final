-- Separa pedidos de produção dos pedidos sandbox já existentes.
-- Migração aditiva. Não liga pagamentos nem altera o status dos produtos.
ALTER TABLE store_orders ADD COLUMN payment_environment TEXT NOT NULL DEFAULT 'test'
 CHECK(payment_environment IN ('test','live'));
CREATE INDEX IF NOT EXISTS idx_store_orders_env_status
 ON store_orders(payment_environment,status,created_at);
