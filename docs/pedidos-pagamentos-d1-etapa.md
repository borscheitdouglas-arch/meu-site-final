# Pedidos D1 + estado do pagamento (etapa preparatória)

Esta etapa adiciona a migração `0001_store_orders.sql`, regras puras de estado e testes.

**Não cria cobranças, não executa migração no banco remoto e não envia pedidos à VAVI.** Não foi adicionada nenhuma rota pública de pagamento ou webhook. A API segue em `mode=preview`.

## Esquema previsto

- `store_orders`: número interno, estados, totais em centavos, CEP de destino, referência de cotação e IDs externos únicos de Mercado Pago/VAVI;
- `store_order_items`: itens e preços registrados no momento da compra;
- `store_payment_events`: chave de deduplicação de eventos, necessária porque a notificação pode ser repetida.

## Regras

- Pedido precisa passar `draft -> awaiting_payment -> paid`, nunca direto para produção a partir do navegador;
- A confirmação deverá buscar o pagamento pelo acesso de backend e comparar status `approved`, moeda BRL, referência interna e valor exato;
- Os preços de produtos e frete serão calculados no servidor, não aceitos do navegador;
- Produção VAVI somente após pagamento confirmado e pedido validado;
- Dados pessoais não são armazenados nesta fase; endereço de entrega requer modelagem LGPD e política de retenção.

## Pendências para operação

1. Verificar disponibilidade do produto VAVI, SKU/arte/embalagem e cotação de frete real;
2. Implementar criação de pedido persistida com idempotência e consistência transacional D1;
3. Integrar `POST /checkout/preferences` usando Access Token de **teste** em segredo Cloudflare;
4. Validar notificação Mercado Pago com assinatura e consulta autenticada do pagamento, proteger contra replay e duplicatas;
5. Conectar pedidos de integração VAVI e definir se há liberação manual de rascunho;
6. Exercitar testes end-to-end e, somente depois, criar credenciais produtivas e habilitar vendas.

## Operação futura

Migration prevista no repositório, **não executar agora**. Aplicação remota de migration exige janela de implantação e backup. Fluxo orientativo, após revisão:

`cd integrations/vavi-worker && npx wrangler d1 migrations apply douglas-loja-db --remote`

Antes de aplicar, validar nomenclatura e diretório conforme Wrangler atual. O schema SQL não foi aplicado pelo workflow de CI.
