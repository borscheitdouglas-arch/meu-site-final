# VAVI Estampas — dossiê de pesquisa para a loja Douglas Assumpção

**Pesquisa pública realizada em 02/11/2026.** Material de consulta recorrente para escolha de produtos, cadastro, precificação, produção, frete, integração, pós-venda e novas coleções. Fontes ao final.

> **Limite da pesquisa:** fontes públicas acessíveis, guia oficial e código atual da nossa loja. A área de desenvolvimento pública da VAVI exibe apenas “Carregando...” no acesso web sem execução do aplicativo; contratos privados da API, catálogos autenticados, preços reais por personalização e dados internos do painel não puderam ser auditados integralmente. Não afirmar que sabemos "tudo" ou que esses detalhes já estão aprovados.

## 1. O modelo que nos interessa

- POD (Print OnDemand): vendemos em nossa loja, recebemos a venda, enviamos/cadastramos pedido na plataforma VAVI e pagamos a VAVI por fabricação e frete. VAVI fabrica, embala e remete diretamente ao destinatário.
- Sem estoque, mensalidade, assinatura ou taxa de adesão no programa POD padrão, segundo guia público. **Isso não significa zero tarifas comerciais ou taxa financeira:** termos de uso reservam cobranças conforme contrato ou plano vigente. Verificar precificação efetiva e meios de pagamento no painel.
- Atendimento ao consumidor e política comercial são responsabilidade da loja Douglas Assumpção.
- White label: envio sob marca do lojista, sem propaganda VAVI. Documentos fiscais obrigatórios podem acompanhar. Etiqueta interna/tag personalizada pode depender de opção comercial/serviço.
- Lojas próprias podem integrar por API REST, além das conexões self-service WooCommerce e Nuvemshop. Não precisamos migrar nosso GitHub Pages/Cloudflare.

Fontes:
- https://www.vaviestampas.com.br/guides/print-ondemand
- https://www.vaviestampas.com.br/guides/integrations
- https://www.vaviestampas.com.br/policies/shipping-policy
- https://www.vaviestampas.com.br/policies/terms-of-use

## 2. Caminho operacional: venda, dinheiro e entrega

1. Publicamos somente produto e variante conferidos, com arte correta e preço de venda sustentável.
2. Comprador escolhe produto, variação, quantidade e CEP e recebe modalidades reais de frete.
3. Antes de cobrar, nosso servidor confere preço, elegibilidade e cota o frete novamente na VAVI.
4. Mercado Pago cria cobrança da loja, e um webhook validado confirma no backend se o pagamento foi realmente aprovado.
5. Pedido pago pode chegar como **rascunho** ao painel VAVI por API/integrador. É preciso mapear item → produto-base/variação + arte Web2Print, escolher frete, gerar pedido e **pagar produção/frete à VAVI**. Rascunho ≠ produção iniciada.
6. VAVI produz e entrega. Nosso atendimento repassa status e código de rastreio ao comprador.

**Não confundir pagamentos:** comprador paga à loja; depois nós pagamos ao fabricante. O custo de produção, eventual diferença de frete, taxas do Mercado Pago, tributos e devoluções afetam a margem.

Prazos públicos: produção normalmente em **3–5 dias úteis para até 10 peças**, acrescentando 1 dia útil a cada 10 unidades extras; prazo da transportadora soma-se e só começa após despacho. Envio nacional sujeito a cobertura. Política de envio atualizada em 21/09/2026.

Fontes:
- https://www.vaviestampas.com.br/guides/integrations
- https://www.vaviestampas.com.br/about/faq
- https://www.vaviestampas.com.br/policies/shipping-policy

## 3. Catálogo — panorama

A página oficial `/products/all` exibia **37 itens** no momento da consulta (lista e disponibilidade são mutáveis). O catálogo contém: camisetas unissex/infantis/oversized/baby look/dry fit/regata/cropped/plus size, malha egípcia e outras; polos; moletons canguru e tradicionais; bonés, chapéus e ecobags; avental; caneca; calças, bermudas, saco TNT e impressão DTF.

Links principais:
- https://www.vaviestampas.com.br/products/all
- https://www.vaviestampas.com.br/products/camisetas
- https://www.vaviestampas.com.br/products/blusas
- https://www.vaviestampas.com.br/products/acessorios
- https://www.vaviestampas.com.br/products/brindes
- https://www.vaviestampas.com.br/guides/measurement

