## Frete de vários itens no mesmo carrinho — implementação 03/11/2026

**Mudança:** o carrinho envia `{zipCode,items:[{sku,quantity},...]}` a `POST /api/shipping/cart-preview` (só para SKUs de peças VAVI já cadastradas e com preço conferido no D1). A API valida cada item, quantidade máxima de 10 por variação, até 15 linhas/30 unidades; consulta o custo da VAVI e SKU do fornecedor de uma tabela **privada**, nunca do cliente.

A consulta de frete `POST /api/Customers/Simulate` da VAVI recebe uma lista `compositions[]` contendo cada produto/quantidade e medidas por unidade publicadas, valor total das mercadorias (custo observado, não preço de varejo) e peso total. **Não inventamos as dimensões da caixa final**: o payload conjunto omite `height`, `width` e `length` do pacote completo, pois a VAVI não confirmou a regra de acondicionamento.

**Teste de leitura real** em 03/11/2026: https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/41645789934 — HTTP 200 com opções de entrega para **duas camisetas, camiseta+caneca, duas ecobags e duas canecas** no CEP de teste `01001000`. Comparação de camiseta+caneca enviada com e sem `compositions` retornou preços iguais; isso demonstra que a API aceita a requisição, mas **não comprova embalagem otimizada nem preço final de expedição**. Não somar fretes individuais como se fosse o frete do pacote.

**Regra de segurança:** resultados sempre `provisional:true`, `packageConfirmed:false`, `checkoutEnabled:false`; o carrinho exibe frete estimado para a cesta e subtotal orientativo, com aviso de que não autoriza pagamento. O checkout Mercado Pago continua restrito a uma peça aprovada e revalidada no servidor. Só liberar várias peças quando embalagem, valor declarado e preço final de expedição estiverem homologados. A loja não precisa mostrar o nome VAVI ao comprador.

**Moletom removido a pedido do lojista:** não aparece no catálogo, vitrine, categoria, página individual ou carrinho; nenhuma ficha logística para moletom é autorizada. As artes não foram apagadas.

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

## Atualização operacional — calculadora de canecas/ecobags (02/11/2026, 23h16 UTC)

**Código do PR #71 incorporado ao `main`**, bundle testado e publicado no Cloudflare Worker `douglas-loja-api` em 02/11/2026 às 23h15 UTC, com as **27 configurações/segredos preservados**.

- API `POST /api/shipping/preview` funciona também para as quatro variantes de canecas e ecobags.
- Quando não há ficha logística VAVI completa, o servidor utiliza **somente** os dados de uma peça da ficha pública (peso/dimensões) e custo observado em tabela **privada** D1 para consultar `/api/Customers/Simulate` **sem UUID**.
- A resposta recebe `provisional:true` e `checkoutEnabled:false`; vitrine, produto e carrinho mostram aviso de simulação orientativa. Os valores de custo internos **não são retornados** à interface.
- Se a peça estiver cadastrada com ficha logística completa e validada, a consulta normal com UUID tem precedência; camiseta G mantém fluxo já existente.
- Preço de frete de prévia **não libera** um produto para venda. O checkout permanece sujeito a validações próprias do preço, D1 e cadastro logístico completo. Pedidos com mais de uma peça permanecem sem cotação automática até validar embalagem conjunta.

**Prova real pós-publicação**: https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/41544098194

CEP de teste público `01001000` em São Paulo, menor serviço de transporte obtido:

| Peça | HTTP | Menor frete | Opções válidas | Prévia? |
|---|---:|---:|---:|---|
| Camiseta preta G | 200 | R$ 10,78 | 4 | Não, consulta previamente configurada |
| Ecobag M | 200 | R$ 10,20 | 4 | Sim |
| Ecobag G | 200 | R$ 10,22 | 4 | Sim |
| Caneca P&B | 200 | R$ 10,63 | 4 | Sim |
| Caneca preta | 200 | R$ 10,74 | 4 | Sim |

Nenhum pedido/pagamento criado; taxas variam por CEP, embalagem, valor declarado, transportadora e data. **Ainda falta confirmar** se os dados de embalagem do catálogo representam o volume final; se o `amount` deve refletir custo B2B (observação atual), preço de venda ou valor segurado; e se a caneca unitária pode ser fabricada via integração. Esses itens devem ser validados antes de permitir cobrança.

