# Pré-liberação — Boné e Ecobag Cor Iesu Sacratissimum
Data de preparação: 13/11/2026 · **NÃO AUTORIZA VENDAS**

## Escopo e estado atual

| Produto | ID da loja | Design de produção | Variações internas | Preço de venda |
|---|---|---|---|---|
| Boné Sagrado Coração | `bone-cor-iesu-sacratissimum` | `D000008` (DTF, 1 área) | preto, azul-escuro, verde-escuro | R$ 79,90 |
| Ecobag Sagrado Coração | `ecobag-cor-iesu-sacratissimum` | `D000009` (DTF, 1 área) | M, G | R$ 39,90 (a confirmar) |

Os códigos `D000008` e `D000009` são **IDs dos designs**, não identificadores de variantes físicas. **Não enviar como SKU de produção**.

Há capas de 13/11/2026 em `assets/img/loja/cor-iesu/`, já referenciadas em `pages/loja.html` e `scripts/product-detail.js`. A existência dos mockups não comprova a fabricação real nem a cor impressa.

## Dados reais necessários antes da implementação do checkout

Para **cada variante**, conferir no painel/API oficial do fornecedor e guardar em local privado (D1), não em JSON público:
- [ ] Nome oficial da cor ou tamanho e SKU próprio da variante física.
- [ ] Produto-base e técnica/área de impressão compatíveis com o design correto.
- [ ] Preço final da peça estampada por variante, com impostos e eventuais adicionais.
- [ ] Disponibilidade e eventual restrição de pedido mínimo.
- [ ] Peso, dimensões e dados exigidos pela cotação de frete, conferidos na ficha atual.
- [ ] Evidência da consulta e data da validação.

**Boné** — confirmar se preto, azul-escuro e verde-escuro são de fato oferecidos no modelo Frente Americana e se a estampa em DTF fica na posição esperada.

**Ecobag** — confirmar dimensões, peso e área imprimível de M e G e custo final para ambos os tamanhos.

## Portões técnicos de liberação

- [ ] Aprovar a arte de produção (não apenas mockup) e a aplicação de cada design.
- [ ] Atualizar o mapeamento privado SKU interno ↔ SKU do fornecedor; validar que cada SKU pertence ao produto-base esperado.
- [ ] Revisar margem líquida dos preços exibidos; custos observados de R$ 44,00 (boné) e R$ 19,50 (ecobag) não substituem custo final homologado por variante.
- [ ] Configurar o Worker com lista autorizada de acessórios e preços do banco, rejeitando quaisquer SKUs desconhecidos e indisponíveis.
- [ ] Testar frete real individual por CEP com credenciais do Worker, inclusive erro do fornecedor, sem inventar retorno.
- [ ] Testar fluxo de checkout InfinitePay SEM cobrança real e validar que o pós-pagamento gerará rascunho com design e variante corretos; verificar idempotência e necessidade de vínculo manual de arte e produção.
- [ ] Confirmar informações de produto e imagens finais, política de entrega e capacidade de atendimento.
- [ ] Publicar Worker testado antes de ativar os produtos no D1.
- [ ] Somente após todos os itens: atualizar `products.enabled=1`, `products.verified=1` e `variants.available=1` apenas para variantes homologadas; mudar `status: "preparation"` da vitrine e substituir “Conhecer produto” por chamada real de compra.
- [ ] Testar ponta a ponta em produção com salvaguardas, incluindo cenários de indisponibilidade; monitorar o primeiro pedido.

## Proteção atual — não alterar prematuramente

`integrations/vavi-worker/migrations/0018_cor_iesu_accessories_preparation.sql` e `0019_cor_iesu_accessories_variants_inactive.sql` mantêm os acessórios desligados. O `content/shop-cart-catalog.json` exibe `sku: null`, `availability: "pending"`, e status `preparation`. Não é seguro liberar a UI isoladamente; o servidor deve autorizar os itens com dados privados homologados.

## Próxima ação concreta

Obter e confirmar as cinco variantes físicas, suas fichas e custos finais no fornecedor. Com esses dados, implementar o aceite específico no Worker e realizar os testes de frete/checkout. **Esta preparação não executa pagamentos, não modifica D1 e não coloca os produtos à venda.**
