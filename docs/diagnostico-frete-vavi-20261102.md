# Diagnóstico objetivo do frete VAVI — 02/11/2026

## O que foi confirmado

* Loja: https://www.douglasassumpcao.com.br/pages/loja.html
* API: `https://douglas-loja-api.liturgia-gregoriano.workers.dev`.
* Cloudflare Worker `douglas-loja-api`, banco `douglas-loja-db`, binding `DB` existentes.
* Os secrets `VAVI_CLIENT_ID`, `VAVI_CLIENT_SECRET` e `VAVI_SHIPPING_PRODUCTS_JSON` existem (valores não foram lidos ou compartilhados).
* `GET /health` retornou 200 `mode=preview`; `GET /api/store/readiness` retornou `database=true` e `freight=true`. **Isso apenas significa presença de configuração**, não todos os produtos configurados.
* Teste real via GitHub Actions, endereço do Worker, Origin oficial e User-Agent identificado:
  https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/41469203678
  * P, M, GG, XG: HTTP 409 / `shipping_product_unverified`.
  * G: HTTP 200, 4 serviços para CEP público de teste `01001000`.
  * Cotações G: Express R$10,78/4d; SEDEX R$13,69/4d; Standard R$20,20/4d; .Com R$17,25/7d (transporte, não produção).
* A simulação para G executou autenticação e chamada VAVI reais, não mocks locais.
* Uma tentativa inicial de teste sem User-Agent identificado recebeu Cloudflare 1010 para até `/health`. Esse bloqueio era do cliente automatizado e **não prova falha do Safari do usuário**. A correção foi definir um User-Agent descritivo, conforme https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/.
* A tabela D1 `store_vavi_diagnostic` registra um sucesso em 30/10/2026, com Standard e .Com. Sem alterar registros.

## Causa do frete indisponível para quatro tamanhos

A função `shippingPayload` em `integrations/vavi-worker/src/shipping.js` exige, por SKU interno, entrada em `VAVI_SHIPPING_PRODUCTS_JSON` com `id` UUID VAVI, `sku` do fornecedor, `amount` BRL, `weight` kg, `height/width/length` mm. As quatro variantes não têm entrada válida na configuração atual, razão do HTTP 409. Isso é distinto de credencial inválida (G está funcional).

Preços públicos já cadastrados no D1: P/M/G/GG R$109,90; XG R$119,90. Preços públicos NÃO devem ser confundidos com custo de fabricação usado para simular frete.

Informações já discutidas: design D000001, modelo camiseta preta algodão 30.1 penteado, DTF frente e costas. O usuário viu SKU da variante GG `0001590` e XG `0001591`, com custos observados de R$70,71 e R$82,35; P/M ainda não confirmados. Base do produto fornecida pelo suporte: UUID `019aa7eb-d437-721a-bc8d-69d5a2754865`, peso 0,25 kg, dimensões 300x250x10 mm. **Esses dados do modelo base não constituem validação automática da embalagem de cada tamanho, e GG/XG exigem reconferência antes de gravar nos secrets.**

## Mudanças feitas na vitrine

* `scripts/store-shipping-calculator.js`: erros específicos da API passam a ser explicados no formulário.
* `scripts/cart-shipping.js`: erros específicos são mostrados no carrinho, sem fabricar preço.
* `scripts/product-detail.js`: informa quando a variação está sem dados logísticos.
* URLs dos scripts com versão alterada para renovar cache em `pages/loja.html`, `pages/cart.html` e `pages/produto-loja.html`.
* Pagamentos e criação de pedidos não foram liberados.
* Scripts de testes e OpenAPI público coletados em workflows do GitHub; sem credenciais em logs.

## Como concluir sem refazer a instalação

1. Obter da VAVI a **ficha logística da camiseta preta personalizada D000001, P/M/GG/XG**, com identificação VAVI por variação, SKU para simulação, custo unitário para `amount`, peso de expedição e dimensões do pacote de uma peça, confirmação se os dados-base 0,25 kg e 300x250x10 mm valem para todos os tamanhos.
2. Preservar **a entrada G que já funciona**. Completar o secret `VAVI_SHIPPING_PRODUCTS_JSON` com as quatro variantes, só com valores fornecidos/confirmados; nunca colar as credenciais ou JSON secreto em tickets públicos.
3. Reexecutar o workflow `VAVI - prova real de frete (sem pedidos)` após atualizar a configuração, e exigir HTTP 200 com opções reais para P/M/G/GG/XG.
4. Frete de mais de uma peça é um segundo problema: `shippingPayload` deliberadamente rejeita quantidades acima de 1 enquanto a VAVI não confirmar dimensões e peso do *pacote do pedido*. A API oficial recebe `compositions[]`, mas isso não autoriza agregar embalagens sem regra do fornecedor.
5. Só depois homologar total, Mercado Pago e envio à fábrica; não habilitar checkout pela simples presença de cotações.

## Contrato oficial conferido

`POST https://api.printbee.com.br/api/Customers/Simulate`; OpenAPI público `https://developers.vaviestampas.com.br/openapi/orders.json` v1.1.2. Exige `zipCode` e `amount`; aceita peso e dimensões do pacote e lista de `compositions`. O contrato de JSON sozinho **não certifica que a embalagem, variação e preços de produção estão validados**.
