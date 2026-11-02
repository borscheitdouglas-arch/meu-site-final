# Checkout real — liberação controlada

## Entregue nesta revisão
- Checkout Pro com página própria no GitHub Pages, inicialmente bloqueada.
- Exibição do link de pagamento na vitrine somente quando `GET /api/checkout/live/readiness` retornar `checkoutEnabled:true`.
- Confirmação de SKU, preço e frete calculada no Worker, nunca no navegador.
- Pedido e endereço cifrado armazenados em D1 antes de criar preferência no Mercado Pago.
- Webhook de produção separado do sandbox: assinatura, consulta de pagamento, moeda, total, referência, `live_mode` e ambiente do pedido verificados.
- Lista administrativa de pedidos pagos protegida por segredo próprio, com leitura do endereço somente sob autenticação.
- Migração `0007_live_checkout.sql` para separar pedidos reais dos testes.
- Testes de integração e sintaxe no GitHub Actions.

## Não habilitar sem confirmar
1. **Implantar código do Worker** correspondente a esta revisão usando credenciais seguras, sem modificar secrets existentes.
2. **Aplicar a migração 0007 no D1**, conferir dados históricos e não sobrescrever pedidos.
3. **Configurar uma chave administrativa nova**: `SHOP_ADMIN_API_KEY` como Secret; documentar um processo privado para consultar e atender pedidos pagos, sem colocá-la em HTML ou no GitHub.
4. **Revisar as condições comerciais**: identificação do vendedor, disponibilidade e custo VAVI, prazo, devoluções/trocas, política de privacidade e retenção LGPD. Criar páginas públicas dessas informações.
5. **Revisar SKU no D1** `salve-regina-preta-g`: confirmar variante e estampas VAVI, preço de R$ 109,90, disponibilizar `products.enabled=1`, `products.verified=1`, `variants.available=1` somente após revisão final.
6. **Verificar webhook real sem criar compra falsa** e validar a entrega de notificações `payment`.
7. **Marcar os flags do Worker como true em sequência, somente após a conferência**: `LIVE_WEBHOOK_ENABLED`, `LIVE_PRODUCT_APPROVED`, `LIVE_POLICY_APPROVED`, `LIVE_CHECKOUT_ENABLED`. Esses flags são de servidor, não devem existir no frontend.
8. **Verificar produto e custo total real** em compra de valor normal, conforme processo autorizado; não simular aprovação de pagamento, não considerar o redirecionamento como prova de recebimento.
9. **Conferir procedimento manual de entrega**: consultar pedidos pagos no backend, conferir endereço protegido, registrar envio na VAVI e acompanhar estorno, cancelamento e rastreio.

## Status atual
As credenciais de produção `MERCADOPAGO_LIVE_ACCESS_TOKEN` e `MERCADOPAGO_LIVE_WEBHOOK_SECRET` foram confirmadas no Cloudflare apenas pelos nomes/tipos; **valores não foram lidos**.

`LIVE_CHECKOUT_ENABLED`, `LIVE_PRODUCT_APPROVED`, `LIVE_POLICY_APPROVED` e `SHOP_ADMIN_API_KEY` ainda não estão configurados. Portanto, a loja permanece bloqueada para cobrança automática.

**Não confundir:** publicar o HTML ou o código do Worker não habilita vendas reais. A liberação exige todos os flags e validações acima. Os pedidos VAVI continuam manuais.


## Auditoria de 01/11/2026 — estado real conferido nas integrações

Verificação somente leitura no Worker `douglas-loja-api` e no banco D1 `douglas-loja-db`:

