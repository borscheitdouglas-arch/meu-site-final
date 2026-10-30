# Contrato VAVI — criação de rascunho da integração

Confirmado na documentação oficial exibida no portal de desenvolvedores da VAVI (30/10/2026):

- POST https://api.printbee.com.br/api/Customers/Integrations/Orders
- Authorization: Bearer <token ApiClient>
- Campos: code (obrigatório, chave de deduplicação); requestClientId (opcional); buyer (obrigatório: nome, email, telefone, CPF/CNPJ, endereço); status, freightAmount, paidAmount (opcionais); items[] (obrigatório: nome, quantidade, sku e preço unitário se disponíveis); properties[] (opcional).
- Resposta HTTP 202, com data.draftId, status=Pending, deduplicated.
- Os itens são dados da loja e **não** são IDs de produto do catálogo VAVI. O lojista associa produto interno, tamanho/cor, arte e frete no portal antes da produção.

Implementado o construtor puro src/vavi-order-contract.js, com verificações de pedido pago, referência Mercado Pago persistida, valores e dados de entrega; acompanhado de testes simulados.

**Ainda não operacional:** nenhuma rota pública cria rascunhos. Falta capturar e armazenar dados pessoais com regras LGPD, consultar autenticadamente o pagamento no webhook, persistir mudança para paid com idempotência, acionar uma fila/rotina de pedido e verificar resultados da VAVI. A API não recebeu pedidos reais.

O pedido de teste não deve ser feito com credenciais reais ou dados de comprador fictícios na API de produção sem consentimento e um mecanismo de limpeza confirmado.
