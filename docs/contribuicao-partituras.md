# Contribuição voluntária antes do download

## Estrutura existente e integração

O site é estático (HTML/CSS/JavaScript), sem build ou backend de pagamentos. A análise dos 102 arquivos HTML públicos encontrou 42 links de download/PDF, incluindo o modelo `pages/template.html`: todos estão em páginas que carregam `scripts/script.js`.

- Páginas atuais: links `<a href="…pdf" download>` nas classes `.btn.outline`, `.cta-btn` e `.score-preview-download`.
- Pré-visualizadores: alguns scripts atualizam o `href` do botão. O modal lê esse endereço **no momento do clique**.
- Destaques: `scripts/script.js` pode gerar links a partir de `pages/pages.json` (atualmente vazio).
- Cadastro local: `admin/admin.js` armazena `sheet` (data URL), `sheetName`, `title`, `id` e `price` em `shopProducts_v1`. `scripts/store.js` monta os links da página de produto. Preço vazio, zero, “grátis” ou “gratuito/a” identifica arquivos gratuitos. Produtos com outros preços conservam seu fluxo existente.
- CMS: `admin/config.yml` contém uma configuração preliminar de Netlify CMS para JSON em `content/partituras`. Atualmente **não há um publicador que transforme esses JSON em páginas públicas**. Quando um registro for renderizado com o modelo existente ou como link de download em uma página com o script compartilhado, o modal será automático. Apenas salvar um JSON não publica uma página; isso é uma limitação anterior a esta alteração.
- Editor: o GrapesJS importa o HTML existente; não foi introduzido outro editor ou gerador.

O sistema está em uma única função isolada, `scoreContributionSystem`, no final de `scripts/script.js`. Um listener delegado em fase de captura identifica os downloads, inclusive links inseridos depois do carregamento. O único `<dialog>` é criado sob demanda e reutilizado. A folha `styles/score-contribution.css` usa seletores próprios e é carregada pelo script, sem alterar as folhas existentes ou dezenas de páginas.

## Downloads e novas páginas

Mantenha o padrão existente:

```html
<a href="../assets/partituras/minha-partitura.pdf" download>Baixar partitura</a>
<script src="../scripts/script.js"></script>
```

Downloads PDF (incluindo `/assets/uploads`, data URLs PDF e links externos) e downloads identificados como partituras são reconhecidos automaticamente. O site continua sem bloqueio de acesso aos PDFs. Ações de visualizar PDFs, navegar para páginas e baixar capas não são interceptadas. O menu contextual e o endereço direto continuam sendo recursos nativos do navegador.

Para URLs sem extensão ou componentes futuros, use metadados opcionais:

```html
<a href="/arquivo/123" download="partitura.pdf"
   data-free-score="true" data-score-id="123"
   data-score-title="Título da partitura">Baixar partitura gratuita</a>
```

`data-free-score="false"` exclui um link. `data-score-contribution="off"` exclui um link ou uma seção. Não marque produtos pagos como gratuitos. Para controles JavaScript futuros, `window.ScoreContribution.open(linkExistente)` usa o mesmo reconhecimento e o mesmo modal; `window.ScoreContribution.close()` fecha sem baixar.

A retomada usa uma âncora temporária com a URL absoluta original, o atributo `download` original (inclusive o nome do arquivo), `target`, `rel` e `referrerpolicy`. Um `WeakSet` impede a reabertura do modal. Não há `fetch` do PDF, troca de URL, armazenamento de pagamento nem validação obrigatória para o download. Arquivos externos continuam sujeitos às regras nativas do navegador sobre o atributo `download`.

Sem JavaScript, sem suporte a `<dialog>` ou em caso de falha no carregamento do CSS, o link continua oferecendo acesso gratuito. Nenhuma alteração é feita em URLs canônicas, metadados SEO ou arquivos PDF.

## PIX manual existente

