# Integração Mercado Pago Checkout Pro — em preparação

**Estado:** scaffold técnico apenas. **Não há cobrança, redirecionamento de checkout ou webhook ativo.** Pagamentos permanecem desabilitados em /health e /api/quote.

## Confirmações

- Aplicação do usuário: **Douglas Assumpção - Loja**, modalidade **Checkout Pro**, com credenciais de teste disponíveis.
- Documentação oficial: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post
- `POST https://api.mercadopago.com/checkout/preferences` com `Authorization: Bearer ACCESS_TOKEN`, `items`, `back_urls`, `external_reference`, `notification_url`; resposta `init_point` para redirecionamento.
- URLs de retorno não provam pagamento aprovado. A confirmação deve vir do backend consultando o pagamento no Mercado Pago, recebendo notificações verificadas, e comparando valor, referência e credenciais.

## Implementado

- `src/mercado-pago.js`: constrói um payload com preços e frete já confirmados no backend (nunca no navegador), referência interna do pedido, URLs HTTPS e webhook; valida redirecionamento `init_point`.
- `src/mercado-pago.test.js`: valida preço, frete, HTTPS e bloqueios de segurança.

## Ainda obrigatório para disponibilizar checkout

1. Registrar o pedido e os itens com estado inicial no D1, com identificador não adivinhável, e evitar pagamento duplicado usando idempotência do lado servidor.
2. Integrar cotação real de frete da VAVI. Produtos continuam desativados até que códigos, peso, dimensões, estoque, preço e arte estejam conferidos.
3. Disponibilizar checkout de teste **somente após** persistência do pedido e preço de frete. O Worker deve usar um segredo `MERCADOPAGO_TEST_ACCESS_TOKEN`, guardado em Cloudflare Settings > Variables and secrets como **Secret**, nunca no GitHub; credenciais de produção separadas.
4. Enviar pedidos após confirmação autenticada do Mercado Pago, e impedir duplicidade (webhook pode repetir); não confiar em query string de retorno ou notificação sem validação.
5. Confirmar na VAVI se a API só cria rascunho exigindo liberação manual antes da produção, frete selecionado e arte vinculada.
6. Endpoints futuros: `POST /api/checkout`, `POST /api/payments/webhook`, `GET /api/orders/:id`. **Ainda não existem**.
7. Habilitar fluxo real apenas após testes de ponta a ponta e verificação de taxas, política de entrega, devoluções e dados pessoais.

## Fluxo pretendido

Navegador -> Worker (preço e frete calculados pelo servidor, pedido salvo em D1) -> preferência Checkout Pro em modo de teste -> página segura Mercado Pago -> webhook autenticado e verificação de pagamento -> rascunho VAVI -> conferência/liberação -> rastreio.

A mensagem de retorno ao navegador nunca autoriza produção.

## Passo do usuário

No painel Mercado Pago, **permanecer aqui** no assistente enquanto SDK e preferências ainda não foram implementados. Não marcar “Já fiz isso” como concluído e não inserir secrets até que a integração protegida esteja pronta.
