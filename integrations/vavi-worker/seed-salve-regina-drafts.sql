-- Coleção Salve Regina, 2026-10-29.
-- Cadastro de rascunhos: NÃO habilita vendas, preços, checkout ou integração VAVI.
-- Seguro para rodar mais de uma vez: não altera itens já cadastrados.
-- As variações não podem ser criadas sem preços verdadeiros confirmados.
INSERT OR IGNORE INTO products (id, name, description, image, enabled, verified, sort_order) VALUES
  ('camiseta-salve-regina','Camiseta Salve Regina',
   'Camiseta preta. Nossa Senhora na frente; partitura gregoriana Salve Regina nas costas. Modelos, tamanhos, personalização e custo ainda sujeitos à confirmação na VAVI.',
   '/assets/img/Produtos/salve-regina/camiseta-preview.svg',0,0,10),
  ('moletom-salve-regina','Moletom Salve Regina',
   'Moletom preto. Nossa Senhora na frente; partitura gregoriana Salve Regina nas costas. Tamanhos, técnica de impressão e custo ainda sujeitos à confirmação na VAVI.',
   '/assets/img/Produtos/salve-regina/moletom-preview.svg',0,0,20),
  ('caneca-salve-regina','Caneca Salve Regina',
   'Caneca de porcelana branca planejada, 350 ml. Nossa Senhora de um lado; canto gregoriano do outro. Modelo, impressão e custo sujeitos à confirmação na VAVI; cor preta ainda não confirmada.',
   '/assets/img/Produtos/salve-regina/caneca-preview.svg',0,0,30);

-- Conferência do estado dos rascunhos:
SELECT id, name, enabled, verified FROM products
 WHERE id IN ('camiseta-salve-regina','moletom-salve-regina','caneca-salve-regina')
 ORDER BY sort_order;
