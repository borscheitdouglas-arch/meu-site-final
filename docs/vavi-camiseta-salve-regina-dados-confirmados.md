# Produto Salve Regina — dados confirmados com suporte VAVI (30/10/2026)

Dados comunicados pelo atendimento VAVI para a **Camiseta Unissex Algodão 30.1 Penteado** (produto-base, ainda não a variação final):

- UUID de catálogo: `019aa7eb-d437-721a-bc8d-69d5a2754865`
- SKU-base: `0000001`
- Peso de catálogo por peça: **0,25 kg**
- Dimensões de catálogo: **300 × 250 × 10 mm**
- Link informado: https://vaviestampas.com.br/products/019aa7eb-d437-721a-bc8d-69d5a2754865
- Personalização aprovada: **partitura na frente, Nossa Senhora nas costas**; camiseta preta, DTF, tamanho G conferido no carrinho.
- Custo observado para tamanho G personalizado: **R$ 66,83**, sujeito a nova verificação antes de vender.
- Preço público preliminar para G: **R$ 109,90**, cadastrado no D1 com `available=0` (sem vendas).

O suporte explicou que **tamanho e cor são atributos de variação**, mas não confirmou como o endpoint de frete `POST /api/Customers/Simulate` identifica cada combinação. Não presumir que `0000001` seja SKU suficiente para o tamanho G com personalização DTF em ambas as faces.

O suporte também afirmou que o frete usa o **pacote do pedido**, não a soma manual das dimensões. Corrigido o cálculo de múltiplos itens no backend: enquanto a regra não for confirmada, pedidos com mais de uma peça recebem erro de indisponibilidade de cotação (falha segura); peça única usa dimensões fornecidas.

**Ainda falta confirmar com a VAVI:**
1. Como informar cor preta, tamanho G e DTF em frente/costas no payload de simulação (ou se a simulação usa só o produto-base e SKU-base).
2. Se `amount` em `compositions[]` é preço de fabricação ou valor comercial, e se deve usar custo unitário ou outro campo.
3. Se 300 × 250 × 10 mm são as dimensões aceitas no endpoint mesmo para produto com embalagem de expedição, e se os campos seguem ordem `height=10,width=250,length=300`.
4. Como enviar várias camisetas e representar a embalagem total sem calcular manualmente.
5. Confirmação das opções de tamanho/custos e código de cada variação.

**Não ativar produto ou checkout com estes dados antes de obter confirmação do contrato e cotação real.**
