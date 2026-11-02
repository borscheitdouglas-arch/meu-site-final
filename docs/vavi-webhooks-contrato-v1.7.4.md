# VAVI Estampas — Webhooks v1.7.4 (contrato recebido em 01/11/2026)

## Endpoint da loja
`https://douglas-loja-api.liturgia-gregoriano.workers.dev/api/webhooks/vavi`

Recebedor já implementado em `integrations/vavi-worker/src/vavi-webhook.js`.
A correção para `order.created`, `UnderReview` e conferência de timestamp foi testada
no GitHub Actions e publicada no Cloudflare em 02/11/2026 às 00:17 UTC.
**Publicar código não significa cadastrar o webhook na VAVI nem habilitar seu processamento.**

## Envelopes e autenticidade
- `POST` com JSON: `eventType`, `occurredAt`, `webhookSentId`, `payloadVersion:1`, `data`.
- `X-Webhook-Event` coincide com `eventType`; `X-Webhook-Id` coincide com `webhookSentId`.
- `X-Webhook-Timestamp`: segundos Unix e mesmo instante de `t` no header de assinatura.
- `X-Webhook-Signature: t={timestamp},v1={hex}` com HMAC-SHA256
  de `{timestamp}.{corpo UTF-8 original}` usando o segredo individual `whsec_...`.
- Verificação em tempo constante; janela antirreplay de 5 minutos no Worker.
- A chave deve estar somente no Cloudflare (Secret `VAVI_WEBHOOK_SECRET`).
  Não colar em chat, repositório, HTML, arquivo público ou formulário de cliente.

## Eventos relevantes
- `order.created`: `data.orderId` é UUID; `data.orderNSU` é string `BEE########`;
  `data.status` usa PascalCase. Emissão única na criação, **não** substitui
  `order.status_changed`.
- `order.status_changed`: `data.newStatus` PascalCase e
  `data.previousStatus` pode ser `null`. Aceitar novos valores, incluindo
  `UnderReview`, sem inferir a transição a partir de `previousStatus`.
- `order.tracking`: `data.tracking.orderStatus` em MAIÚSCULAS sem separadores,
  diferente de `order.status_changed`; não converter por simples igualdade.
- `integration_order.converted`, `integration_order.failed`: previstos pelo
  receptor e correlacionados pelo rascunho já enviado por nossa própria loja.

## Entrega, duplicação e dados
- Até 10 tentativas com backoff longo; 4xx normalmente interrompe o reenvio,
  enquanto 408, 425, 429, 5xx e timeout podem ser tratados como transitórios.
- `webhookSentId` é estável no retry e chave primária de
  `store_vavi_webhook_events`; atualizações em `store_vavi_order_tracking`
  só são permitidas para pedidos de produção conhecidos no D1 da loja.
- Retornar 2xx após autenticar e registrar o evento; não criar novos pedidos
  pagos nem alterar o estado do pagamento com base em webhook da VAVI.
- O evento pode chegar fora de ordem; conservar a atualização com data mais recente.
- A conversão de rascunho em pedido de produção e o pagamento à VAVI
  **continuam exigindo conferência operacional do lojista**, de acordo com o
  procedimento acordado; o webhook somente comunica o andamento.

## Configuração ainda pendente
Na inspeção direta do Cloudflare em 02/11/2026:
- `VAVI_WEBHOOK_SECRET` **não** está configurado.
- `VAVI_WEBHOOK_ENABLED` **não** está configurado.
- Não foi encontrado registro comprovado de `CustomerWebhook` da VAVI
  apontando para o endpoint da loja.
Portanto, **o recebimento real de notificações VAVI está desativado**.

Antes de ativar: cadastrar na VAVI um webhook HTTPS com eventos necessários;
obter seu segredo `whsec_...` e guardar como Secret do Worker **sem expô-lo**.
Depois de conferir os eventos e realizar o Ping autenticado, habilitar
`VAVI_WEBHOOK_ENABLED=true` de forma controlada e verificar resposta 2xx.
Evitar cadastrar webhook ativo enquanto o receptor retorna 503 por falta de secret,
pois a VAVI pode tratar algumas falhas como definitivas.

## Política de envio
A VAVI produz sob demanda e envia em nome do lojista. O prazo total estimado
é **produção + transporte**, em **dias úteis**; transporte começa após despacho.
O site foi ajustado para indicar dias úteis nas opções de frete.

Referências:
- Guia público: https://www.vaviestampas.com.br/guides/integrations
- Política de envio: https://www.vaviestampas.com.br/policies/shipping-policy
