# Loja única — livros, camisetas, partituras e peças autorais

## Objetivo
Manter todos os produtos na página `/pages/loja.html`, sem exigir uma segunda loja ou modificar o domínio do site.

## Estado conferido em 30/10/2026
- O site está em GitHub Pages; o catálogo estático vem de `content/store-products.json`.
- O livro **O Canto Como Mística** já aparece como publicado e direciona para Amazon e UICLAP.
- A **Camiseta Salve Regina** está cadastrada como rascunho. Sua venda não está liberada.
- O Worker `douglas-loja-api` e o D1 `douglas-loja-db` estão separados do site estático.
- O checkout `POST /api/checkout/test` é privado e de homologação; **não é checkout público**.
- Não habilitar cobrança de produção, entrega de PDFs, ou envio de pedidos VAVI sem fluxo completo, incluindo confirmação autenticada, idempotência e entrega.

## Campos do catálogo
- `status: "draft"`: não aparece no site.
- `status: "published"`: aparece após preencher todos os campos e validar imagem local.
- `product_type`: `book`, `apparel`, `digital`, `3d`, `partner` ou `other`.
- `purchase_mode: "external"`: exige `retailers` com links HTTPS. O visitante finaliza a compra na loja externa.
- `purchase_mode: "contact"`: usa somente a página interna de contato, com aviso explícito de que **não existe pagamento online** nessa modalidade.
- `purchase_mode: "checkout"`: **bloqueado intencionalmente** até a integração comercial estar completa; o gerador recusará a publicação.
- Sem `product_type` e `purchase_mode`, catálogos antigos continuam assumindo `book` e `external`.

## Plano de publicação
1. **Vitrine multiclasse**: validar as páginas, imagens, descrições, categorias e rascunhos sem criar cobranças.
2. **Produto físico VAVI**: confirmar arte, SKU, variações, custo, prazo, regras de frete, produção e devolução. A peça só fica disponível após esses dados.
3. **Pagamento real**: configurar credenciais de produção separadas; conferir parcelas, taxas, políticas, antifraude, conciliação e webhook assinado; calcular preço e frete exclusivamente no backend.
4. **Pedido e entrega**: gerar pedido após verificação do pagamento, não pela página de retorno; criar rascunho VAVI somente após aprovação; manter uma etapa manual de revisão até o processo ser confiável.
5. **Partitura digital**: entregar arquivo mediante autorização de pagamento do servidor, com URL expirada e download protegido. Não publicar PDF pago como arquivo aberto.
6. **Peças 3D**: validar prazo, estoque ou produção sob demanda, opções de entrega e frete; seguir o mesmo circuito de pagamento/entrega com um fulfillment distinto.
7. **Produtos de parceiros**: manter links externos identificados; não misturar esses itens no carrinho de pagamento próprio.

## Como validar a primeira etapa
```bash
python3 tools/generate_store.py --check
python3 -m unittest discover -s tools -p test_store_catalog.py
```

O próprio gerador bloqueia produto sem imagem local, links externos inseguros e tentativa de ativar o `checkout` direto antes da integração.

**Regra operacional:** nenhuma alteração nesta etapa libera o produto, cria uma cobrança real ou gera pedido na VAVI.
