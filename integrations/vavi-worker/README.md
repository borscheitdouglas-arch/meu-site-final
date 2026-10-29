# API de prévia da coleção VAVI

Projeto separado do GitHub Pages para a integração futura da loja Douglas Assumpção.

**Importante:** esta API está em modo de prévia. Não há checkout, webhook de pagamento, dados pessoais, nem envio à VAVI. É intencional que o sistema ainda não aceite pedidos.

## O que está implementado

- `GET /health`: confirma que a API opera em modo de prévia.
- `GET /api/catalog`: retorna somente itens ativados e conferidos no banco.
- `POST /api/quote`: recebe apenas `items: [{sku, quantity}]`, valida valores no banco e devolve subtotal em centavos.
- Banco Cloudflare D1 com tabelas `products` e `variants`.
- Testes unitários de validação e precificação.

**A resposta de /api/quote não é um preço final nem reserva de produto.** Frete e pagamentos permanecem desativados. Nunca confiar em preços enviados pelo navegador.

## Como testar localmente (sem gastar ou vender)

Requisitos: Node.js compatível e npm.

1. Entre na pasta: `cd integrations/vavi-worker`.
2. Execute `npm install` para instalar Wrangler (se for executar o Worker).
3. Execute `npm test` para validar as funções de preços e carrinho.
4. Faça uma cópia de `wrangler.toml.example` chamada `wrangler.toml`.
5. Crie um banco D1 de testes pela Cloudflare: `npx wrangler d1 create douglas-vavi`.
6. Substitua o campo `database_id` no seu `wrangler.toml` pelo identificador real fornecido.
7. Crie as tabelas localmente: `npx wrangler d1 execute douglas-vavi --local --file=./schema.sql`.
8. Execute `npm run dev` e abra `http://localhost:8787/health`.

Não é necessário fazer os passos de implantação agora. **Não existe produto cadastrado**, portanto o catálogo será vazio até aprovarmos peças reais.

## Fluxo de integração planejado

1. Seleção de produto e variante no site.
2. Cotação de frete e validação de produtos/preços no servidor.
3. Criação de pedido persistente no banco.
4. Criação da preferência de pagamento Mercado Pago pelo servidor.
5. Verificação de webhook e consulta ao pagamento, conciliando valor, status e pedido.
6. Criação idempotente do rascunho VAVI, com código único e mapeamento de itens.
7. Você seleciona o produto real, vincula estampa e frete e libera/paga a produção no painel VAVI.
8. Acompanhamento de status e envio de comunicação ao cliente.

O fluxo financeiro não será desenvolvido nem ativado sem revisar o contrato da API da VAVI, as regras reais do frete, as políticas de devolução, a segurança e as credenciais do gateway.

## Segredos e LGPD

- Guardar `Client Secret` da VAVI e tokens de Mercado Pago exclusivamente nos **Secrets** do backend.
- Não publicar segredos em GitHub, HTML, frontend, capturas ou arquivos de configuração.
- Não guardar CPF, email, telefone, endereço ou outros dados pessoais no `localStorage` ou logs.
- Implementar proteção contra reenvio de webhooks, inconsistência de valores e repetição de pedidos.
- CORS é permitido apenas para os domínios explicitamente configurados na variável `ALLOWED_ORIGINS`.
- Antes de coletar dados pessoais, configurar regras de privacidade, retenção e acesso.

Referências:
- Cloudflare D1: https://developers.cloudflare.com/d1/get-started/
- Wrangler: https://developers.cloudflare.com/workers/wrangler/configuration/
- VAVI, integrações: https://www.vaviestampas.com.br/guides/integrations
