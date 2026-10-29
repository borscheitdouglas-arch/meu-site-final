# Implantar a API da loja em um Worker existente (sem DNS)

## Ambiente criado pelo proprietário
- Cloudflare Worker: `douglas-loja-api`
- Endereço: `https://douglas-loja-api.liturgia-gregoriano.workers.dev`
- D1: `douglas-loja-db`, vinculação `DB`
- Tabelas: `products` e `variants` (confirmadas em 29/10/2026)
- Site público: GitHub Pages, sem alteração de DNS.

## Conectar o Worker ao repositório

Cloudflare > Workers & Pages > douglas-loja-api > Settings > Builds > Connect GitHub.

Escolher:
- GitHub: `borscheitdouglas-arch/meu-site-final`
- Branch: `main`
- Root directory: `integrations/vavi-worker`
- Build command: `npm install`
- Deploy command: `npx wrangler deploy`

A configuração `integrations/vavi-worker/wrangler.toml` fornece o **mesmo nome de Worker** e o ID do banco D1 já criado. Verificar tudo antes de salvar a conexão. O deploy inicial substituirá o script de diagnóstico Hello World pelo código de catálogo **sem pagamentos**.

## Teste após implantação

- Abrir `https://douglas-loja-api.liturgia-gregoriano.workers.dev/health`.
- Resposta esperada contém `"ok":true`, `"mode":"preview"`, `"payments":false`, `"vaviOrders":false`.
- `/api/catalog` retorna `products: []` até cadastro aprovado.
- Nenhuma chave Mercado Pago ou VAVI deve ser inserida ainda.

## Cuidado com GitHub Actions

O GitHub Pages continuará publicando apenas os arquivos estáticos do site. O Cloudflare Builds executará código de Worker a partir da subpasta indicada. **Nunca configure a raiz do repositório como raiz de Worker**.

NÃO ativar endpoints de checkout ou de webhooks até persistência de pedidos, frete validado e revisões de segurança.