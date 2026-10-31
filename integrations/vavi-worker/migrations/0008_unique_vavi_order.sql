-- Garante que duas compras reais não sejam registradas com o mesmo pedido de fornecedor.
-- Migração aditiva e idempotente; não cria ordens na VAVI.
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_orders_live_vavi_order
 ON store_orders(vavi_order_id)
 WHERE payment_environment='live' AND vavi_order_id IS NOT NULL;
