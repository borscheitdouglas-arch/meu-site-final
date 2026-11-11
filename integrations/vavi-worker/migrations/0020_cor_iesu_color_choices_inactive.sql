-- Cores observadas nas capturas do editor VAVI: nomes descritivos provisórios.
-- Não associar a IDs de fornecedor conflitantes. Somente Marrom P/M/G/GG
-- está aprovado. Outras cores ficam VISÍVEIS no seletor, mas sem pagamento.
-- Para ativar uma combinação no futuro: confirmar nome oficial, cor da arte,
-- custo final, disponibilidade e mockup; então marcar available=1 no D1.
INSERT OR IGNORE INTO variants
 (sku,product_id,label,price_cents,available) VALUES
 ('cor-iesu-bege-p','camiseta-cor-iesu-sacratissimum','Bege · P (sob consulta)',10990,0),
 ('cor-iesu-bege-m','camiseta-cor-iesu-sacratissimum','Bege · M (sob consulta)',10990,0),
 ('cor-iesu-bege-g','camiseta-cor-iesu-sacratissimum','Bege · G (sob consulta)',10990,0),
 ('cor-iesu-bege-gg','camiseta-cor-iesu-sacratissimum','Bege · GG (sob consulta)',10990,0),
 ('cor-iesu-vinho-p','camiseta-cor-iesu-sacratissimum','Vinho · P (sob consulta)',10990,0),
 ('cor-iesu-vinho-m','camiseta-cor-iesu-sacratissimum','Vinho · M (sob consulta)',10990,0),
 ('cor-iesu-vinho-g','camiseta-cor-iesu-sacratissimum','Vinho · G (sob consulta)',10990,0),
 ('cor-iesu-vinho-gg','camiseta-cor-iesu-sacratissimum','Vinho · GG (sob consulta)',10990,0),
 ('cor-iesu-verde-escuro-p','camiseta-cor-iesu-sacratissimum','Verde escuro · P (sob consulta)',10990,0),
 ('cor-iesu-verde-escuro-m','camiseta-cor-iesu-sacratissimum','Verde escuro · M (sob consulta)',10990,0),
 ('cor-iesu-verde-escuro-g','camiseta-cor-iesu-sacratissimum','Verde escuro · G (sob consulta)',10990,0),
 ('cor-iesu-verde-escuro-gg','camiseta-cor-iesu-sacratissimum','Verde escuro · GG (sob consulta)',10990,0),
 ('cor-iesu-cinza-claro-p','camiseta-cor-iesu-sacratissimum','Cinza claro · P (sob consulta)',10990,0),
 ('cor-iesu-cinza-claro-m','camiseta-cor-iesu-sacratissimum','Cinza claro · M (sob consulta)',10990,0),
 ('cor-iesu-cinza-claro-g','camiseta-cor-iesu-sacratissimum','Cinza claro · G (sob consulta)',10990,0),
 ('cor-iesu-cinza-claro-gg','camiseta-cor-iesu-sacratissimum','Cinza claro · GG (sob consulta)',10990,0),
 ('cor-iesu-grafite-p','camiseta-cor-iesu-sacratissimum','Grafite · P (sob consulta)',10990,0),
 ('cor-iesu-grafite-m','camiseta-cor-iesu-sacratissimum','Grafite · M (sob consulta)',10990,0),
 ('cor-iesu-grafite-g','camiseta-cor-iesu-sacratissimum','Grafite · G (sob consulta)',10990,0),
 ('cor-iesu-grafite-gg','camiseta-cor-iesu-sacratissimum','Grafite · GG (sob consulta)',10990,0);
