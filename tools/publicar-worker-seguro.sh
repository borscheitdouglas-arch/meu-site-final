#!/usr/bin/env bash
# Publica somente o Worker com as alterações já aprovadas nos testes.
# Não libera produtos, pagamentos nem pedidos reais: flags de produção continuam privadas.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/integrations/vavi-worker"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js e npm são necessários para publicar o Worker." >&2
  exit 1
fi
printf '\n[1/3] Instalando as dependências declaradas...\n'
npm install --no-audit --no-fund
printf '\n[2/3] Validando checkout, preços, frete e webhooks...\n'
npm test
printf '\n[3/3] Publicando o Worker no Cloudflare...\n'
npx wrangler deploy
printf '\nWorker publicado. Vendas continuam BLOQUEADAS até a homologação e aprovação comercial.\n'
printf 'Verifique o painel administrativo da loja para consultar as pendências.\n'