O objeto `PIX`, no início de `scoreContributionSystem`, centraliza a configuração. A chave e o QR Code foram reaproveitados de `pages/doacao.html`; não foram inventados dados bancários, gateway ou credenciais.

Ao clicar em “Contribuir via PIX e baixar”:

1. O valor é validado e convertido em centavos. Aceita vírgula/ponto decimal e formato brasileiro com milhares.
2. A segunda etapa mostra o valor escolhido, o QR Code existente e a chave para copiar.
3. A pessoa realiza a transferência no aplicativo bancário e confere destinatário e valor. O QR Code existente **não é gerado novamente para o valor selecionado**.
4. “Continuar gratuitamente” baixa o PDF original a qualquer momento, inclusive sem transferência. Não há confirmação automática ou solicitação de comprovante.

O comentário **PONTO DE INTEGRAÇÃO FUTURA**, em `startPixContribution`, indica onde integrar um backend recebendo `{ score: selectedScore, amountCents }`. Não coloque tokens privados no navegador nem confie em uma confirmação de pagamento feita no cliente. Uma futura integração deve preservar a opção gratuita sem exigir pagamento.

Se a chave ficar vazia, a segunda etapa informa indisponibilidade e mantém o download gratuito. Falha de imagem oculta o QR Code, preservando a chave. Falha da área de transferência seleciona a chave para cópia manual.

## Acessibilidade

O `<dialog>` modal nativo torna a página de fundo inerte. O título recebe o foco ao abrir; Tab/Shift+Tab ficam no modal, setas funcionam nas opções e Escape fecha. X e clique fora também fecham sem iniciar download. O foco retorna ao link acionado; a posição de rolagem e estilos de rolagem anteriores são restaurados. O conteúdo admite rolagem interna em telas pequenas, enquanto o botão gratuito e o aviso de gratuidade permanecem visíveis. Há estados de foco visíveis e respeito à preferência por movimento reduzido.

## Pendências anteriores nos PDFs

Os endereços originais foram preservados. Já estavam ausentes no repositório:

- `assets/partituras/exemplo.pdf`, usado por nove páginas do Tempo Comum.
- `assets/partituras/33-Domingo-TC-Para-mim-so-ha-um-bem.pdf`.
- A partitura de Comunhão do 2º Domingo do Advento.
- A partitura de Comunhão do 3º Domingo do Advento.
- O exemplo do CMS em `/assets/uploads/exemplo-partitura.pdf`.

Esses links precisam receber seus arquivos corretos para que o download funcione; o modal não substitui PDFs ausentes.

## Verificação

`tools/test_score_contribution.py` executa testes com Playwright e um servidor HTTP temporário local. Requer Python, o pacote `playwright` e seus navegadores Chromium/WebKit; não adiciona dependências de produção ao site.

```sh
python3 tools/test_score_contribution.py
```

O teste cobre download real e conteúdo do PDF, opções de valor, validação, PIX manual, fechar/reabrir, foco, links dinâmicos, cadastro local, exclusão de produtos pagos, telas pequenas e degradação sem CSS/JavaScript. Também confere os links públicos existentes. As capturas para revisão ficam na pasta temporária indicada na saída.

Resultado em 29/09/2026: suíte completa aprovada em Chromium e WebKit, com emulação de telas de 320, 390 e 768 px, além do desktop de 1280 px. Os 41 links públicos reais (fora o modelo) abriram o modal e retomaram a URL original; 12 deles já apontavam para PDFs ausentes. Os downloads dos arquivos existentes e dos uploads foram comparados por hash, incluindo o fluxo PIX manual. Também passaram a cópia de chave, o fallback de cópia manual e o download sem CSS/JavaScript. Não houve transferência financeira nem teste em aparelho físico.

Na página antiga `advento-1-entrada.html`, a revisão detectou sobreposição de elementos sobre o botão original em 320 px, anterior ao modal. O layout dessa página foi preservado. Ela foi testada em desktop e em 390 px; a matriz completa de tamanhos do modal usa a página de Pater Noster, com o layout responsivo mais recente.
