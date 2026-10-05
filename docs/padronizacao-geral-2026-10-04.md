# Padronização visual geral — 4 de outubro de 2026

Versão avaliada e aprovada pelo usuário para publicação pelo terminal.

## Abrangência

88 páginas adicionais receberam a identidade das páginas de Entrada e Comunhão:

- 8 páginas de canto: quatro versões do Pai-Nosso, Kyrie I, Sanctus I, Agnus Dei I e Veni Veni Emmanuel.
- 80 páginas editoriais: repertórios, domingos e tempos litúrgicos, formações, início, contato, contribuição, privacidade e páginas de loja já existentes.

Somadas às 14 páginas de Entrada e Comunhão já publicadas, são 102 páginas públicas com a identidade compartilhada. A administração e os dois arquivos de modelo (`pages/template.html` e `pages/A-pagina-mestre.html`) não foram redesenhados. A loja continua oculta no cabeçalho, conforme a configuração existente.

## Estrutura e manutenção

- `styles/liturgical-song.css` e `scripts/liturgical-song.js`: padrão das 22 páginas de canto. Vídeo centralizado carregado sob demanda, capa com arte existente, miniatura real da partitura, prévia nativa de PDF e downloads originais.
- `styles/site-editorial.css`: cores, tipografia, cards, leitura longa, formulários, avisos de preparação e responsividade das outras páginas.
- `scripts/site-editorial.js`: foco do menu, Escape, navegação por teclado e áreas inativas com o menu aberto.
- O menu continua usando a imagem original da Visitação e o acabamento publicado anteriormente em `styles/style.css`.
- As artes existentes são usadas de acordo com o tempo litúrgico. Não foram inventados novos vídeos, partituras, datas de publicação ou créditos musicais.

45 páginas têm avisos de preparação com o nome correto da celebração e link para explorar o material disponível. Quatro antigas páginas de preparação agora dão acesso ao conteúdo que já existia: Kyrie, Sanctus, Agnus Dei e 1º Domingo do Advento.

As oito novas páginas de canto preservam integralmente os textos das meditações e encerramentos. A política de privacidade recebeu apenas alterações visuais e de navegação; seus textos foram preservados. O formulário de contato continua abrindo o aplicativo de e-mail e agora explica esse comportamento antes do envio.

As miniaturas em `assets/img/partituras/` foram extraídas dos respectivos PDFs, que não foram modificados. Os controles nativos dos PDFs continuam disponíveis; as novas páginas também oferecem tela cheia quando o navegador permite, além de abertura em nova aba.

## Verificações realizadas

- Auditoria dos 106 arquivos HTML e de 8.504 referências locais: nenhum erro de arquivo ou âncora. Os três PDFs pendentes anteriores continuam identificados.
- `tools/test_editorial_pages.py`: 88 páginas adicionais em 1440, 390 e 320 px, com verificação de transbordamento, erros locais e navegação do menu.
- `tools/test_liturgical_song.py`: 22 páginas de canto em quatro larguras; abertura e fechamento do vídeo, prévia, download real e comparação SHA-256 com cada PDF original, menu e redução de movimento.
- `tools/test_site.py`: navegação geral, prévia e download, cópia de PIX e carrinho. Nenhuma mensagem foi enviada e nenhum pagamento foi realizado.
- Revisão visual com fontes carregadas no Chromium e no WebKit, em computador e celular.
- Conferência específica de Formações, Contato, validação local dos campos, tela cheia da partitura e redução de movimento.

## Limites da revisão

Os vídeos externos não foram reproduzidos para verificar suas estreias. Endereços externos e informações editoriais já existentes foram mantidos; esta etapa não verifica autoria de contas sociais, conteúdo jurídico, preços ou correspondência litúrgica entre cada texto e o vídeo. As divergências editoriais anteriores das páginas do Advento permanecem documentadas em `docs/padrao-paginas-de-canto.md`.