- Os cinco SKUs da camiseta estão cadastrados, com R$ 109,90 (P, M, G, GG) e R$ 119,90 (XG).
- `products.enabled=0`, `products.verified=0` e `variants.available=0`: **nenhuma variante está aprovada para cobrança**.
- Há segredos cadastrados para Mercado Pago (teste e produção), cifragem do endereço e autenticação da VAVI. Seus valores **não foram consultados nem expostos**; presença do segredo não comprova funcionamento.
- Tabelas de pedidos, entrega cifrada, pagamentos, fila VAVI e rastreamento existem. Há pedidos de homologação `awaiting_payment` no banco; não foram transformados em vendas ou pedidos de produção.
- As flags privadas `LIVE_CHECKOUT_ENABLED`, `LIVE_PRODUCT_APPROVED`, `LIVE_POLICY_APPROVED`, `LIVE_WEBHOOK_ENABLED`, `VAVI_AUTO_DRAFT_ENABLED` não estão configuradas. O checkout permanece fechado.
- **Atualização de 01/11/2026, 23:55 UTC:** o Worker `douglas-loja-api` foi publicado diretamente pelo conector Cloudflare, com o bundle compilado e testado pelo GitHub Actions, sem depender do Mac. A implantação `639efb0c-2285-4125-85bc-a43e17124c1b` usa a versão `790e12d0-1992-41dd-94c0-789cd4ab0a45` a 100%. As 21 vinculações de configuração/segredo continuam presentes e a agenda `*/5 * * * *` foi preservada. O código usa `shipments.cost` e `shipments.mode=not_specified` para declarar o frete separadamente no Checkout Pro. **Isso não habilitou o checkout real**: produtos e variantes continuam desabilitados, e as liberações comerciais continuam pendentes. Os testes automatizados passaram; ainda falta a homologação operacional de frete, pagamento e produção.

### Próximas dependências bloqueadoras — não dispensar sem evidência

1. **Fornecedor:** validar fisicamente os SKUs de tamanho/cor, código da estampa (frente e costas), preço de produção, embalagem, prazo e cotação real de frete por CEP. Para vários itens, obter o contrato de pacote e simulação na VAVI; não somar fretes nem pesos arbitrariamente.
2. **Homologação do pagamento:** testar preferência, redirecionamento e notificação assinada de pagamento, conferir o valor total e idempotência. Não marcar como pago com base apenas na página de retorno.
3. **Produção e logística:** confirmar que o rascunho VAVI pode ser criado para a arte e o endereço escolhidos, e que o operador conseguirá pagar a produção e oferecer rastreio. A integração não elimina o ato de gerar/pagar o pedido na VAVI.
4. **Aprovação comercial:** só depois das confirmações acima atualizar as flags e as linhas aprovadas do D1, uma de cada vez, com registro da validação. Não habilitar produtos ainda não homologados.

### Referências atualizadas

- Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-settings/shipping-cost
- VAVI: https://www.vaviestampas.com.br/guides/integrations
- VAVI: https://www.vaviestampas.com.br/policies/shipping-policy


## Correção do frete VAVI em 02/11/2026 (00:09 UTC)

- Relato do cliente: carrinho com camiseta preta G, CEP de teste `13218752`, retornava "Frete indisponível".
- Reprodução real pela API em produção: HTTP 200 com `options:[]`, embora a VAVI tivesse enviado cinco opções.
- Diagnóstico sanitizado: quatro modalidades de entrega válidas eram descartadas por custos da VAVI com frações de centavo; a quinta era retirada na fábrica e corretamente excluída do frete ao cliente.
- Correção em `src/shipping.js`: normalizar o custo recebido com `Math.ceil(valor * 100 - 1e-8) / 100`; preço de frete sempre em centavos, arredondado para cima menos de R$ 0,01. Permanecem bloqueios para preços negativos/inválidos, prazos inválidos, IDs repetidos e retirada na fábrica.
- Testes do backend (`Vitrine VAVI — validações sem pagamentos`) concluídos com sucesso, bundle testado e publicado no Worker `douglas-loja-api` pelo Cloudflare em `2026-11-02T00:09:15Z`, preservando 21 bindings.
- Verificação ao vivo via navegador da API e da página do carrinho: **4 modalidades de entrega exibidas** para camiseta G e CEP `13218752`: Correios SEDEX R$ 13,69 (8 dias); Loggi Express R$ 15,54 (5 dias); Jadlog .Com R$ 17,13 (7 dias); JeT Standard R$ 21,34 (4 dias). São estimativas mutáveis; transporte não inclui fabricação.
- **Esta correção não aprova produtos, não habilita checkout nem confirma automação de produção.**
