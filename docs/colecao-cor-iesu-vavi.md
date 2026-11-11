# Coleção Cor Iesu Sacratissimum — cadastro e homologação VAVI

Fonte: tela "Designs" da VAVI apresentada pelo lojista em **11/11/2026**.

| Produto | Código do DESIGN VAVI | Técnica | Áreas | Observações |
|---|---|---|---|---|
| Camiseta Sagrado Coração | `D000007` | DTF | 2 | P, M, G, GG na edição da loja; cor comercial Marrom ainda precisa de SKU específico e confirmação no design |
| Boné Sagrado Coração | `D000008` | DTF | 1 | Boné Frente Americana; miniaturas mostram preto, azul-escuro e verde-escuro; confirmar nomes oficiais |
| Ecobag Sagrado Coração | `D000009` | DTF | 1 | Ecobag Algodão Cru; tamanhos M e G apresentados |

**ATENÇÃO:** os IDs `D000007`, `D000008` e `D000009` são **códigos de design**, não os SKUs específicos de fabricação por cor e tamanho. Não usar esses IDs como supplier_variant_sku no frete ou nos pedidos.

Os valores do tipo **“A PARTIR DE”** são observações do painel VAVI, não garantias de custo final para cada variação. O custo da camiseta personalizada foi confirmado pelo lojista separadamente. Valores observados são mantidos apenas no D1 (tabela privada `supplier_design_observations`) para não espalhar custos de fornecedor pelo front-end público.

## Produtos e situação
- **Camiseta**: cadastro da loja com preço de venda R$ 109,90 para P/M/G/GG, status `preparation`. Frente com medalhão e costas com gravura gótica. D1 ainda desativado, sem SKUs de fornecedor/frete aprovados.
- **Boné**: cadastro técnico inativo no D1 e rascunho textual em `content/cor-iesu-product-drafts.json`. **Preço normal definido: R$ 79,90; opção promocional futura: R$ 75,00, ainda não ativa.** Sem imagem de produto aprovada ou variantes homologadas; não entra na vitrine nem pode ser comprado. O valor de R$ 44,00 do painel VAVI é exibido como “a partir de”; verificar o custo final por cor antes da ativação.
- **Ecobag**: cadastro técnico inativo no D1 e rascunho textual em `content/cor-iesu-product-drafts.json`. Sem preço de venda, imagem aprovada ou variantes homologadas. Não entra na vitrine ainda.

## Checklist de liberação, por produto
1. Confirmar SKUs específicos da VAVI para cada cor/tamanho; conferir qual cor é **Marrom** na camiseta.
2. Confirmar preço final com arte e método de produção para cada variação, impostos e margem.
3. Confirmar impressão correta, qualidade do arquivo e área de aplicação.
4. Obter foto/mockup fiel ao produto e aprovar a ficha visual.
5. Validar ficha de peso, dimensões e modalidade da produção sob demanda.
6. Integrar cada SKU interno a dados de fornecedor **privados**, realizar cotação real de frete e testes de checkout.
7. **Somente então** marcar produto verified/enabled e variantes available no D1, mantendo proteção de preço aprovado no servidor.

Nenhuma migração preparatória liga o botão Comprar, aprova frete, cria pedido ou cobra pagamento.

> IMPORTANTE: `0018_cor_iesu_accessories_preparation.sql` é uma migração idempotente, não um procedimento de ativação.
