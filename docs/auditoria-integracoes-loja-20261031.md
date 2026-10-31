# Auditoria das integrações da loja — 31/10/2026

Base inspecionada: `main` no commit `1ca851cfe84b503f87e2b16ca1c028ca0e6161ab`, conferido no GitHub. Trabalho na branch `feat/loja-premium-20261031`. Esta auditoria não altera backend, banco, credenciais, preços, disponibilidade ou flags de produção e não envia pedidos a fornecedores.

## O que já existe

| Área | Implementação atual | Limite operacional |
| --- | --- | --- |
| Loja pública | HTML/CSS/JS estáticos; livro com links Amazon/UICLAP; camiseta preta G com consulta de frete e mensagem de compra assistida | Moletom e caneca continuam em preparação; a consulta não cria compra |
| Catálogo | `content/store-products.json` e gerador da livraria; catálogo VAVI e variações D1 filtrados por aprovação/disponibilidade | Não presumir que uma imagem de prévia representa produto aprovado |
| Frete | Worker autentica na VAVI, consulta cotação e filtra retirada na fábrica | Preço e prazo precisam corresponder à variante, arte e embalagem efetivas |
| Checkout | `checkout-live.js` valida SKU, quantidade, preço no banco, endereço e frete no servidor | Somente uma camiseta preta G por pedido; produção depende de várias liberações explícitas |
| D1 | Pedido, itens, eventos de pagamento e endereço cifrado em tabelas separadas | Estado das migrações remotas não foi consultado nesta auditoria |
| Mercado Pago | Preferência com referência do pedido; endereço é persistido antes da preferência | Não houve pagamento real nem homologação externa nesta revisão |
| Webhook Mercado Pago | Assinatura HMAC, janela temporal, consulta autenticada à API e conferência de status, referência, moeda, total e ambiente | Retorno do navegador não aprova pedidos |
| Painel | Chave administrativa somente em memória; consulta de pedidos, diagnóstico e registro manual da referência VAVI | Não compra produção automaticamente |
| Acompanhamento | Página de resultado explica a conferência do pagamento; operador consulta pedidos | Ainda não há acompanhamento autenticado do cliente com produção e rastreamento sincronizados |

### Proteções que devem permanecer

- `liveCheckoutReady()` exige aprovações explícitas de produto, política, webhook e checkout, além dos serviços necessários. A rota pública de prontidão confere também o produto no D1.
- O preço do lançamento é conferido no backend (`10990` centavos); valores do navegador não autorizam cobrança.
- `recordVerifiedPayment()` usa atualização condicional e lote D1. IDs de preferência/pagamento e eventos possuem restrições de unicidade.
- `registerManualVaviOrder()` só vincula uma ordem a um pedido real pago e ainda sem fornecedor; repetição do mesmo vínculo é reconhecida e conflitos são recusados.
- A entrega usa AES-GCM com associação ao ID do pedido; a descriptografia é administrativa. Nenhuma chave deve ir para HTML, logs ou documentação pública.

Evidência principal: `integrations/vavi-worker/src/{checkout-live,live-payment-webhook,payment-verification,payment-repository,delivery-repository,live-order-admin}.js` e migrações `0001`, `0002`, `0007`, `0008`.

## Contrato oficial VAVI verificado nesta revisão

O portal é uma aplicação JavaScript. Seu módulo público de documentação referencia `/openapi/auth.json`, `/openapi/orders.json` e `/openapi/webhooks.json`; esses arquivos oficiais foram lidos por HTTPS, sem autenticação e sem executar as operações descritas. As especificações consultadas indicam versões `1.0.0`, `1.1.2` e `1.7.4`, respectivamente.

### Autenticação

