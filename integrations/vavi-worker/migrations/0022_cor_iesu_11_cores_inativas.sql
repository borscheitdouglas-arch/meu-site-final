-- 2026-11-11: cadastro preparatorio de 11 cores x 4 tamanhos (44 variacoes).
-- Os quatro Marrom ja existem e estao liberados; este script NAO os altera.
-- Todas as demais combinacoes entram com available=0: SEM COBRANCA!
-- Slugs e precos sao internos. NAO sao SKU VAVI e nem prova de custo real.
-- Homologar: nomenclatura exata da cor na VAVI, SKU unico por tamanho,
-- custo de DTF frente+costas, qualidade da arte, embalagem, frete real e
-- rascunho com revisao manual antes de liberar cada variante no D1.
-- A interface adota: Branco, Preto, Off-white, Azul-marinho, Azul-royal,
-- Verde, Cinza-claro, Cinza-escuro, Areia, Bordo e Marrom.
INSERT OR IGNORE INTO variants (sku,product_id,label,price_cents,available) VALUES
 ('cor-iesu-branco-p','camiseta-cor-iesu-sacratissimum','Branco · P',10990,0),
 ('cor-iesu-branco-m','camiseta-cor-iesu-sacratissimum','Branco · M',10990,0),
 ('cor-iesu-branco-g','camiseta-cor-iesu-sacratissimum','Branco · G',10990,0),
 ('cor-iesu-branco-gg','camiseta-cor-iesu-sacratissimum','Branco · GG',10990,0),
 ('cor-iesu-preto-p','camiseta-cor-iesu-sacratissimum','Preto · P',10990,0),
 ('cor-iesu-preto-m','camiseta-cor-iesu-sacratissimum','Preto · M',10990,0),
 ('cor-iesu-preto-g','camiseta-cor-iesu-sacratissimum','Preto · G',10990,0),
 ('cor-iesu-preto-gg','camiseta-cor-iesu-sacratissimum','Preto · GG',10990,0),
 ('cor-iesu-off-white-p','camiseta-cor-iesu-sacratissimum','Off-white · P',10990,0),
 ('cor-iesu-off-white-m','camiseta-cor-iesu-sacratissimum','Off-white · M',10990,0),
 ('cor-iesu-off-white-g','camiseta-cor-iesu-sacratissimum','Off-white · G',10990,0),
 ('cor-iesu-off-white-gg','camiseta-cor-iesu-sacratissimum','Off-white · GG',10990,0),
 ('cor-iesu-azul-marinho-p','camiseta-cor-iesu-sacratissimum','Azul-marinho · P',10990,0),
 ('cor-iesu-azul-marinho-m','camiseta-cor-iesu-sacratissimum','Azul-marinho · M',10990,0),
 ('cor-iesu-azul-marinho-g','camiseta-cor-iesu-sacratissimum','Azul-marinho · G',10990,0),
 ('cor-iesu-azul-marinho-gg','camiseta-cor-iesu-sacratissimum','Azul-marinho · GG',10990,0),
 ('cor-iesu-azul-royal-p','camiseta-cor-iesu-sacratissimum','Azul-royal · P',10990,0),
 ('cor-iesu-azul-royal-m','camiseta-cor-iesu-sacratissimum','Azul-royal · M',10990,0),
 ('cor-iesu-azul-royal-g','camiseta-cor-iesu-sacratissimum','Azul-royal · G',10990,0),
 ('cor-iesu-azul-royal-gg','camiseta-cor-iesu-sacratissimum','Azul-royal · GG',10990,0),
 ('cor-iesu-verde-p','camiseta-cor-iesu-sacratissimum','Verde · P',10990,0),
 ('cor-iesu-verde-m','camiseta-cor-iesu-sacratissimum','Verde · M',10990,0),
 ('cor-iesu-verde-g','camiseta-cor-iesu-sacratissimum','Verde · G',10990,0),
 ('cor-iesu-verde-gg','camiseta-cor-iesu-sacratissimum','Verde · GG',10990,0),
 ('cor-iesu-cinza-claro-p','camiseta-cor-iesu-sacratissimum','Cinza-claro · P',10990,0),
 ('cor-iesu-cinza-claro-m','camiseta-cor-iesu-sacratissimum','Cinza-claro · M',10990,0),
 ('cor-iesu-cinza-claro-g','camiseta-cor-iesu-sacratissimum','Cinza-claro · G',10990,0),
 ('cor-iesu-cinza-claro-gg','camiseta-cor-iesu-sacratissimum','Cinza-claro · GG',10990,0),
 ('cor-iesu-cinza-escuro-p','camiseta-cor-iesu-sacratissimum','Cinza-escuro · P',10990,0),
 ('cor-iesu-cinza-escuro-m','camiseta-cor-iesu-sacratissimum','Cinza-escuro · M',10990,0),
 ('cor-iesu-cinza-escuro-g','camiseta-cor-iesu-sacratissimum','Cinza-escuro · G',10990,0),
 ('cor-iesu-cinza-escuro-gg','camiseta-cor-iesu-sacratissimum','Cinza-escuro · GG',10990,0),
 ('cor-iesu-areia-p','camiseta-cor-iesu-sacratissimum','Areia · P',10990,0),
 ('cor-iesu-areia-m','camiseta-cor-iesu-sacratissimum','Areia · M',10990,0),
 ('cor-iesu-areia-g','camiseta-cor-iesu-sacratissimum','Areia · G',10990,0),
 ('cor-iesu-areia-gg','camiseta-cor-iesu-sacratissimum','Areia · GG',10990,0),
 ('cor-iesu-bordo-p','camiseta-cor-iesu-sacratissimum','Bordô · P',10990,0),
 ('cor-iesu-bordo-m','camiseta-cor-iesu-sacratissimum','Bordô · M',10990,0),
 ('cor-iesu-bordo-g','camiseta-cor-iesu-sacratissimum','Bordô · G',10990,0),
 ('cor-iesu-bordo-gg','camiseta-cor-iesu-sacratissimum','Bordô · GG',10990,0);
-- Variacoes historicas de trabalho (bege, vinho, verde-escuro, grafite)
-- permanecem com available=0; NAO ativar duplicatas de catalogo.
