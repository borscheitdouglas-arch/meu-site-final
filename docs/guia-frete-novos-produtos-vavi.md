# Referência permanente — cadastro e frete de novos produtos VAVI

Atualizado em 02/11/2026 para a loja Douglas Assumpção.

## Regra que devemos reutilizar

A VAVI publica nas fichas de seus produtos informações úteis para a integração, como **SKU, peso e dimensões**. **Antes de cadastrar um novo produto na loja, consultar primeiro a ficha oficial da VAVI** e anotar esses campos. Não inventar valores.

Esses dados são do catálogo e **podem não representar a embalagem final de expedição**. Confirmar com a VAVI se peso e dimensões são aqueles aceitos pelo cálculo de frete e se correspondem à variação e à personalização escolhidas.

## Checklist simples para qualquer produto novo

1. Consultar na VAVI a página oficial do **produto** e suas **variações** (cor, tamanho, técnica e arte).
2. Registrar **UUID completo do produto**, **SKU correto** (base e/ou da variação), **peso (kg)** e **altura, largura e comprimento (mm)**.
3. Confirmar **custo de fabricação** e qual valor usar no campo `amount` da API; nunca supor que seja o preço cobrado ao cliente.
4. Confirmar **embalagem final de envio** e regras de agrupamento para pedidos com várias unidades ou produtos diferentes.
5. Verificar se a modalidade de produção funciona em **pedido unitário Print On Demand** (atenção especial a canecas por sublimação).
6. Configurar de forma privada, no Worker Cloudflare `douglas-loja-api`, o mapeamento SKU interno → ficha logística em `VAVI_SHIPPING_PRODUCTS_JSON`. Nunca publicar segredos, credenciais ou custos no site.
7. Testar `POST /api/shipping/preview` para alguns CEPs reais públicos de teste. A API consulta a VAVI por `/api/Customers/Simulate`; mostrar ao comprador somente opções de frete efetivamente retornadas.
8. Reconfirmar frete, preço de venda, margem e disponibilidade no **servidor** antes de iniciar o pagamento Mercado Pago. Não liberar venda apenas porque o frete foi calculado.

## Pontos pendentes no catálogo Salve Regina

- Caneca preta, caneca P&B, ecobag M, ecobag G: confirmar UUID, SKU de variação, custos e embalagem final, além de cotar frete pela API.
- Canecas: confirmar que a personalização aceita produção e expedição unitária pela integração.
- Pedido com mais de uma peça: consultar a VAVI sobre a composição e a embalagem total. **Não somar manualmente dimensões ou fretes individuais.**
- O moletom ainda depende de aprovação de produto, variante, preço e logística.

## Onde está o código da calculadora

- Vitrine: `scripts/store-shipping-calculator.js`
- Página individual: `scripts/product-detail.js`
- Carrinho: `scripts/cart-shipping.js`
- Integração real VAVI e montagem da composição: `integrations/vavi-worker/src/shipping.js`
- Endpoint público e controles: `integrations/vavi-worker/src/index.js`

Objetivo: cliente escolhe produto e CEP → loja consulta frete **real** → servidor recalcula total → Mercado Pago. A marca VAVI não precisa ser exibida ao consumidor; dados do fornecedor ficam somente na administração e nos serviços privados.
