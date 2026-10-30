# Cadastro inicial D1 — Coleção Salve Regina

O banco D1 `douglas-loja-db` já foi criado pelo proprietário e vinculado ao Worker por `DB`. O esquema `products` e `variants` também já foi criado.

## O que executar no console do D1

Copiar o arquivo `integrations/vavi-worker/seed-salve-regina-drafts.sql` no Console do banco Cloudflare e clicar em Execute uma vez. Esse arquivo usa `INSERT OR IGNORE` e não apaga dados existentes.

Depois, executar:

```sql
SELECT id, name, enabled, verified FROM products ORDER BY sort_order;
```

Resultado esperado: três linhas com `enabled = 0` e `verified = 0`.

## Importante

- Estes registros são **rascunhos**, ainda sem variações e sem preços.
- `GET /api/catalog` **continua retornando `products: []`** porque o backend só mostra produtos com as flags `enabled = 1`, `verified = 1` e variantes disponíveis.
- Não adicionar preços arbitrários para vencer a restrição de `variants.price_cents > 0`.
- Artes ainda devem ser finalizadas para impressão; os SVGs indicados em `image` são ilustrações da vitrine, não arquivos de produção.
- Antes da venda confirmar na VAVI: frente e verso, quantidades, técnica, custos reais, tamanho/cor, frete, prazos e caneca preta.
- Checkout Mercado Pago e criação de pedidos VAVI ainda não estão ativos.

## Próximo passo técnico

Após validação da VAVI, cadastrar variantes com SKUs específicos e preços reais em centavos e executar testes de frete, preço e pagamento antes de habilitar os produtos.
