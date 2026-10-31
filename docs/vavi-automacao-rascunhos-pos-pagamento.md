# VAVI — envio automático de rascunhos após confirmação do Mercado Pago

## O que este código implementa

1. Mercado Pago envia um webhook de pagamento de produção assinado.
2. O Worker verifica assinatura, consulta o pagamento diretamente no Mercado Pago e
   confirma `approved`, `live_mode`, pedido, moeda e valor.
3. Só após persistir `status=paid`, um registro da outbox de rascunhos é criado
   (`store_vavi_draft_dispatch`) para pedidos `payment_environment=live`.
4. O Worker tenta enviar o rascunho à API VAVI com o mesmo `code` e
   `requestClientId` baseados no pedido local, e registra o `draftId`.
5. Uma rotina agendada a cada cinco minutos recupera pedidos pagos não
   enfileirados, limitada a três por execução, e tenta os ainda pendentes.
6. Tentativas incertas entram em `needs_review` (ou permanecem `sending`
   se a execução for interrompida). Não há reenvio cego: conferir no painel
   da VAVI, usando o `code` original, antes de qualquer reconciliação.

## Restrições de segurança

- Não cria rascunho se o pagamento não estiver efetivamente persistido como pago.
- A fila não guarda CPF, endereço, dados de cartão ou tokens.
- Dados de entrega são descriptografados somente em memória na função autorizada,
  enviados apenas à VAVI e nunca expostos em logs de falhas.
- **Não inicia produção, não seleciona estampa, não paga a VAVI e não acompanha
  entrega automaticamente**. O portal VAVI informa que a integração recebe
  rascunhos, que precisam vincular produto/arte e gerar o pedido; a fabricação
  começa após pagamento do custo de produção e frete.
- A aprovação fiscal/comercial da loja é independente deste código.

## Pré-requisitos ANTES de habilitar

1. Aplicar a migração `0009_vavi_draft_dispatch.sql` no D1 remoto.
2. Autenticação conferida no arquivo OpenAPI oficial da VAVI fornecido pelo
   proprietário: o Client ID `pb_...` e o Client Secret solicitam o token
   Bearer via `POST /api/Auth/Token` com `grantType=client_credentials`
   e `expires=1`. O sistema reutiliza os secrets privados existentes
   `VAVI_CLIENT_ID` e `VAVI_CLIENT_SECRET` para esse processo.
3. **Não** criar o secret `VAVI_INTEGRATION_API_KEY`: esse nome era baseado
   em uma interpretação equivocada; o `pb_...` não é um access token.
   O Worker deve obter o JWT de curta duração e usá-lo no endpoint de
   pedidos. Ainda é necessário conferir na documentação separada de pedidos
   que `POST /api/Customers/Integrations/Orders` aceita o mesmo tipo de token
   e que o Client ID possui autorização para criar rascunhos.
4. Confirmar o contrato específico do produto/estampa na VAVI e o processo
   financeiro para pagar a produção. Validar em homologação, se disponível,
   antes de envio de cliente real.
5. Realizar revisão final de privacidade, atendimento, política de retenção,
   CPF/CNPJ comercial, preço, custo, prazo e testes de webhook.
6. Só com todo o caminho verificado, configurar
   `VAVI_AUTO_DRAFT_ENABLED=true` no backend (não no cliente).
   **Não ligar junto com mudanças não relacionadas.**
7. Validar observabilidade e tratamento de estados
   `pending`, `sending`, `submitted` e `needs_review`.

## Status ao criar esta revisão

- Código e testes preparados.
- Migração criada, mas ativação da integração **não efetuada**.
- O Client ID e o Client Secret já existiam como secrets privados do Worker;
  seus valores não foram acessados. `VAVI_AUTO_DRAFT_ENABLED` continua ausente/false.
- Não há teste real ponta a ponta com Mercado Pago e VAVI.
- O checkout real permanece desativado.