**NUNCA usar preços "a partir de" como custo de fabricação da nossa peça já estampada.** O preço final depende de técnica, áreas de estampa, tamanhos, cores, composição e quantidade. Confirmar no configurador/Web2Print e no painel.

### Fichas técnicas encontradas (dados públicos do PRODUTO-BASE)

Dimensões em **C × L × A**, milímetros. Peso em kg. SKUs abaixo são os exibidos na ficha pública, **não garantem identificação da combinação colorida/tamanho/arte**.

| Produto-base | SKU público | Peso | Dimensões do pacote informadas | Personalização | Fonte |
|---|---|---:|---|---|---|
| Camiseta unissex algodão 30.1 penteado | `0000002` | 0,25 | 300 × 250 × 10 | DTF/DTG, frente/costas e outras áreas | https://www.vaviestampas.com.br/products/camisetas/camiseta_unissex_algodao_30_1_penteado |
| Caneca de porcelana | `0002193` | 0,50 | 150 × 200 × 100 | Sublimação | https://www.vaviestampas.com.br/products/brindes/caneca_porcelana |
| Ecobag algodão cru | `0000564` | 0,20 | 250 × 250 × 10 | DTF frente/verso; M e G no seletor atual | https://www.printbee.com.br/products/acessorios/ecobag_algodao_cru |
| Moletom tradicional | `0000931` | 0,60 | 300 × 250 × 30 | DTF/DTG; PA 50% algodão/50% poliéster | https://www.printbee.com.br/products/blusas/blusa_moletom_tradicional |
| Moletom canguru/capuz | `0001073` | 0,60 | 300 × 250 × 30 | DTF; PA 50% algodão/50% poliéster | https://www.vaviestampas.com.br/products/blusas/blusa_moletom_canguru |
| Boné Dad Hat | `0001439` | 0,40 | 300 × 250 × 30 | DTF | https://www.printbee.com.br/products/acessorios/bone_dad_hat |
| Boné Frente Americana | `0001446` | 0,40 | 300 × 250 × 40 | DTF | https://www.printbee.com.br/products/acessorios/bone_frente_americana |
| Chapéu Bucket | `0001454` | 0,40 | 300 × 250 × 40 | DTF | https://www.printbee.com.br/products/acessorios/chapeu_bucket |
| Avental Oxford com bolso | `0002134` | 0,10 | 300 × 250 × 10 | DTF | https://www.printbee.com.br/products/acessorios/avental_peito_oxford_com_bolso |
| Polo masculina algodão | `0002109` | 0,30 | 300 × 250 × 10 | DTF | https://www.printbee.com.br/products/polos/polo_masculina_algodao |
| Bermuda moletinho unissex | `0001856` | 0,30 | 300 × 250 × 20 | DTF | https://www.printbee.com.br/products/bermudas/bermuda_unissex_moletinho |
| Calça moletom sem punho | `0001983` | 0,60 | 300 × 300 × 30 | DTF | https://www.printbee.com.br/products/calcas/calca_unissex_moletom_s_punho |
| Saco TNT | `0000302` | 0,01 | 300 × 250 × 0,1 | DTF, confirmar embalagem expedida | https://www.vaviestampas.com.br/products/outros/saco_tnt |

**Atenção ao SKU da camiseta:** o suporte havia informado para nosso projeto UUID `019aa7eb-d437-721a-bc8d-69d5a2754865`, SKU `0000001` e custo personalizado G de R$ 66,83 (registro `docs/vavi-camiseta-salve-regina-dados-confirmados.md`). A ficha pública atual contém SKU `0000002`. Outra observação técnica interna refere variações `0001581`, `0001590`, `0001591`. São identificadores **de naturezas/versões possivelmente diferentes**. Não alterar automaticamente configuração de frete/produção sem conferir no portal autenticado ou suporte. Verificar produto exato, UUID, SKU base, SKU de variante e design personalizado.

**Atenção às dimensões:** a ficha pública diz "medidas do pacote"; confirmar se se referem à expedição efetiva do produto customizado e como a API deve agregar várias peças, especialmente caneca frágil.

## 4. Canecas: caso especial com conflito de fontes oficiais

