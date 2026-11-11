# Coleção Cor Iesu Sacratissimum — cadastro e homologação VAVI

Fonte: tela "Designs" da VAVI apresentada pelo lojista em **11/11/2026**.

| Produto | Código do DESIGN VAVI | Técnica | Áreas | Observações |
|---|---|---|---|---|
| Camiseta Sagrado Coração | `D000007` | DTF | 2 | Marrom P/M/G/GG com SKU interno; vínculo do produto físico ao design é manual no rascunho VAVI |
| Boné Sagrado Coração | `D000008` | DTF | 1 | Boné Frente Americana; miniaturas mostram preto, azul-escuro e verde-escuro; confirmar nomes oficiais |
| Ecobag Sagrado Coração | `D000009` | DTF | 1 | Ecobag Algodão Cru; tamanhos M e G apresentados |

**ATENÇÃO:** os IDs `D000007`, `D000008` e `D000009` são **códigos de design**, não os SKUs específicos de fabricação por cor e tamanho. Não usar esses IDs como supplier_variant_sku no frete ou nos pedidos.

Os valores do tipo **“A PARTIR DE”** são observações do painel VAVI, não garantias de custo final para cada variação. O custo da camiseta personalizada foi confirmado pelo lojista separadamente. Valores observados são mantidos apenas no D1 (tabela privada `supplier_design_observations`) para não espalhar custos de fornecedor pelo front-end público.

## Produtos e situação
- **Camiseta**: **venda assistida ativa** na loja, R$ 109,90, edição Marrom P/M/G/GG. Frente com medalhão e costas com gravura gótica; 4 SKUs internos, D1 enabled/verified/available=1. Frete real VAVI validado por CEP de teste em 11/11/2026, usando ficha física sem UUID. Uma unidade por pedido. Pagamento via InfinitePay; após confirmação validada, rascunho VAVI D000007 é criado e exige vínculo manual do produto/arte e pagamento da produção no portal.
- **Boné**: cadastro técnico inativo no D1 e rascunho textual em `content/cor-iesu-product-drafts.json`. **Preço normal definido: R$ 79,90; opção promocional futura: R$ 75,00, ainda não ativa.** Sem imagem de produto aprovada ou variantes homologadas; não entra na vitrine nem pode ser comprado. O lojista confirmou custo de R$ 44,00; conferir a variação efetiva por cor antes de ativar. Há três SKUs internos de trabalho, todos inativos.
- **Ecobag**: cadastro técnico inativo no D1 com variantes internas M/G e preço planejado R$ 39,90, igual à ecobag Salve Regina. Custo informado R$ 19,50; ainda faltam imagens aprovadas, variantes e frete homologados. Não entra na vitrine nem pode ser comprada.

## Levantamento visual das variantes da camiseta — 11/11/2026

As **44 combinações** (11 cores × 4 tamanhos) foram transcritas das capturas da tela "Adicionar ao Carrinho" da VAVI e guardadas, com referência à captura de origem, em [`content/cor-iesu-vavi-variantes-observadas.json`](../content/cor-iesu-vavi-variantes-observadas.json).

**AVISO DE CONFIABILIDADE:**
- Embora 44 combinações apareçam selecionadas, há apenas **30 códigos distintos** visíveis.
- **9 códigos se repetem**, afetando **23 combinações**; alguns aparecem para cores diferentes.
- Isso pode ocorrer porque o resumo da variante demora a atualizar ao trocar cor/tamanho; não é prova de erro cadastral no fornecedor.
- Portanto, **NENHUM dos 44 códigos está homologado para pedidos automáticos**. Os registros são **observações**, não mapeamento operacional validado.
- Confirmar a relação cor+tamanho→SKU por API/autorização da VAVI ou reabrir o modal, selecionar cada variação e aguardar atualização completa do resumo; antes de liberar, conferir que cada SKU é único, pertence ao produto-base e recebe a arte `D000007`.
- **Não atualizar `variants.supplier_variant_sku`, não habilitar checkout e não usar esses códigos para simulação de frete/produção até validar.**

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


## Implementação de venda assistida — 11/11/2026

- O Worker aceita **somente** `cor-iesu-marrom-p/m/g/gg` com preço R$ 109,90, D1 ativo e custo privado confirmado para `D000007` / DTF / 2 áreas. Não usa códigos de fornecedor conflitantes das capturas.
- O frete de uma peça é consultado de verdade na API VAVI usando peso/dimensões da ficha de camiseta 30.1 e custo confirmado no D1, sem UUID ou SKU VAVI inventado. A loja assume eventual diferença de embalagem no fechamento da produção. O valor é reconsultado pelo backend antes de iniciar pagamento.
- O checkout unitário InfinitePay utiliza os controles existentes: dados cifrados, preço do D1, pagamento verificado, fila idempotente e envio de **rascunho** VAVI. O item do rascunho carrega `D000007` e indica **medalhão na frente / gravura gótica nas costas**. A produção só começa após o lojista conferir e pagar no painel VAVI.
- **Não há checkout multipeça com Cor Iesu** até homologar pacote combinado; não prometer fabricação automática sem conferência.
- Testes: [suite Worker](https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/43044944576), [cotação real dos 4 tamanhos, sem pedido ou cobrança](https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/43045388953).
- Boné e ecobag: variantes e custos privados cadastrados, **enabled=0, verified=0, available=0**; ainda sem imagens/mockups próprios aprovados. Preço do boné **R$ 79,90** (R$ 75,00 apenas possível promoção futura). Preço planejado ecobag **R$ 39,90**. Nunca anunciar esses acessórios como disponíveis antes das fotos, frete e confirmação operacional.

## Checkout com seletor visual — 11/11/2026

- O campo genérico **“Único — R$ 109,90”** foi removido da camiseta Cor Iesu. A etapa 1 agora apresenta **paleta de cores com nomes**, botões P/M/G/GG e resumo dinâmico da variante; o preço permanece separado do seletor.
- Cores observadas nas capturas VAVI: **Marrom, Bege, Vinho, Verde escuro, Cinza claro e Grafite**. Os nomes não são garantidos como denominações oficiais da VAVI; revisar no painel antes de liberar.
- O D1 contém **24 SKUs internos** para a camiseta. **Somente os 4 Marrom estão ativos**; as outras 20 combinações foram inseridas com `available=0` e são selecionáveis visualmente apenas para consulta por e-mail. A interface consulta `/api/checkout/live/readiness` e **não** habilita frete/pagamento de combinações inativas.
- Ao mudar tamanho/cor, o checkout atualiza o SKU interno, o título, o resumo e a URL; descarta o frete anterior e exige nova cotação real. Um retorno atrasado do frete não reativa combinações inativas.
- A configuração visual das cores fica em `scripts/checkout-cor-iesu-picker.js`; a lista de SKUs autorizáveis fica em `integrations/vavi-worker/src/cor-iesu-assist.js`; fichas de embalagem em `integrations/vavi-worker/src/shipping.js`. Não inventar identificadores VAVI.
- Para liberar qualquer cor nova: confirmar nome/cor oficial, custo DTF em **2 áreas**, disponibilidade real, arte correta frente/costas e foto/mockup fiel; atualizar `variants.label` e `variants.available=1` no D1. A venda segue **assistida**, com rascunho VAVI e conferência humana antes da produção.
