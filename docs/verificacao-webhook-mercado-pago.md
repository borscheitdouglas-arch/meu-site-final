# Verificação segura do Mercado Pago (código preparado)

O módulo `src/payment-verification.js` implementa as verificações que antecedem a mudança de um pedido para pago:

1. Ler `x-signature`, `x-request-id` e `data.id` da notificação.
2. Verificar assinatura HMAC-SHA256 conforme manifesto oficial `id:...;request-id:...;ts:...;` e conferir janela temporal.
3. Consultar `GET /v1/payments/{id}` na API Mercado Pago com Access Token no Worker, **nunca** confiar no texto do webhook nem na URL de retorno.
4. Comparar pagamento aprovado, BRL, `external_reference` do pedido e valor em centavos antes de fazer alteração no banco.

Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications

**Ainda não conectado à rota pública.** Não configura `/api/payments/webhook`, não grava pagamento no banco, não cria pedidos nem inicia produção VAVI. É necessário implementar um fluxo transacional e idempotente de eventos e persistência antes de expor o webhook.

## Configuração futura (NÃO inserir valores no GitHub)

- `MERCADOPAGO_TEST_ACCESS_TOKEN`: Access Token de teste, Secret no Cloudflare.
- `MERCADOPAGO_WEBHOOK_SECRET`: assinatura secreta gerada nas configurações de Webhooks do painel Mercado Pago, Secret Cloudflare.
- Em produção, guardar tokens e secrets separados e passar por testes e auditoria.

Manter checkout inativo até concluir modelo de pedidos, frete VAVI validado, integração da API e testes ponta a ponta.
