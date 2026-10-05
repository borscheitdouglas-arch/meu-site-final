# Padrão das páginas de Entrada e Comunhão

Versão de 3 de outubro de 2026, aprovada pelo usuário para publicação após a avaliação da prévia local.

## Abrangência

14 páginas existentes: Entrada dos quatro domingos do Advento; Comunhão dos domingos 1, 2 e 3 do Advento e 10, 12, 22, 23, 26, 28 e 29 do Tempo Comum. As páginas de calendário e os outros repertórios mantêm seus próprios layouts.

O padrão está em `styles/liturgical-song.css` e `scripts/liturgical-song.js`. Todas as 14 páginas usam esses arquivos, inclusive a referência do 29º Domingo. Os PDFs originais não foram alterados. As miniaturas em `assets/img/partituras/` foram extraídas da primeira página de cada PDF.

## Identidade e comportamento

- Fundo escuro, dourado discreto, título em Cinzel, leitura em Spectral e controles em Inter.
- Arte original do carrossel correspondente ao tempo litúrgico, vídeo centralizado e carregado somente ao abrir o player.
- Ícone eucarístico transparente nas páginas de Comunhão. Nas páginas individuais dos demais cantos (Entrada, Ofertório, Ordinário e outros), usar `assets/img/Icones/Icone - Livro de canto entre arabescos dourados.png` como adorno do cabeçalho, com a classe `chant-divider`, dimensões originais de 2187 × 719 e `alt=""` por ser decorativo.
- Capa adaptável aos títulos longos; o player mantém a proporção 16:9.
- Partitura com miniatura, informações reais do arquivo, prévia, abertura em nova aba e download com contribuição opcional.
- Textos das meditações, fontes, créditos e encerramentos preservados.
- Animações breves, sem repetição contínua, desativadas por `prefers-reduced-motion`.
- Menu com controle de foco, Escape, áreas inativas fora do menu aberto e link para pular ao conteúdo.

## Recursos pendentes

As Comunhões do 2º e 3º Domingo do Advento não têm o PDF no projeto. Exibem “Partitura em breve — No tempo certo, a partitura será publicada aqui”, sem link de download inexistente. Os caminhos esperados permanecem em `data-pending-score`.

Para uma página sem vídeo, usar o seguinte conteúdo estático, acessível também sem JavaScript:

```html
<section class="chant-media" id="ouvir-canto" aria-labelledby="video-title">
  <div class="chant-pending">
    <h2 id="video-title">Vídeo em breve</h2>
    <p>No tempo certo, o vídeo será publicado aqui.</p>
  </div>
</section>
```

Ao inserir um vídeo, usar o bloco completo de uma página existente, atualizando `data-video-id`, `data-video-src`, `data-video-title`, título da capa e link externo. Preservar parâmetros existentes da URL. O script também mostra o aviso se o identificador estiver vazio. O vídeo funciona independentemente da existência de partitura.

Os links de YouTube existentes foram mantidos. Não houve verificação da disponibilidade pública das estreias. O aviso de novas publicações às segundas-feiras não atribui uma data individual a cada vídeo.

## Validação

- `python3 tools/audit_site.py`: auditoria global de arquivos, links locais, âncoras e estrutura.
- `python3 tools/test_liturgical_song.py`: requer Playwright e Chromium instalados. Servidor temporário local, telas de 1440, 768, 390 e 320 px, centralização, ausência de transbordamento, abertura e fechamento de vídeo e prévia, downloads comparados por SHA-256, menu por teclado, movimento reduzido, ausência de vídeo e navegação sem JavaScript. Serviços externos ficam bloqueados neste teste.
- Revisão visual adicional no Chromium com as fontes carregadas, em computador e celular.
- Comparação do texto das meditações e encerramentos com os arquivos anteriores: sem alterações.

## Pendências editoriais anteriores ao novo visual

Os títulos das páginas de Entrada do 2º e 3º Domingo do Advento divergem dos títulos nos PDFs vinculados: respectivamente “A Vós Senhor elevo a minha alma” / “Povo de Sião” e “Eis que o Senhor vem” / “Alegrai-vos sempre no Senhor”. Os títulos e os arquivos originais foram preservados para evitar alterar a seleção litúrgica nesta padronização visual. As três páginas de Comunhão do Advento também compartilham o mesmo identificador de vídeo já existente. Essas associações merecem uma revisão editorial separada.
