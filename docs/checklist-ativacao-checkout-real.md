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