`POST /api/Auth/Token` troca `clientId` e `clientSecret`, com `grantType: client_credentials`, por JWT. O Client ID tem prefixo `pb_`; isso não representa um segundo mecanismo de autenticação. As chamadas seguintes usam Bearer. O código existente utiliza esse modelo. Não é necessário trocar credenciais para adequá-lo à descrição comercial do portal. [OpenAPI de autenticação](https://developers.vaviestampas.com.br/openapi/auth.json).

### Pedidos e frete

Base documentada: `https://api.printbee.com.br`.

| Operação documentada | Uso possível |
| --- | --- |
| `POST /api/Customers/Simulate` | Cotação por CEP com credencial ApiClient |
| `POST /api/Customers/Integrations/Orders` | Criar rascunho; nunca iniciar produção |
| `GET /api/Customers/Integrations/Orders` | Listar rascunhos da conta |
| `GET /api/Customers/Integrations/Orders/{identifier}` | Conferir rascunho por ID, código ou referência interna |
| `GET /api/Customers/Orders` | Listar pedidos da conta |
| `GET /api/Customers/Orders/{identifier}` | Consultar pedido e rastreamento |

O `code` estável deduplica reenvios. HTTP 202 também pode acompanhar falha de normalização: conferir `data.draftId`, `data.status` e `data.deduplicated`. O ApiClient não converte rascunhos em produção; a equipe confere produto, arte e frete no portal. O frete da loja não seleciona automaticamente o serviço na fábrica. [OpenAPI de pedidos](https://developers.vaviestampas.com.br/openapi/orders.json).

### Produção e pagamento do fornecedor

O guia oficial descreve pagamento da produção e do envio na plataforma antes da fabricação. Não foi encontrado endpoint para pagar o fornecedor ou converter o rascunho nas especificações públicas consultadas. Portanto, envio automático de rascunho e produção totalmente automática são etapas distintas; a segunda não pode ser prometida com o contrato atual. [Guia oficial de print-on-demand](https://www.printbee.com.br/guides/print-ondemand).

### Atualizações e rastreamento

A documentação permite cadastrar webhooks da própria conta com ApiClient, incluindo `order.status_changed`, `order.tracking` e eventos de recebimento/conversão/falha do rascunho. A assinatura é HMAC-SHA256 sobre `timestamp + "." + corpo bruto`, com segredo próprio da VAVI. O identificador `webhookSentId` permanece entre retentativas e deve ser deduplicado. Esse contrato é diferente da assinatura Mercado Pago; requer um receptor separado. [OpenAPI de webhooks](https://developers.vaviestampas.com.br/openapi/webhooks.json).

## O que falta para automatizar com segurança

1. **Concluir a aprovação comercial do produto.** Confirmar variante preta G, estampas finais, custo, embalagem, disponibilidade, prazo e documentação do vendedor. Preservar o preço atual enquanto não houver autorização para alterá-lo. Conferir migrações e configuração no ambiente, sem deduzir prontidão a partir da presença de código.
2. **Concluir homologação do checkout.** Exercitar frete, persistência, erro/timeout do provedor, assinatura inválida, reentrega, valores divergentes, conciliação e cancelamento. Testes com respostas simuladas não validam credenciais, frete real ou recebimento bancário.
3. **Acoplar uma rotina durável ao pagamento verificado.** Atualmente `createVaviDraft()` e `buildVaviIntegrationOrder()` existem, porém não são chamados pelo fluxo de produção. Uma implementação futura deve registrar intenção de envio em D1 após confirmação válida, manter um código por pedido, processar com tentativas controladas e reconciliar timeouts. Não basta fazer um `fetch` avulso no webhook.
4. **Validar a resposta do rascunho.** O cliente atual aceita HTTP 202 com JSON sem validar o resultado de negócio. Antes de conectá-lo, reconhecer falhas e descartes, persistir o identificador confirmado e testar deduplicação. Guardar separadamente o ID do rascunho e o do pedido convertido; o campo atual `vavi_order_id` serve ao registro manual.
5. **Implementar sincronização e atendimento.** Receber eventos VAVI autenticados, persistir eventos antes de confirmar recebimento, reconciliar estado por consulta e oferecer acompanhamento ao comprador com autorização adequada. Não expor os dados completos retornados pela VAVI em uma URL pública.
6. **Manter a operação de fábrica explícita.** Com o contrato atual, uma pessoa ainda precisa conferir/converter o rascunho e pagar a produção no portal. Também é necessário definir tratamento de estornos, cancelamentos, suporte e rastreio.

A proposta de rotina durável é uma recomendação de arquitetura; não foi implantada. A documentação Cloudflare recomenda filas/workflows para trabalho assíncrono e o D1 oferece lotes transacionais, úteis para preservar registro e idempotência. [Workers](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) · [D1](https://developers.cloudflare.com/d1/worker-api/d1-database/).

## Pontos adicionais observados

- Reentregas de pagamento depois da transição para `vavi_draft` são recusadas pelo webhook atual, que aceita `awaiting_payment`/`paid`. Uma futura automação deve reconhecer pagamentos já conciliados em estados posteriores, preservando todas as conferências financeiras e sem reencaminhar produção.
- A proteção contra duplicar a confirmação ou o vínculo VAVI já existe. Isso não equivale a deduplicar duas submissões independentes do checkout: cada uma pode criar um novo ID. Homologar repetição de clique/requisição antes da abertura comercial.
- Alguns documentos históricos ainda descrevem como pendentes recursos já presentes, como endereço cifrado, conciliação e registro manual. Para esta revisão, a tabela acima reflete o código da base auditada.

## Validação e limites

Foi feita leitura estática dos fluxos e comparação com os três contratos oficiais. A suíte do Worker foi executada pela revisão principal com um runtime Node já instalado: **115 testes aprovados, sem falhas**. São verificações locais com provedores simulados; não constituem homologação externa. Nenhuma consulta privada de clientes, segredo, migração remota, criação de pagamento, pedido, webhook ou alteração de conta foi realizada.

## Implementação visual e funcional entregue

A loja mantém a navegação compartilhada, as imagens existentes, os links de compra dos livros, as informações legais e o e-mail oficial. A coleção ganhou ficha de destaque para a camiseta G, ampliação da ilustração em nova aba, especificações legíveis, formulário de frete em largura própria, navegação por seção, guia de compra e dúvidas acessíveis sem JavaScript. Moletom e caneca permanecem indisponíveis. Não foram criadas novas variantes.

A consulta cancela requisições ao editar o CEP e ignora respostas atrasadas, inclusive quando o CEP é alterado e depois restaurado. Fretes inválidos, duplicados e retirada na fábrica não são oferecidos. Valores antigos, mensagem e link de e-mail são limpos ao mudar o CEP. Timeout e falha de rede oferecem consulta manual. O botão só é habilitado depois de instalar o JavaScript; sem ele, o e-mail permanece disponível. O gate de liberação do checkout pelo servidor foi preservado.

As capas do catálogo passam a carregar sob demanda, pois agora aparecem abaixo da coleção. A imagem decorativa deixa de ser um fundo fixo de toda a página. Nenhuma biblioteca foi adicionada ao frontend.

| Arquivo alterado/adicionado | Finalidade |
| --- | --- |
| `pages/loja.html` | Nova composição, ficha da camiseta, navegação, dúvidas e links legais |
| `styles/store-book.css` | Identidade visual, responsividade, foco, legibilidade e movimento reduzido |
| `scripts/salve-regina-inquiry.js` | Robustez e acessibilidade da consulta de frete |
| `tools/generate_store.py` | Carregamento tardio das capas, mantendo catálogo gerado |
| `tools/test_store_catalog.py` | Ajuste da verificação de carregamento das imagens |
| `tools/test_salve_regina_inquiry.cjs` | 11 testes de comportamento com respostas simuladas |
| `tools/test_storefront.py` | Regressão em Chromium com integrações simuladas |
| `.github/workflows/loja-catalogo-check.yml` | Execução contínua dos novos testes |
| `docs/auditoria-integracoes-loja-20261031.md` | Achados, fontes oficiais e pendências |

### Validações concluídas

- Worker: **115/115** testes, antes das alterações; backend permaneceu intacto.
- Catálogo: **14/14** testes; `python3 tools/generate_store.py --check` aprovado após alterações.
- Consulta assistida: **11/11** testes Node; sintaxe JavaScript aprovada.
- Sitemap: **8/8** testes; gerador `--check` aprovado.
- Assertions existentes do workflow VAVI: aprovadas na auditoria inicial; nenhuma integração/configuração/política foi modificada.
- `tools/test_storefront.py`: aprovado em **320, 390, 768 e 1440 px**, sem overflow; seleção de frete, totais, mensagem, erro de cotação, alteração de CEP, bloqueio do checkout, navegação por teclado e fallback sem JavaScript.
- `tools/test_cards.py`: aprovado nas **19 páginas e quatro larguras** da suíte existente.
- Capturas desktop/mobile inspecionadas; imagens decodificadas antes das capturas. Serviços externos, inclusive fontes remotas, bloqueados nos testes de navegador; utilizados fallbacks de tipografia.
- `git diff --check`: aprovado.

Node 22.18.0 já disponível no computador; Playwright 1.60.0 e Chromium instalados somente em diretório temporário para QA. O workflow declara suas próprias dependências de teste. Não foram executados pagamento real, API privada de produção, deploy, migração de banco ou publicação na `main`. Homologação externa e testes em outros motores de navegador continuam pendentes.

## Atualização: imagens fornecidas para a coleção

As quatro imagens em `assets/img/loja/Salve-Regina/` foram integradas à loja e à página da coleção, com ampliação em nova aba e identificação de apresentação ilustrativa. Os PNGs originais foram preservados. O banner apresenta a coleção; camiseta mostra frente/costas; caneca mostra as duas faces; ecobag aparece apenas como futura peça, sem SKU, preço, frete próprio ou compra habilitada. O moletom existente foi mantido.

Foram exportadas **12 cópias WebP** em `assets/img/loja/Salve-Regina/web/`: três larguras por imagem, sem recorte ou alteração criativa. `srcset`/`sizes` permitem escolher a resolução conforme a tela. O banner da página da coleção tem prioridade de carregamento; as imagens abaixo da abertura usam lazy loading.

A soma dos quatro PNGs é **9.714.024 bytes**; as quatro versões WebP nas dimensões originais somam **1.016.672 bytes** (**89,5% menores**). Esses números se referem aos arquivos, não ao peso total da página. Versões menores variam de aproximadamente 38 a 159 KB. A exportação é reproduzível com `python3 tools/optimize_salve_regina_images.py`, usando o Playwright/Chromium dos testes, sem acesso à rede.

Arquivos desta atualização:

- `pages/loja.html` e `pages/colecao-salve-regina.html`: imagens, ampliação, ecobag em preparação e links legais na coleção.
- `styles/store-book.css` e `styles/salve-regina-colecao.css`: proporções integrais e distribuição responsiva dos produtos.
- `tools/optimize_salve_regina_images.py`: exportação das imagens para WebP.
- `tools/test_store_catalog.py` e `tools/test_storefront.py`: regressão dos quatro cards, imagens responsivas e bloqueio de compras dos três produtos em preparação.
- `.github/workflows/loja-catalogo-check.yml`: inclui alterações nas imagens e no CSS da coleção nos gatilhos.
- Esta documentação e os quatro PNGs fornecidos com suas 12 cópias WebP.

Validações desta etapa: 14 testes de catálogo, 11 testes de consulta assistida, 8 testes de sitemap, geradores `--check`, loja/coleção em Chromium nas larguras 320/390/768/1440, imagens decodificadas e capturas inspecionadas. A suíte existente de cards também foi executada nas 19 páginas/quatro larguras. Frete e serviços externos foram simulados/bloqueados. Nenhuma mudança em backend, credenciais, preço da camiseta, dados do catálogo comercial, produção ou pagamentos. Homologação comercial e publicação continuam pendentes conforme as restrições do projeto.
