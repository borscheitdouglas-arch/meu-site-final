# Mercado Pago — Preparação da integração com a Coleção Salve Regina

Status: **código de testes, sem checkout público**.

## Passo que o proprietário faz no Mercado Pago

1. Entre no portal https://www.mercadopago.com.br/developers/pt e faça login com sua própria conta.
2. Abra **Suas integrações**.
3. Caso não exista aplicação de sua loja, clique em **Criar aplicação**.
4. Identifique como `Douglas Assumpção - Loja` e selecione **Pagamentos online**, **Checkout Pro**, loja própria (não um marketplace, pois o pagamento será recebido pela conta do lojista).
5. Acesse a área **Teste**. Não ative a produção neste momento.
6. **Não envie** por chat, screenshot, e-mail ou GitHub: Access Token, Client Secret, assinatura de Webhook ou senhas. Esses valores serão configurados posteriormente apenas como *secrets* do servidor Cloudflare.
7. Se já houver uma aplicação da loja para Checkout Pro, evite criar duplicada: reutilize a existente depois de verificar seu propósito.

Documentação oficial:
- Criar aplicação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/create-application
- Checkout Pro: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/overview
- Preferências: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications

## Código existente

- `src/mercadopago.js`: gera o corpo da preferência a partir de **pedido persistido, valores e frete verificados**, obtém a URL do Checkout Pro e consulta status de pagamento com confirmação de código, valor, moeda, conta e ambiente.
- `src/mp-webhook.js`: valida uma assinatura HMAC SHA-256 de notificação, usando `x-signature`, `x-request-id`, `data.id` e conferindo frescor do timestamp.
- `test/mercadopago.test.js`: testes simulados, sem requisições reais, sem pagamentos e sem dados pessoais.
- `src/index.js`: **não expõe rota de checkout ou webhook**, nem importa módulos de pagamento. Continuará assim até concluirmos a infraestrutura.

## Fluxo previsto (não implantado)

1. Frontend envia `sku` e quantidade; backend consulta catálogo aprovado e calcula itens.
2. Backend calcula frete REAL conforme disponibilidade da VAVI, recebe dados de destino e registra pedido persistido com acesso restrito.
3. Servidor cria preferência pelo `POST /checkout/preferences`. Envia pedido de forma idempotente, persiste ID e devolve ao navegador a URL de pagamento.
4. Cliente paga **no Mercado Pago**. O retorno do navegador é apenas informativo.
5. Servidor recebe Webhook no HTTPS, valida assinatura e timestamp, consulta `GET /v1/payments/{id}`, confere `external_reference`, moeda BRL, total em centavos e `collector_id` do vendedor.
6. Processamento idempotente registra `approved` no pedido, evita envio duplo e aciona o adapter `src/vavi.js` para criar rascunho na VAVI.
7. A VAVI recebe rascunho; você confere produto, frente/costas e frete, paga a produção. Acompanhamento posterior exige consulta segura e política de falhas.

## Secrets futuros do Cloudflare Worker

Guardar apenas em **secrets/variáveis privadas** do ambiente seguro, nunca em HTML, JavaScript público, GitHub nem capturas:

- `MP_ACCESS_TOKEN`: Access Token de teste ou produção correspondente ao ambiente.
- `MP_WEBHOOK_SECRET`: Assinatura secreta de Webhooks da aplicação.
- `MP_SELLER_ID`: Identificador do recebedor para validação de pagamento.
- `MP_ENVIRONMENT`: ambiente declarado `test` ou `production`.
- `MP_RETURN_BASE_URL`: domínio HTTPS público da loja.
- `MP_NOTIFICATION_URL`: HTTPS público do backend configurado para receber webhooks.
- `VAVI_CLIENT_ID` / `VAVI_CLIENT_SECRET`: apenas backend para autenticação VAVI.

**Atenção:** nenhuma dessas variáveis deve ser pedida ao usuário por chat. Configurar dentro do serviço autorizado, quando criarmos seu Worker.

## Pendências que bloqueiam ativação

- [ ] Valores e tamanhos confirmados no painel VAVI, com impressão frente e verso.
- [ ] Frete calculado e aprovado antes de criar preferência.
- [ ] Artes de produção e mockups fiéis finalizados.
- [ ] Aplicação de teste do Mercado Pago criada/identificada.
- [ ] Worker Cloudflare implantado com D1 e segredos somente do ambiente de teste.
- [ ] Persistência transacional de pedidos, webhook idempotente, controle de duplicidade, reembolso e erros.
- [ ] Validação de comprovante real com conciliação contábil e logística.
- [ ] Testes completos de ponta a ponta em conta comprador de teste.
- [ ] Políticas comerciais e tratamento de dados pessoais revisados.

**Regra:** por padrão qualquer dúvida de valor, origem, destino, estoque, pagamento ou estado bloqueia o envio do rascunho.
