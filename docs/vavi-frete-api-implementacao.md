# VAVI: Simulação de frete por CEP (prévia, sem checkout)

Fonte: captura da documentação https://developers.vaviestampas.com.br > Pedidos > Frete > Simular frete (29/10/2026). A documentação expõe `POST https://api.printbee.com.br/api/Customers/Simulate` (ApiClient, empresa logística ID 1).

## Rota da loja

`POST /api/shipping/quote` no Worker, corpo `{"zipCode":"13201000","items":[{"sku":"sku-interno","quantity":1}]}`.

O Worker consulta o banco D1 para exigir produto publicado, verificado e variante habilitada. Depois usa uma configuração PRIVADA e conferida de cada variante para montar o corpo requerido pela VAVI:

```json
{
  "zipCode": "13201000", "amount": 66.83,
  "weight": 0.25, "height": 30, "width": 250, "length": 350,
  "compositions": [
    {"id":"UUID-REAL-DO-PRODUTO-VAVI","sku":"SKU-REAL-VAVI","amount":66.83,
     "quantity":1,"weight":0.25,"height":30,"width":250,"length":350}
  ]
}
```

**Os números do exemplo são ilustrativos, não dimensões/custos confirmados. NÃO copiar o exemplo como configuração de produção.**

A VAVI responde `data[]` com `id`, `name`, `companyId`, `companyName`, `companyImage`, `shippingCost`, `deliveryTime`, `estimatedDeliveryDate`, `message`, `isActive`. Retornamos somente opções ativas e campos saneados. A API também pode retornar “Retirada na Fábrica” com custo zero; avalie se essa opção deve ser exibida no checkout (por padrão ainda sem checkout).

## Configuração (no Cloudflare Worker > Settings > Variables and secrets)

Somente após verificar todos os dados necessários:
- `VAVI_CLIENT_ID`: secret, do painel VAVI Integrações.
- `VAVI_CLIENT_SECRET`: secret, nunca expor ao GitHub ou browser.
- `VAVI_SHIPPING_PRODUCTS_JSON`: secret (objeto por SKU interno), composto de `id` UUID VAVI, `sku` VAVI, `amount` valor de custo de fornecimento em BRL, `weight` kg e `height`/`width`/`length` do pacote em milímetros. Exige documentação do SKU real e dados de embalagem confirmados pela VAVI.

O Worker obtém um JWT com `POST /api/Auth/Token`, `grantType=client_credentials`, e faz a simulação com `Authorization: Bearer ...`. O endpoint não armazena credenciais em código público.

**Não preencher estes segredos sem necessidade, nem enviar seus valores em chats/capturas.** Caso ainda não estejam preenchidos, retorna `503 shipping_not_configured`, e é o resultado esperado.

## Bloqueios para liberar ao público

1. Confirmar ID e SKU real da VAVI da camiseta com frente e costas, preço de produção por variante, e dimensões reais do pacote. A modelagem local do pacote com vários itens ainda precisa de validação.
2. Confirmar se token `ApiClient` obtido funciona com `/api/Customers/Simulate`. Não testado com credenciais reais.
3. Validar a correspondência dos campos da resposta JWT (`data.access_token`) e as mensagens de erro reais.
4. Implementar proteção contra abuso, limites de frequência e cache seguro de cotação, se necessário, antes de expor o endpoint com credenciais.
5. Confirmar eventual prazo de produção além do prazo de transporte e política para mudança de frete entre simulação e criação de pedido.
6. Não ativar Mercado Pago nem pedido VAVI nesta etapa. O catálogo continua vazio até a liberação explícita dos produtos.

### Segurança

Preços do consumidor são sempre consultados no D1, nunca aceitos do navegador. O valor enviado à VAVI para simular frete vem da configuração verificada de custo de fornecimento, não do preço de varejo. Os segredos ficam somente em runtime no Worker.