- Ficha da caneca: porcelana branca/preta, sublimação, encomenda mínima declarada de **1 peça**, peso 0,5 kg e dimensões 150 × 200 × 100 mm, SKU `0002193`.
- Categoria `/products/brindes` e FAQ geral dizem **sublimação em pedidos em quantidade, fora do POD (DTF/DTG)**.
- O material da caneca também tem discrepância de capacidade: textos públicos mencionam **325 ml** e **350 ml**, que não devem ser tratados como especificação consolidada.
- Não anunciar caneca como produção **unitária automatizada via integração POD** antes de comprovação direta da VAVI. Se for somente compra avulsa na própria vitrine/portal ou atacado, desenvolver fluxo separado, não induzir venda sem cumprimento.
- Arquivo de arte sublimática: RGB/sRGB, 300 DPI, ajustar dimensões da área de estampa real e conferir contraste, materiais e opção de cor.

Fontes:
- https://www.vaviestampas.com.br/products/brindes/caneca_porcelana
- https://www.vaviestampas.com.br/products/brindes
- https://www.vaviestampas.com.br/about/faq
- https://www.vaviestampas.com.br/guides/printing-manual

## 5. Ecobags: compatíveis em princípio com POD de 1 unidade

- Algodão cru, personalização DTF frente, verso ou ambos; ficha anuncia compra unitária. SKU público `0000564`.
- Página menciona tamanhos P/M/G/GG em descrição, mas o seletor visível pode apresentar somente M e G. Precisamos conferir variações realmente disponíveis no portal em cada data.
- Limites de estampa informados: P 25 × 32 cm; M 35 × 42 cm; G 39 × 45 cm; GG 47 × 47 cm. **Limite da área de produto**, confirmar para cada área da arte.
- Produto é forte candidato para usar as artes Salve Regina, desde que preço com técnica/área escolhida seja aprovado.

Fonte: https://www.printbee.com.br/products/acessorios/ecobag_algodao_cru

## 6. Técnicas e qualidade das artes

**DTF**: estampa transferida por filme; boa em tecidos escuros e com detalhes finos; toque da área impressa pode ser perceptível. Arquivos aceitos no manual: PNG, AI, PDF, PSD; resolução mínima 300 DPI; até 57 × 57 cm como limite geral de técnica; fundo transparente recomendado.

**DTG**: impressão direta no tecido, mais natural em algodão; peça escura requer primer e base branca; arquivo PNG/PSD, 300 DPI (ideal 600), CMYK como referência de produção, fundo transparente obrigatório no manual, limite geral 40 × 50 cm. Evitar costuras, gola e barra.

**Sublimação**: tinta fixada em substrato preparado ou poliéster; usa RGB/sRGB; não imprime branco; limite técnico genérico 100 × 75 cm, mas cada produto tem área própria. A VAVI informa que não faz parte do POD padrão DTF/DTG.

Regras para artes de Nossa Senhora e partitura gregoriana:
- preservar a partitura exata, notas/neumas, alinhamento e direitos de uso;
- preparar a arte no tamanho final em pixels compatível com 300 DPI real; não "melhorar resolução" só ajustando metadados;
- fundo transparente para DTF/DTG, fidelidade de cores em azul/dourado, não confundir dourado impresso comum com tinta metálica;
- margem de segurança de **5 mm** conforme manual e textos vetorizados/contornos;
- solicitar prova física ou impressão-teste antes de lançar variações novas;
- revisão de texto, arte e especificações é responsabilidade do lojista; a VAVI pode rejeitar reclamação por defeitos provenientes dos arquivos.

Fontes:
- https://www.vaviestampas.com.br/guides/printing-manual
- https://www.vaviestampas.com.br/policies/exchanges-and-returns
- https://www.vaviestampas.com.br/guides/care

## 7. Frete: como calcular corretamente na nossa arquitetura

A VAVI define frete por destino (CEP), peso/dimensões **do pacote**, modalidade/transportadora e cobertura. É uma consulta dinâmica, não uma tabela fixa por Estado.

