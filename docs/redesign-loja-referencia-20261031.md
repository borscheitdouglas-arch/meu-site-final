# Redesign da loja a partir da referência — 31/10/2026

## Resultado

Reformulação da loja existente, com HTML/CSS/JavaScript editáveis, sem novo site ou dependências. A referência orientou a composição, paleta escura, dourado, serifas e ornamentação. Os produtos e as imagens continuam sendo os do projeto, e não os exemplos comerciais da referência.

A abertura anterior e o formulário extenso empurravam a vitrine para baixo. A nova página separa apresentação, catálogo e consulta: banner compacto, categorias visuais, quatro cards alinhados no desktop, duas colunas no tablet e uma no celular. O livro permanece no bloco gerado, com suas duas lojas parceiras. A seção Salve Regina utiliza a imagem original já otimizada; os detalhes são painéis nativos expansíveis. Caneca, ecobag e moletom continuam em preparação. O moletom ainda utiliza a ilustração provisória existente.

Busca local sem distinção de acentos, filtros por categoria/disponibilidade, contagem de resultados e estado vazio foram adicionados. Sem JavaScript, o catálogo, os detalhes, as informações legais e o contato continuam acessíveis. O cabeçalho conserva o contrato do menu compartilhado, evitando que o script antigo o substitua. O carrinho existente é acessível por link, sem misturar seus dados com a consulta assistida.

## Arquivos trabalhados

- `pages/loja.html`: organização das seções, cabeçalho, busca, cards, detalhes, tamanhos e rodapé.
- `styles/storefront.css`: estilos exclusivos de `.shop-redesign`, responsividade, foco e movimento reduzido.
- `scripts/storefront.js`: busca, filtros e abertura/foco dos detalhes; sem chamadas comerciais ou armazenamento.
- `scripts/salve-regina-inquiry.js`: correção comprovada da captura do tamanho enviado na consulta e descarte de resposta antiga ao trocar tamanho.
- `tools/test_storefront.py`: testes reais de navegador, incluindo filtros, detalhes, carrinho e contrato de prontidão.
- `tools/test_salve_regina_inquiry.cjs`: adaptação ao seletor existente e regressões de XG/troca de tamanho.
- Este relatório.

## Atualização paralela do repositório

O trabalho começou na branch `feat/loja-premium-20261031`. Durante a execução, outro fluxo incorporou alterações e mudou o checkout local para `main` no commit `fada177`. Nenhum commit, merge, push ou deploy foi executado por esta revisão. As correções finais ficaram na nova branch `feat/loja-revisao-visual-20261031`, sem commit.

A atualização `e864885` trouxe cinco tamanhos e preços existentes: P/M/G/GG a R$ 109,90 e XG a R$ 119,90. Após a incorporação, faltava o seletor no HTML, causando erro de JavaScript, e a consulta referenciava `requestedSize` sem declaração. A interface foi reconciliada com esse contrato, sem mudar preços, SKUs, endpoints ou regras do backend. Os valores permanecem preliminares na consulta. Nenhum produto foi habilitado.

## Verificações concluídas

| Verificação | Resultado |
| --- | --- |
| `tools/test_storefront.py` | Aprovado em Chromium: 320, 390, 768 e 1440 px; loja e coleção sem overflow, imagens carregadas, grade responsiva, busca, categorias, vazio, teclado, detalhes por URL, frete, totais, falha de cotação, e-mail, links legais e fallback sem JS |
| Carrinho | Item fictício criado apenas no armazenamento do navegador isolado; dados preservados na navegação; nenhum envio |
| Prontidão do checkout | Respostas false/true simuladas; link aparece apenas quando autorizado pelo contrato existente, sem acessá-lo |
| Consulta assistida Node | 13/13 aprovados, incluindo preço/SKU de XG e resposta antiga após troca de tamanho |
| Catálogo Python | 14/14 aprovados; `generate_store.py --check` aprovado |
| Sitemap Python | 8/8 aprovados; `generate_sitemap.py --check` aprovado |
| Backend Worker | 134/134 testes locais aprovados, sem alterações no backend por esta revisão |
| `tools/test_cards.py` | 18 páginas em quatro larguras aprovadas; repertórios sem JavaScript e links externos do livro preservados |
| `git diff --check` | Aprovado |

Capturas desktop/mobile inspecionadas em `/private/tmp/loja-premium-qa/redesign/`. Os testes de navegador bloqueiam serviços externos e simulam as APIs: não comprovam disponibilidade do serviço real, aprovação de pagamento ou fabricação. Fontes remotas foram bloqueadas, usando as fontes de fallback. Não foi realizada auditoria formal de WCAG ou medição de Core Web Vitals.

## Preservação e pendências

Nenhuma alteração desta revisão em Worker, D1, migrações, webhooks, configuração, secrets, deploy, imagens originais ou estilos/scripts compartilhados. Políticas e e-mail oficial preservados. Não houve cobrança, criação de pedido real ou envio à VAVI.

A revisão visual não libera produção. A operação automática continua dependente de homologar as integrações reais, variantes aprovadas, frete, conciliação, processamento VAVI e acompanhamento, respeitando os bloqueios existentes. Nenhuma etapa de produção/pagamento do fornecedor foi automatizada neste redesign. A auditoria histórica de integrações descreve o contrato consultado naquela base; não substitui a validação da configuração atual.

## Visualizar localmente

No terminal, dentro do repositório:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8765/pages/loja.html`. Encerrar com Ctrl+C. O servidor apenas apresenta os arquivos locais; os controles comerciais existentes continuam vigentes. Os servidores usados nos testes foram encerrados automaticamente.

## Refinamento após o print do Safari

Nesta rodada, a apresentação foi revisada novamente a partir do print enviado pelo titular:

- Categorias em círculos com moldura dourada fina, títulos centralizados e indicação de disponibilidade. No celular, cinco categorias distribuídas em duas linhas, sem exigir rolagem horizontal.
- Banner sem a caixa escura nem a faixa lateral repetitiva. Composição original completa da coleção em destaque, título serifado com ênfase em itálico e chamada curta.
- Cards com base em marfim, textos escuros, preço destacado e ações consistentes. Imagens completas preservadas nos cards e detalhes; o recorte circular existe somente nas miniaturas de navegação.
- Espaçamentos, ornamentos, moldura da coleção e monograma refinados. Versão da URL do CSS atualizada para evitar cache da aparência anterior.

Arquivos alterados nesta rodada: `pages/loja.html`, `styles/storefront.css`, `tools/test_storefront.py` e este relatório. Modificações anteriores de JavaScript permaneceram intactas. Comparação SHA-256 confirmou preservação dos 78 arquivos verificados de scripts, backend e estilos compartilhados. Nenhuma imagem original foi modificada.

Validação desta rodada: teste completo de navegador aprovado em 320/390/768/1440 px, incluindo proporção circular, acesso às cinco categorias, busca, filtros, detalhes, frete simulado, carrinho, teclado e fallback sem JavaScript; catálogo 14/14, gerador e `git diff --check` aprovados. Capturas desktop e celular inspecionadas em `/private/tmp/loja-premium-qa/circulos/`. Verificação executada em Chromium; Safari não foi executado nesta rodada. Nenhuma publicação, commit, cobrança ou pedido real.
