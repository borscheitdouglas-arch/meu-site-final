-- Camiseta Salve Regina, VAVI design D000001, produto-base 0001581.
-- Precos de venda aprovados pelo lojista em 31/10/2026:
-- P/M/G/GG R$109,90; XG R$119,90. Não habilitar vendas.
-- "A partir de" no fornecedor não confirma todos os custos;
-- confirmar tabela VAVI, mapeamento e frete antes da ativacao.
INSERT OR IGNORE INTO variants
 (sku,product_id,label,price_cents,available) VALUES
 ('salve-regina-preta-p','camiseta-salve-regina','Preta P',10990,0),
 ('salve-regina-preta-m','camiseta-salve-regina','Preta M',10990,0),
 ('salve-regina-preta-g','camiseta-salve-regina','Preta G',10990,0),
 ('salve-regina-preta-gg','camiseta-salve-regina','Preta GG',10990,0),
 ('salve-regina-preta-xg','camiseta-salve-regina','Preta XG',11990,0);
-- Não altera available, product enabled, product verified ou payment flags.