Nosso Worker: `douglas-loja-api`.
- Frontend: `scripts/store-shipping-calculator.js`, `scripts/product-detail.js`, `scripts/cart-shipping.js`.
- Endpoint do site: `POST /api/shipping/preview` com `{zipCode,sku}`.
- Backend: `integrations/vavi-worker/src/shipping.js`; autentica VAVI (`/api/Auth/Token`), chama `POST /api/Customers/Simulate`; filtra transportadoras ativas e exclui "retirada na fábrica" na experiência de entrega.
- Ficha logística privada `VAVI_SHIPPING_PRODUCTS_JSON` é um mapeamento `SKU interno → {id UUID VAVI, sku VAVI, amount, weight, height, width, length}`.
- **Nenhum preço do produto enviado pelo navegador deve ser aceito no servidor para cobrança.** Custos de fabricação e credenciais nunca podem aparecer no frontend.
- O sistema em 02/11 conseguiu **4 opções reais para camiseta G no CEP público de teste 01001000**. Canecas e ecobags ainda retornaram `shipping_product_unverified` porque faltam detalhes completos da ficha privada, mesmo tendo SKU/peso/dimensões públicos.
- A montagem atual de pacotes múltiplos **bloqueia pedidos com vários itens** por segurança; não somar fretes individuais nem volumes inventados. Solicitar à VAVI método para composição de pedido e embalagens com diferentes produtos.
- O campo `amount` da simulação exige esclarecimento: preço do fabricante x valor da mercadoria declarado x preço cobrado do consumidor. Até verificar, não arbitrar valores.

Fontes:
- https://www.vaviestampas.com.br/policies/shipping-policy
- `integrations/vavi-worker/src/shipping.js`
- `docs/vavi-frete-api-implementacao.md`
- `.github/workflows/frete-itens-live-diagnostico.yml` (teste público de integração)

## 8. Integração/API: o que está confirmado e o que não está

**Público confirmado pela VAVI:**
- API REST para loja própria, credenciais próprias geradas no portal, pedidos de integração podem ser rascunhos, webhooks de atualização, necessidade de mapear produto e arte e gerar produção.
- Self-service já oferecido para WooCommerce e Nuvemshop, não presumir que a loja está conectada por OAuth só porque tem credenciais API.

**Implementação existente em nosso projeto (a confirmar com a especificação autenticada conforme necessário):**
- `POST /api/Auth/Token` para token do fabricante;
- `POST /api/Customers/Simulate` para preço de frete;
- `POST /api/Customers/Integrations/Orders` para rascunho;
- `GET /api/checkout/live/readiness`, `POST /api/checkout/live`, `POST /api/payments/live-webhook` no nosso Worker;
- dados de pagamento conciliados em D1; despacho à VAVI só após confirmação efetiva do pagamento; ao menos algumas etapas de vinculação e geração da produção continuam manuais.

**Indisponível sem autorização específica/portal autenticado:**
- referência exata de todos os endpoints/campos/versões e webhooks; validade da cotação; tarifas; agrupamento de embalagens; exigência de variações, técnicas e artes Web2Print; custos de produtos finalizados; elegibilidade de sublimação unitária. A página `https://developers.vaviestampas.com.br/` mostra apenas "Carregando..." nas ferramentas de acesso público sem executar o aplicativo.

Links:
- https://www.vaviestampas.com.br/guides/integrations
- https://developers.vaviestampas.com.br/
- `docs/vavi-criacao-rascunhos-contrato.md`
- `docs/integracao-vavi-frete-validacao.md`

## 9. Política comercial, entrega e pós-venda

- Direitos do comprador final são exercidos contra **nossa loja**, não diretamente contra o fabricante. Se o cliente desistir da compra conosco, a VAVI informa não reembolsar o lojista apenas por essa desistência; não transferir esse risco ao cliente sem avaliar Código de Defesa do Consumidor.
- A VAVI oferece troca/reimpressão/reembolso quando há defeito ou erro comprovado de produção, com comprovação e procedimento de logística reversa.
- VAVI recomenda comunicar defeitos aparentes em até 7 dias após recebimento, mas afirma que essa recomendação **não limita direitos legais**. Não usar o prazo como limite absoluto para reclamações de vícios.
- A política formal reconhece direito de arrependimento de compras fora do estabelecimento e debate particularidades de personalização. A página geral de medidas menciona troca de tamanho em 7 dias, enquanto FAQ e política de revenda atribuem a lojistas riscos de escolha errada. **Há divergência; a política da nossa loja deve ser revisada juridicamente, sem negar direitos legais.**
- Endereço incorreto e insucesso da entrega podem causar nova cobrança de frete.
- A VAVI aceita reclamação de avaria/extravio e pode providenciar reenvio ou reembolso conforme apuração.
- Não prometer datas exatas de entrega: produção e transporte contam separadamente.
- Cuidados: lavar roupas estampadas do avesso até 30 °C, não passar ferro diretamente sobre a estampa; canecas lavadas à mão, sem lava-louças/micro-ondas segundo o guia.

Fontes:
- https://www.vaviestampas.com.br/policies/exchanges-and-returns
- https://www.vaviestampas.com.br/policies/shipping-policy
- https://www.vaviestampas.com.br/guides/measurement
- https://www.vaviestampas.com.br/guides/care

