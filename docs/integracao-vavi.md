# Integração da loja com a VAVI — planejamento técnico

> Estado: **rascunho**, sem ativação de vendas ou alterações na loja publicada.

## Situação do site

- Repositório: `borscheitdouglas-arch/meu-site-final`
- Página da loja existente: `pages/loja.html`
- Estilos existentes: `styles/store-book.css`
- Hospedagem da interface: GitHub Pages
- Loja de livros atual: links externos para Amazon e UICLAP. **Preservar essa experiência**.

## Fluxo de venda previsto

1. Visitante escolhe um produto real do catálogo, a variação (tamanho/cor) e a quantidade.
2. Sistema servidor calcula os preços com base em um catálogo confiável e simula o frete (não confiar no total informado pelo navegador).
3. Checkout Mercado Pago cria uma cobrança vinculada a um identificador único do pedido.
4. Webhook de pagamento é validado pelo servidor; confirmar estado, valor e pedido na API do provedor.
5. **Só após pagamento confirmado**, criar rascunho na API VAVI.
6. No painel VAVI: mapear itens aos produtos corretos, vincular arquivos de estampa, selecionar frete e confirmar/pagar produção.
7. Registrar o identificador do rascunho, atualizar status e informar o comprador sobre produção, entrega e rastreamento.

## API VAVI — informações da documentação consultada

- Base: `https://api.printbee.com.br`
- Token: `POST /api/Auth/Token`
- Criar rascunho: `POST /api/Customers/Integrations/Orders`
- Autenticação por credenciais Client ID/Client Secret; nunca colocar o segredo no site ou repositório.
- O rascunho **não** significa entrada automática em produção.
- Cada pedido deve ter código único e registro persistente para evitar envios duplicados.
- Consultas e webhooks devem ser avaliados antes da implementação final.

> Os esquemas detalhados de criação de pedido e token devem ser revisados e testados em ambiente seguro antes de enviar dados reais.

## Arquitetura proposta

- **Frontend:** HTML/CSS/JS existentes do GitHub Pages.
- **Backend recomendado:** Cloudflare Workers (ou ambiente serverless equivalente) com secrets protegidos.
- **Dados persistidos:** catálogo aprovado, pedidos, carrinhos expirados, pagamentos, rascunhos da VAVI e status, com acesso restrito.
- **Gateway:** Mercado Pago Checkout Pro, com token secreto usado apenas no backend.
- **Webhooks:** validar assinatura e consultar os recursos na API do provedor antes de atualizar o pedido; processamento idempotente.

## Segurança e cuidados

- Não registrar Client Secret, tokens Bearer, credenciais de pagamentos nem dados pessoais em GitHub ou logs públicos.
- Não permitir que o navegador imponha `paidAmount` ou `unitPrice` sem validação.
- HTTPS obrigatório para formulários e callbacks.
- Prever regras de LGPD, política de troca/devolução, privacidade, prazo e contato.
- Antes do primeiro pedido real: testar fluxo completo, falhas de rede, reenvio de webhook, duplicidade, devoluções e cálculo de frete.
- Frete e preço final de produção VAVI devem ser confirmados para evitar margem negativa.

## Próximas tarefas

- [ ] Selecionar produtos reais disponíveis no painel VAVI, com tamanhos, cores e técnica de impressão.
- [ ] Aprovar arquivos de arte por produto e criar mockups.
- [ ] Calcular preço final considerando produção, frete, taxas, tributos e margem.
- [ ] Construir página de produtos personalizados sem alterar a livraria atual.
- [ ] Implementar catálogo e carrinho testáveis no navegador.
- [ ] Implantar backend com armazenamento e segredos.
- [ ] Integrar checkout Mercado Pago.
- [ ] Integrar criação/consulta de rascunhos VAVI e tratamento de erros.
- [ ] Validar o fluxo em testes antes de qualquer publicação comercial.

## Política de publicação

Toda alteração deve ser proposta em branch e pull request para revisão. **Não publicar no branch `main` nem habilitar pagamentos reais sem revisão e testes.**

## Vitrine e sacola — versão de testes

- Página: `pages/produtos-personalizados.html`; estilos: `styles/vavi-vitrine.css`; interação: `scripts/vavi-vitrine.js`.
- O catálogo `data/vavi-catalogo.json` permanece vazio: **nenhum produto fictício ou preço inventado foi publicado**.
- A vitrine só exibe produtos marcados simultaneamente como `enabled: true` e `verified: true`, com imagem local, identificador, nome e pelo menos uma variação disponível e com preço numérico positivo.
- A sacola funciona localmente no navegador (armazenamento `localStorage`), com seleção de variação e quantidade de 1 a 10, alteração de quantidades e remoção.
- **Este código não configura checkout, não calcula frete e não envia pedidos à VAVI.** O botão de compra está desativado.
- O subtotal é apenas uma visualização: antes de cobrar, o backend deverá validar de novo os preços, disponibilidade e opções.

### Estrutura de cadastro de um produto real

Cada entrada de `products` terá, após revisão do preço e da arte:

- `id`: identificador interno estável (texto).
- `name`: nome público.
- `description`: descrição da peça.
- `image`: caminho de imagem no próprio repositório, começando com `../assets/`.
- `enabled`: ativo/inativo.
- `verified`: indicação de revisão dos dados reais.
- `variants`: lista de opções com `sku`, `label`, `price` (número em BRL) e `available`.

O valor `sku` deve identificar a combinação real de produto, cor, tamanho e arte, de modo que possa ser mapeada manualmente ao catálogo VAVI.

**Antes da venda real:** preparar registros persistentes de pedidos e pagamentos no backend; preço e frete não podem ser decididos nem confirmados pelo JavaScript da página. Não guardar dados do comprador em `localStorage`.