**Validações automáticas:** testes de API e segurança passaram. O teste geral de vitrine do GitHub continua falhando numa exigência antiga sobre a visibilidade do friso `.shop-ribbon`, anterior à mudança de frete, após a atualização intencional do cabeçalho; não confundir esse resultado com falha de cotação VAVI.

## Segundo teste real da VAVI: embalagem e valor mudam a tarifa (02/11/2026, 23h05 UTC)

Evidência: https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/41542548293

Foram **12 chamadas reais sem UUID e sem compositions** ao endpoint de simulação da VAVI, com dois CEPs públicos de teste: `01001000` (SP) e `20040020` (RJ). Para comparar embalagens em igualdade de condições, todas as primeiras chamadas usaram **R$ 50 de valor declarado apenas para o experimento**. Nenhum pedido ou pagamento foi criado.

| Teste (R$ 50 declarados) | Express SP | Express RJ |
|---|---:|---:|
| CEP + valor, sem dimensões | R$ 10,58 | R$ 15,53 |
| Ecobag 0,2 kg, 250×250×10 mm | R$ 10,58 | R$ 15,53 |
| Camiseta 0,25 kg, 300×250×10 mm | R$ 10,58 | R$ 15,53 |
| Caneca 0,5 kg, 150×200×100 mm | R$ 10,88 | R$ 15,54 |
| Pacote de controle **hipotético** 3 kg, 450×350×300 mm | R$ 46,93 | R$ 50,78 |

Mudando **apenas** o valor declarado de R$ 50 para R$ 300 para a caneca, o Express passou de R$ 10,88 a R$ 13,93 (SP) e de R$ 15,54 a R$ 18,84 (RJ).

**Conclusões comprovadas:** VAVI aceita simulação sem UUID; peso, dimensões e valor total das mercadorias influenciam a cotação (em algumas faixas as tarifas podem coincidir); CEP muda serviços e preços. **Não se comprovou** se valor declarado para lojista é custo B2B, valor de seguro ou preço final de venda e se as embalagens públicas representam a caixa final de expedição.

**Resultado técnico desta revisão:** prévias podem ser emitidas para caneca e ecobag mesmo sem UUID, usando ficha pública e custos observados guardados em D1 **somente como simulação orientativa**. O backend informa `provisional:true` e `checkoutEnabled:false`; a venda continua bloqueada por ausência de aprovação D1 e configuração completa para cobrança. O carrinho e a página individual devem avisar que não é valor garantido.

O teste temporário foi removido após a execução; o bundle normal foi restaurado em 02/11/2026 às 23h06 UTC, com 27 bindings mantidos.

## Verificação pública da API de frete — 02/11/2026, 22h32 UTC (documento oficial v1.1.2)

O workflow GitHub `VAVI - conferir contrato publico de produto e frete` conseguiu ler o OpenAPI oficial publicado em:
`https://developers.vaviestampas.com.br/openapi/orders.json`.

Execução registrada: https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/41538132313

**Contrato `POST /api/Customers/Simulate`:**
- `SimulateRequest.required = ["zipCode", "amount"]`.
- `zipCode`: CEP destino.
- `amount`: **"Valor total das mercadorias em reais"** (descrição literal do esquema oficial).
- `weight`: peso total (kg), opcional no schema.
- `height`, `width`, `length`: dimensão do **pacote em mm**, opcionais no schema.
- `compositions`: lista de itens do pedido, opcional no schema.
- Cada `SimulateItemModel` permite `id` (UUID, opcional no schema), `sku`, `amount` ("Valor"), `quantity`, `weight` (kg) e dimensões (mm). O esquema não declara propriedades obrigatórias para o item.
- Resposta `SimulationModel`: `id`, `name`, `companyId`, `companyName`, `shippingCost`, `deliveryTime`, `estimatedDeliveryDate`, `message`, `isActive`.

**Consequência prática:** no contrato publicado, UUID e `compositions` NÃO são obrigatórios para formar a requisição. Isso **não prova** que o serviço real calcula todas as transportadoras com apenas CEP e valor. Uma consulta real segura deve verificar combinações com peso/dimensões e `compositions` omitida antes de alterar as validações existentes no Worker. **Não inventar UUID nem deduzir que pode omitir dados de embalagem de todos os pedidos.**

