# Revisão do site — 2 de outubro de 2026

## Partitura do 26º Domingo do Tempo Comum

As quatro referências em `pages/tempo-comum-26-comunhao.html` foram atualizadas para:

`assets/partituras/TEMPO COMUM/26º Domingo do Tempo Comum/26° Domingo do Tempo Comum-Comunhão.pdf`

O nome da pasta usa `º` e o nome do arquivo usa `°`. Os endereços respeitam essa diferença. O PDF tem 330.940 bytes e é idêntico ao arquivo anterior registrado no Git. A pré-visualização respondeu com HTTP 200 e o download real foi comparado com o arquivo original.

## Correções feitas

- Caminhos de imagens, ícones e arabescos que apontavam para uma pasta antiga ou continham aspas indevidas.
- Logo da política de privacidade que apontava para `/mnt/data`, fora do site.
- Dez páginas do Tempo Comum com dois documentos completos concatenados. O conteúdo musical específico do 33º Domingo foi preservado.
- Cinco páginas da Páscoa com cabeçalhos HTML repetidos.
- Carregamento do script compartilhado nas páginas dos quatro primeiros domingos da Quaresma, restaurando o menu.
- Acentuação corrompida identificada nos menus, avisos e outros textos.
- Dados de exemplo na política de privacidade substituídos pelo nome e e-mail já publicados no site. Não foi feita revisão jurídica do texto.
- Layouts que ultrapassavam a largura de 390 px, incluindo vídeos, formações, artigos e filtros da loja.
- Botões de copiar PIX: algumas páginas não tinham a função; outras tentavam acessar o evento do clique depois de uma operação assíncrona. Agora compartilham uma função que recebe o botão e oferece a chave para cópia manual se o navegador negar acesso.
- Carrinho: chamada a função inexistente, leitura de preços como `R$ 1.234,56` e quebras de linha do pedido pelo WhatsApp. O teste intercepta a abertura do WhatsApp; nenhum pedido foi enviado.
- Exclusão do carrinho, modelo e produtos de exemplo da seleção automática de novas publicações do carrossel.

## Arquivos ainda necessários

Os três PDFs abaixo não existem no projeto. As páginas agora exibem um aviso de indisponibilidade, sem links ou visualizadores que retornem erro. Os caminhos esperados ficam preservados em `data-pending-score` e são listados pela auditoria.

| Página | Arquivo esperado dentro de `assets/partituras/` |
| --- | --- |
| Comunhão do 2º Domingo do Advento | `Advento/2° Domingo do Advento/2°Domingo_do_Advento-Comunhao.pdf` |
| Comunhão do 3º Domingo do Advento | `Advento/3º Domingo do Advento/3°Domingo_do_Advento-Comunhao.pdf` |
| 33º Domingo do Tempo Comum | `33-Domingo-TC-Para-mim-so-ha-um-bem.pdf` |

Os links para `exemplo.pdf` pertenciam aos documentos de exemplo duplicados e foram removidos com esses documentos.

## Limitações existentes identificadas

- O campo geral “Buscar...” no cabeçalho não tem implementação de pesquisa. A busca específica da loja é separada.
- O administrador usa armazenamento do navegador e senha definida no JavaScript. Ele não publica o cadastro para outros visitantes e não oferece autenticação de servidor. A configuração do CMS também não tem um gerador de páginas conectado, conforme já registrado em `docs/contribuicao-partituras.md`.
- Várias páginas informam que seu conteúdo ainda está em preparação; isso depende de material editorial.
- A loja continua oculta no cabeçalho por uma regra explícita existente em `styles/style.css`.

## Verificações e alcance

- Auditoria estática: **104 arquivos HTML**, **5.838 referências locais**, **zero erros ativos detectados**, **três PDFs pendentes**. Inclui estrutura principal, IDs duplicados, links, imagens, CSS, prévias, cabeçalhos PDF e JSON.
- Chromium: carregamento de **103 páginas** (páginas públicas, modelos e administrador), menus, erros JavaScript, respostas HTTP locais e largura de 390 px. Nenhuma falha ao final.
- Prévia e download real da partitura movida, nove botões PIX e cálculo/formatação do carrinho: aprovados.
- Suíte de contribuição: downloads, preservação do arquivo escolhido, valores PIX, foco, teclado, cadastro local, links dinâmicos, funcionamento sem CSS/JavaScript e telas de 320/390/768 px em Chromium e WebKit.
- `git diff --check`: aprovado.

Os testes de navegador bloqueiam serviços externos. Não validam disponibilidade de vídeos do YouTube, anúncios, destinos comerciais, envio de e-mail ou o editor GrapesJS que depende de scripts externos. Os testes foram feitos na cópia local; nenhuma publicação, commit ou push foi realizado.

## Repetir a verificação

Sem dependências adicionais:

```sh
python3 tools/audit_site.py
```

Com Playwright e seus navegadores instalados:

```sh
python3 tools/test_site.py
python3 tools/test_score_contribution.py
```
