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

## Atualização: screenshots do painel VAVI em 02/11/2026

O lojista enviou **10 capturas do painel Designs** com os **5 designs e 9 SKUs de variação**, preços-base, custos das personalizações e preços finais sujeitos aos descontos de fechamento.

Os dados sensíveis (custos e mapeamento dos SKUs internos para SKUs de fornecedor) foram registrados em uma tabela **privada do D1**, `supplier_variant_cost_observations`, não nos scripts HTML/JS públicos. A migração estrutural, sem preços, fica em `integrations/vavi-worker/migrations/0013_supplier_variant_cost_observations_private.sql`.

- Camiseta: design `D000001`, tamanhos P/M/G/GG/XG identificados, personalização de 2 áreas.
- Ecobag M: `D000004` e ecobag G: `D000005`, uma área DTF.
- Caneca P&B: `D000003` e caneca preta: `D000002`, uma área por sublimação.
- **Custo exibido com desconto não é custo futuro garantido:** o painel diz que o desconto é aplicado no fechamento. Revalidar custo e margem antes de cobrar.
- A imagem do design `D000001` parece apresentar **partitura na frente e Nossa Senhora nas costas**. Confirmar se essa orientação é a pretendida antes de enviar produção; a identidade visual inicialmente discutida para a loja era Nossa Senhora na frente.

## Próximo bloqueio identificado após conferir as capturas (02/11/2026, 22h)

**Atenção, modelos diferentes:** o design `D000001` aparece nas capturas como **Camiseta Unissex Algodão 30.1 Penteado — Gola Canelada**, enquanto o UUID `019aa7eb-d437-721a-bc8d-69d5a2754865` anteriormente fornecido foi registrado como **Camiseta Unissex Algodão 30.1 Penteado** sem confirmação do sufixo. O catálogo público VAVI enumera os dois modelos. **Não assumir que o UUID da camiseta antiga é o da gola canelada.** A cotação real da camiseta G que a API retorna não garante que a origem logística é o modelo do design atual.

Os SKUs dos cinco tamanhos e os custos por arte/personalização estão registrados na tabela privada `supplier_variant_cost_observations`. Precisamos confirmar **apenas dados logísticos e contrato da simulação**, sem pedir novamente as mesmas telas.

**Solicitação à VAVI, priorizada:**
1. Qual é o **UUID do produto base** correto da camiseta Gola Canelada (`D000001` / variantes P `0001587`, M `0001588`, G `0001589`, GG `0001590`, XG `0001591`)? A referência anterior `019aa7eb-d437-721a-bc8d-69d5a2754865` serve para este mesmo modelo?
2. Quais são os UUIDs dos produtos-base para ecobag algodão cru (`D000004` M `0000564`, `D000005` G `0000565`) e caneca porcelana (`D000003` branca `0002193`, `D000002` preta `0002194`)?
3. O campo `amount` em `POST /api/Customers/Simulate` deve receber valor de tabela, custo final personalizado com desconto, custo bruto com personalização ou preço da nossa loja? Os descontos das capturas constam como *aplicados no fechamento*, logo não são preço futuro garantido.
4. As dimensões e pesos das fichas do site representam **a caixa/pacote final expedição**, sobretudo canecas, ecobag e camiseta de gola canelada?
5. Qual regra/payload do pacote quando há mais de uma peça ou categorias diferentes no mesmo pedido? Como vincular modalidade de frete escolhida à finalização da produção?
6. **Caneca por sublimação** integra pedidos unitários pela API da conta do lojista? A FAQ pública sugere que a sublimação ocorre em pedidos em quantidade.

Não alterar `VAVI_SHIPPING_PRODUCTS_JSON` sem a resposta confiável e sem preservar a configuração que já gera cotação G. Não habilitar novos pagamentos somente com a existência dos SKUs.

## Pontos pendentes no catálogo Salve Regina

- **SKUs e custos de referência: obtidos dos screenshots**, mas ainda falta confirmar UUID de produto/variação para o endpoint, significado de `amount` na simulação e embalagem final.
- Camiseta: frete real já funciona para G; P/M/GG/XG ainda exigem suas fichas privadas completas.
- Caneca preta, caneca P&B, ecobag M, ecobag G: faltam UUID e configuração logística completa, além de testar cotação real pela API.
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