**Ponto ainda não esclarecido pelo contrato:** a expressão "valor total das mercadorias" não diz se a conta de lojista deve passar preço de produção bruto, preço com descontos de fabricante, ou preço de varejo da nossa loja. O item `amount` é descrito somente como "Valor". Validar o valor correto em contexto de pedido B2B.

O arquivo oficial `openapi/products.json` não foi analisável pelo workflow (resposta não era JSON legível), e a página do produto por UUID anterior não respondeu. Portanto, não foi possível verificar publicamente o UUID da camiseta Gola Canelada ou os de ecobags/canecas.

**Fontes da investigação pública:**
- https://www.vaviestampas.com.br/products/all — mostra camiseta 30.1 Penteado e camiseta 30.1 Penteado Gola Canelada como dois modelos distintos.
- https://www.vaviestampas.com.br/products/acessorios/ecobag_algodao_cru — ecobag M/G selecionáveis, SKU-base 0000564, 0,2 kg, pacote 250 × 250 × 10 mm, mínimo 1 peça.
- https://www.vaviestampas.com.br/products/brindes/caneca_porcelana — SKU-base 0002193, 0,5 kg, pacote 150 × 200 × 100 mm, sublimação e mínimo 1 peça na loja.
- https://www.vaviestampas.com.br/about/faq — FAQ descreve sublimação como pedidos em quantidade fora do POD DTF/DTG; logo, compra avulsa no site ≠ habilitação de caneca unitária no canal de integração.
- https://www.vaviestampas.com.br/policies/shipping-policy — frete dinâmico por CEP, peso e dimensões do pacote.

## Teste real da API sem UUID — **APROVADO EM TRÊS FORMAS** (02/11/2026, 22h39 UTC)

**Evidência reproduzível do resultado:** https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/41539105729

O teste ocorreu diretamente no Cloudflare Worker da loja, usando credenciais privadas VAVI já configuradas, e executou `POST https://api.printbee.com.br/api/Customers/Simulate` para **CEP público de teste 01001000** (Praça da Sé, São Paulo). Nenhum pedido, pagamento, alteração de design ou produção foi criado.

Foram enviadas três variações de payload para **ecobag M**, usando o valor de mercadoria `R$ 19,50` observado no painel e medidas públicas de `200 g, 250 × 250 × 10 mm`:

1. **CEP + amount apenas** (`zipCode:01001000`, `amount:19.50`): **HTTP 200**, 5 opções brutas, 4 entregas ativas.
2. **CEP + amount + peso + dimensões, sem UUID e sem compositions**: **HTTP 200**, as mesmas 4 modalidades e preços.
3. **CEP + amount + peso + dimensões + composition com SKU 0000564, mas sem UUID**: **HTTP 200**, mesmas modalidades e preços.

**Cotações retornadas nas três cargas:** Express R$ 10,20 (4 dias), SEDEX R$ 13,18 (4 dias), Standard R$ 19,53 (4 dias), .Com R$ 17,25 (7 dias). A opção de retirada da fábrica foi excluída da apresentação de entregas.

**Interpretação cuidadosa:** a API REAL aceita consulta de frete sem UUID do produto. **Não foi provado ainda** se ignorou peso/dimensões para esse CEP/serviço, se são tarifas de mínimo, se o valor de `amount` deveria ser preço do fornecedor ou varejo, nem se o preço será idêntico ao frete confirmado ao gerar produção. Portanto, não chamar estes valores de frete garantido para todos os clientes ou assumir que qualquer item tem embalagem intercambiável.

O código temporário de diagnóstico no Cloudflare Worker foi **restaurado ao bundle original** às 22h40 UTC, preservando 27 bindings/segredos. O workflow temporário de disparo foi removido do GitHub e a tabela de bloqueio de execução única apagada; a **evidência do run permanece**. O checkout e as regras de produção existentes não foram alterados.

**Próxima validação necessária:** testar separadamente payloads de caneca (500 g; 150 × 200 × 100 mm; valor atualizado da cor), camiseta e ecobags G, além de um pacote com itens mistos, comparando respostas. Só depois considerar fallback de cotação sem UUID no Worker. Manter a verificação de produto antes de cobrar e reconciliar embalagem/valor com a VAVI.

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