## 10. Responsabilidade fiscal, legal e privacidade

- A política de envio diz que documentos fiscais exigidos por lei podem acompanhar a remessa white label. **"Sem publicidade VAVI" não significa que é possível omitir documentos fiscais exigidos.**
- O lojista responde pelo uso autorizado de artes, imagens, marcas, mensagens e desenhos; revisar direitos antes de publicar estampas e imagens.
- Nosso servidor coleta e protege endereço, nome e dados de contato somente para finalizar compra; restringir acesso, criptografar dados sensíveis e não registrar esses dados em logs/arquivos públicos.
- Manter canais de atendimento, política de entrega, trocas, privacidade e obrigações de consumidor/faturamento apropriadas à venda por e-commerce.

Fontes:
- https://www.vaviestampas.com.br/policies/privacy-policy
- https://www.vaviestampas.com.br/policies/terms-of-use
- https://www.vaviestampas.com.br/policies/shipping-policy

## 11. Pautas de confirmação, com prioridades

**Imediatamente, para publicar canecas e ecobags com frete real:**

1. A caneca preta e a branca/P&B por sublimação são admitidas em **pedido unitário na integração API de lojista**, ou somente em compra direta/varejo/quantidade?
2. UUID e SKU correto da caneca, ecobag M, ecobag G e da camiseta preto/tamanho/estampa (reconciliar `0000001` versus `0000002` e demais códigos de variação).
3. Como informar técnica e área de impressão (DTF frente/verso, sublimada) no pedido e se o SKU muda por personalização.
4. Custos finais unitários completos por cor/tamanho/áreas de impressão; taxas comerciais adicionais e o sentido de `amount` na simulação.
5. Se as medidas de pacote exibidas no site correspondem às **embalagens finais** e como calcular várias peças na mesma encomenda.
6. Se o preço/opção de frete da simulação é garantido ou pode variar na hora de gerar pedido, e como associar modalidade da transportadora ao rascunho.
7. Como vincular automaticamente design Web2Print salvo, sem reabrir manualmente todas as opções, ou confirmar que é obrigatória conferência manual.

**Para expansão:**

8. Escolher modelo exato do moletom (tradicional `0000931` vs. canguru `0001073`), tamanhos, cores, áreas de estampa, custo e preço.
9. Selecionar bonés `0001439` ou `0001446` segundo tecido/estampa; não confundir custo base com estampado.
10. Testar remessa real e rastreio antes de declarar a loja automatizada ponta a ponta.

## 12. Regras permanentes para qualquer novo produto

1. Procurar primeiro a **ficha oficial VAVI**, anotar link, SKU, peso, dimensão e data.
2. Comparar opções de cor, tamanho, técnica, área de estampa e pedido mínimo do canal (site, WhatsApp, integração POD).
3. Confirmar UUID do produto correto e SKU da variante no **painel autenticado**, e preço configurado já com a arte.
4. Validar embalagem final e cotação API; nunca inventar frete.
5. Validar margem após custos, taxas e responsabilidade pós-venda.
6. Testar frontend em desktop/mobile, checkout sem cobrança fictícia, webhooks e produção.
7. Publicar apenas variante individualmente aprovada no backend.
8. Manter VAVI invisível na comunicação ao comprador quando o modelo white label e a documentação fiscal permitirem.
9. Reconsultar as páginas oficiais em cada lançamento porque preços, descrições, SKUs e políticas podem mudar.

---

### Pesquisa consultada
- https://www.vaviestampas.com.br/
- https://www.vaviestampas.com.br/products/all
- https://www.vaviestampas.com.br/guides/print-ondemand
- https://www.vaviestampas.com.br/guides/integrations
- https://www.vaviestampas.com.br/guides/printing-manual
- https://www.vaviestampas.com.br/guides/measurement
- https://www.vaviestampas.com.br/guides/care
- https://www.vaviestampas.com.br/about/faq
- https://www.vaviestampas.com.br/policies/shipping-policy
- https://www.vaviestampas.com.br/policies/exchanges-and-returns
- https://www.vaviestampas.com.br/policies/terms-of-use
- https://www.vaviestampas.com.br/policies/privacy-policy
- https://developers.vaviestampas.com.br/

Esta é uma base de conhecimento de fontes públicas e da implementação da nossa loja, **não uma validação privada dos contratos ou dados internos da VAVI**.
