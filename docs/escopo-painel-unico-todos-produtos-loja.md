# Escopo obrigatório: painel ÚNICO de produtos — Douglas Assumpção

Data: 03/11/2026. Requisito confirmado pelo lojista: **o cadastro e a administração devem servir para TODOS os produtos existentes e futuros da loja**, não só VAVI/Salve Regina.

## Diagnóstico dos arquivos existentes

- `content/store-products.json` contém produtos editoriais, incluindo o livro **O Canto Como Mística** e rascunho anterior da camiseta; `tools/generate_store.py` gera parte da vitrine.
- `content/shop-cart-catalog.json` contém seis cadastros Salve Regina: camiseta, duas canecas, duas ecobags e moletom, com preços e variantes; `scripts/storefront.js` / `scripts/product-detail.js` / `scripts/cart.js` usam os dados da coleção.
- `data/vavi-catalogo.json` é uma fonte histórica com `products:[]`, não é cadastro atual completo.
- No Cloudflare D1, `products` e `variants` dão suporte à aprovação de vendas e à precificação, e outra tabela privada contém custos observados do fornecedor.
- **`/admin/index.html` + `admin/admin.js` NÃO constituem administração segura nem integrada**: senha padrão de interface, dados em `localStorage` do dispositivo, sem escrita real no catálogo publicado. Não usar para gerenciar a loja. O `admin/config.yml` é rascunho de Netlify CMS/git-gateway, sem integração funcional garantida no GitHub Pages/Cloudflare. A página de pedidos `/pages/admin-pedidos-loja.html` é outro painel, não resolve cadastro de produtos.

## Resultado esperado

**Um único painel administrativo autenticado** com criação/edição/publicação de qualquer tipo de produto e visualização de status, não uma coleção de ferramentas por categoria.

Categorias iniciais:
1. Moda e acessórios produzidos pela VAVI: camiseta, ecobag, boné, moletom e outras peças futuras.
2. Canecas/brindes da VAVI, respeitando restrições da modalidade de fabricação.
3. Livros físicos: links externos (Amazon/UICLAP etc.) ou checkout próprio somente quando logística aprovada.
4. Partituras/arquivos digitais: sem frete, com entrega protegida após pagamento confirmado.
5. Produtos físicos de estoque próprio/terceiros: frete do fornecedor/transportadora apropriada, não forçar cálculo VAVI.
6. Produtos sob encomenda, peças autorais, 3D e novas categorias: estratégias adicionais revisadas conforme necessidade.

Campos comuns: título, SKU interno estável, categoria, descrições, imagens/arquivos, status, preço de varejo, variações, disponibilidade, fornecedor, modalidade de compra, estratégia de frete, prazos, políticas, URL da página e ações de publicar/retirar.

Configuração específica:
- **Fornecedor VAVI:** localizar ficha oficial, código/UUID/SKU do fabricante, design VAVI, técnica, tamanhos/cores, custo privado, peso/dimensões e prazo. Consultar frete pela API real via Worker e nunca expor custos de fornecimento. O fornecedor deve permanecer oculto ao cliente quando a modalidade white label permitir.
- **Frete de produto físico:** CEP, quantidade e pacote completo; cotação remota/serviço apropriado. Não inventar embalagem de múltiplos produtos.
- **Produto digital:** entrega segura do arquivo após pagamento, frete não aplicável.
- **Livro/parceiro de compra externa:** link de compra para o parceiro; carrinho local não deve cobrar nem simular frete que será cobrado em outra loja.
- **Estoque próprio:** controle de estoque e política de despacho própria, sem fingir integração VAVI.

## Arquitetura segura

1. **Um catálogo mestre no D1**, com dados públicos e privados separados e suporte a variações, imagens, fornecedores e métodos de atendimento; migrar registros atuais sem perder links/SEO, preços ou identidades dos SKUs.
2. **API administrativa no Cloudflare Workers**, com autenticação real e autorização por sessão/usuário, idealmente Cloudflare Access (ou equivalente adequadamente configurado); jamais senha embutida em HTML/JS e jamais `localStorage` como fonte de verdade.
3. **Imagens em armazenamento próprio controlado**, por exemplo Cloudflare R2, com validação de arquivos, tamanhos e direitos.
4. **Mesmo catálogo para vitrine, página do produto e carrinho**; não atualizar três JSONs ou scripts manuais a cada nova peça.
5. **Serviço de frete por estratégia**: VAVI para VAVI, transportadora/fornecedor apropriado para físico próprio, nenhum frete para digital e parceiro externo.
6. **Checkout com validação servidor** de preço, disponibilidade, custo, margem e frete atualizado, prévia não sendo autorização de pagamento; webhook de pagamento conciliado e pedidos idempotentes.
7. **Fluxo de publicação verificável**: rascunho → validação de cadastro → validação financeira/logística → publicado. Possibilidade de desfazer publicação rapidamente.
8. **Nenhuma automação de fabricação ativada sem teste ponta a ponta**.

## Implementação recomendada em etapas

**Etapa 1 — Catálogo universal + painel seguro:** login real, listagem de todos os cadastros existentes, edição de nome, imagem, descrição, categoria e status sem tocar em pagamentos. Importar livro e seis peças Salve Regina com seus SKUs, preservando dados atuais. Testar permissões e migração.

**Etapa 2 — Preços e integrações:** variações, custo privado e preço final, módulos de fornecedores, frete dinâmico por item e, quando certificado, por carrinho completo. Exibir simulações orientativas como tal.

**Etapa 3 — Compras e pedidos:** habilitar por produto apenas quando checkout/frete/fabricação e política estiverem aprovados; incluir digitais e estoque próprio com suas regras, rastreio e gestão de pedidos. Testar totais, antifraude, reembolso, falhas e webhook.

**Etapa 4 — Rotina sem código:** botão "Novo produto", clonar produto/design, edição rápida, importação guiada da VAVI, histórico, rascunho, publicar e despublicar sem GitHub/terminal.

## Regras que não podem ser quebradas

- "Todos os produtos" inclui livro e futuras categorias fora da VAVI.
- Uma **única tela** não significa **um único método de frete**: fornecedor, produto digital, estoque próprio e venda externa exigem regras próprias.
- Nenhuma taxa inventada, custo privado no site, senha no frontend, checkout de produto não aprovado, pedido automático em fornecedor não validado, nem alteração do design/identidade visual sem autorização.
- Não prometer que o painel já está implementado: este arquivo registra o **escopo e plano técnico** para construir em sequência.
