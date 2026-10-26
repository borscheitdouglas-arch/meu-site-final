# Sitemap e publicação

## Estrutura auditada

O projeto é um site estático, sem build de aplicação: `index.html` e
`politica-de-privacidade.html` ficam na raiz; os conteúdos públicos ficam em
`pages/`. `assets/`, `styles/`, `scripts/` e `content/` fornecem recursos e dados.
`admin/` e `editor/` são ferramentas; `docs/`, `tools/` e `prompt/` são suporte ao
desenvolvimento. Os arquivos `.bak` são backups, não páginas públicas canônicas.
Não há páginas independentes `/livros`, `/liturgia` ou `/partituras`: não se devem
inventar essas URLs. O livro publicado está em `/pages/loja.html`.

A raiz do repositório corresponde à raiz pública: o HTML obtido de `/` é idêntico
(SHA-256) ao `index.html` local; `docs/` contém documentação e não uma aplicação.
O histórico público do GitHub registra `pages build and deployment` na branch
`main`. O endpoint de configuração do Pages exige acesso autenticado e retornou
404; portanto, a seleção exata em Settings não foi lida. Ao publicar, confira
Settings → Pages → Deploy from a branch → `main` / `(root)`.
Não foi alterado o mecanismo de implantação.

O `CNAME` contém `www.douglasassumpcao.com.br`. A consulta HTTP confirmou que
`https://douglasassumpcao.com.br/` retorna 301 para a versão HTTPS com `www`, que
retorna 200. Essa é a origem usada pelo gerador. Os dois arquivos `robots.txt` e
`sitemap.xml` retornavam 404 antes desta implementação.

## Critérios

- O sitemap contém somente URLs absolutas HTTPS, sem fragmentos, parâmetros ou
  duplicação de `/` com `/index.html`.
- Inclui páginas HTML da raiz e de `pages/`, inclusive subpastas públicas.
- Exclui ferramentas, backups, nomes de teste/rascunho, páginas com `noindex`,
  redirecionamentos HTML, modelos, produtos removidos e o carrinho.
- As versões `advento-1-video` e `advento-2-video` repetem seus índices sem o
  sufixo `-video` e são excluídas.
- Páginas com o marcador `editorial-empty` e textos de exemplo são excluídas.
  `gloria.html` e `sao-pedro-e-sao-paulo.html` também estão em preparação, conforme
  revisão manual, e constam na tabela `EXCLUDED` do gerador.
- `materia-nova.html`, apesar do nome, é um artigo real vinculado em Formações e
  está incluído. Páginas com reflexão/vídeo e apenas a partitura pendente continuam
  elegíveis. As quatro versões do Pater Noster têm partituras distintas.
- Os PDFs são acessíveis pelos artigos; o sitemap prioriza as páginas de contexto.
- Não há `lastmod`: mtime local, data de deploy e commits de formatação não
  comprovam a última alteração significativa do conteúdo. Também não se usam
  `priority` ou `changefreq`.
- Foram corrigidas somente as tags canonical de `advento-1-entrada.html`,
  `advento-3-entrada.html`, `advento-4-entrada.html` e `veni-veni-emmanuel.html`,
  que apontavam para `seu-dominio.com`. Nenhum conteúdo visual foi alterado.

O robots.txt permite o rastreamento público e restringe admin, editor, tools,
prompt e backups; declara o sitemap absoluto. Excluir uma URL do sitemap ou
bloquear seu rastreamento **não garante sua remoção do Google**. Caso se queira
remover páginas já indexadas, é necessário tratar `noindex`/404 separadamente;
robots.txt também não substitui autenticação.

## Atualizar e validar

Requer Python 3.9 ou posterior, sem instalar pacotes. Na raiz:

```sh
python3 tools/generate_sitemap.py
python3 tools/generate_sitemap.py --check --explain
python3 -m unittest discover -s tools -p test_sitemap.py
```

O primeiro comando descobre páginas novas e remove arquivos apagados. Revise as
URLs antes de enviar. Para páginas privadas ou rascunhos, use `noindex` ou
acrescente o caminho e o motivo em `EXCLUDED`. Quando uma página em preparação
ganhar conteúdo, remova o marcador vazio e, se houver, sua exclusão explícita.
Novas pastas públicas fora de `pages/` precisam ser adicionadas à descoberta.
Canonicals conflitantes interrompem a geração para evitar URLs contraditórias.

O workflow `check-sitemap.yml` roda nos pushes à main e nos pull requests para
avisar quando o XML versionado estiver desatualizado. Ele não gera commits, não
publica e não bloqueia por si só o deploy nativo do Pages. Rode o gerador e envie
o XML junto com as páginas. Não se depende de commits feitos com `GITHUB_TOKEN`
para disparar o GitHub Pages.

## Publicar

Revise e faça commit dos seis arquivos novos (`sitemap.xml`, `robots.txt`, o
gerador, seus testes, este documento e o workflow) e dos quatro HTMLs com as tags
canonical corrigidas. Envie para `main` e aguarde `pages build and deployment`
concluir. Existem outras alterações locais anteriores a esta tarefa: revise-as
separadamente e evite `git add .` sem conferir.

Após a implantação:

```sh
curl -I https://www.douglasassumpcao.com.br/sitemap.xml
curl -I https://www.douglasassumpcao.com.br/robots.txt
```

Ambos devem retornar HTTP 200. O primeiro deve apresentar XML, não a página de
erro, e o segundo deve conter a diretiva `Sitemap` com o domínio correto.
No Search Console, selecione a propriedade verificada, acesse **Sitemaps** e
envie `https://www.douglasassumpcao.com.br/sitemap.xml`. Acompanhe o processamento
e inspecione algumas URLs. A descoberta não garante a indexação de todas elas.

Referência: [Google Search Central — Criar e enviar um sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=pt-br).
