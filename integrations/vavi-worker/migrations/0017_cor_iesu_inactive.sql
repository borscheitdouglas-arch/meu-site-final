-- 11/11/2026 — Camiseta Cor Iesu Sacratissimum: cadastro preparatório.
-- Apenas preço de VENDA e variantes internas. Não contém SKU do fornecedor,
-- UUID VAVI, credenciais nem custo privado. Não cria nenhum pedido/pagamento.
-- Os códigos internos NÃO são os códigos de fabricação da VAVI.
-- Mesmo após executar esta migração, o produto fica totalmente INATIVO.
-- Ativar somente após comprovar ID do design, SKU/custo de CADA variação,
-- técnica/duas estampas, frete, fornecedor e teste real sem erros.
INSERT OR IGNORE INTO products
 (id,name,description,image,enabled,verified,sort_order)
 VALUES
 ('camiseta-cor-iesu-sacratissimum',
  'Camiseta Sagrado Coração de Jesus | Cor Iesu Sacratissimum',
  'Edição Marrom, 100% algodão 30.1 penteado. Frente e costas DTF. Em homologação.',
  '/assets/img/loja/cor-iesu/costas-modelo-1500.webp',0,0,22);

INSERT OR IGNORE INTO variants
 (sku,product_id,label,price_cents,available) VALUES
 ('cor-iesu-marrom-p','camiseta-cor-iesu-sacratissimum','Marrom · P',10990,0),
 ('cor-iesu-marrom-m','camiseta-cor-iesu-sacratissimum','Marrom · M',10990,0),
 ('cor-iesu-marrom-g','camiseta-cor-iesu-sacratissimum','Marrom · G',10990,0),
 ('cor-iesu-marrom-gg','camiseta-cor-iesu-sacratissimum','Marrom · GG',10990,0);
