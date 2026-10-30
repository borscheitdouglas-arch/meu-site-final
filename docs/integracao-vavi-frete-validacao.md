# Frete VAVI: requisitos e bloqueios antes de ativar checkout

Verificação em 29/10/2026 (Brasil).

## Evidência pública da VAVI

- https://www.vaviestampas.com.br/guides/integrations — API própria recebe pedidos como rascunhos; no portal é necessário escolher frete e gerar produção.
- https://www.printbee.com.br/policies/shipping-policy — frete varia conforme CEP, peso, dimensões e transportadora, exibido antes da conclusão do pedido.
- https://www.printbee.com.br/products/brindes — caneca branca de porcelana 350 ml por sublimação; **o texto oficial diz explicitamente que a sublimação não integra o programa print-on-demand DTF/DTG**. Confirmar com a VAVI se caneca avulsa pode entrar na mesma operação; não anunciá-la como POD automática até confirmação.

## Endpoint de cotação

Nas capturas do usuário, a documentação https://developers.vaviestampas.com.br, seção **Pedidos**, lista **Frete**. A documentação pública HTML desse portal não pôde ser extraída pelas ferramentas disponíveis; **não inventar URL, método, campos, parâmetros ou autenticação para cotação**.

Precisamos obter do portal VAVI (ou suporte) o contrato exato do endpoint de frete:
1. Método e caminho, inclusive URL base;
2. Payload de origem/destino (CEP), produtos ou peso/dimensões, quantidade e se o cálculo depende do catálogo VAVI;
3. Se uma credencial `ApiClient` criada em Integrações pode usar o endpoint, e requisitos de autenticação;
4. Estrutura de resposta: frete, serviço/transportadora, prazo, código de escolha; indicação de prazo de produção separado;
5. Como confirmar essa opção ao converter um rascunho em pedido no portal e se a cotação expira.

## Arquitetura planejada

Cliente entra no site HTML hospedado no GitHub Pages e informa CEP. Frontend chama o Worker Cloudflare, nunca a VAVI diretamente. Worker autentica via segredo `VAVI_CLIENT_ID` e `VAVI_CLIENT_SECRET` em runtime, consulta transportadoras, valida itens e retorna opções saneadas ao cliente, sem expor tokens. Servidor cria preferência Mercado Pago cobrando produtos e frete escolhidos; webhook Mercado Pago confirma o pagamento pelo lado do servidor; só então envia pedido como rascunho à VAVI para conferência manual. O valor do carrinho é calculado no backend com preços verificados, nunca confiando em preços enviados pelo browser.

**Situação atual:** Worker apenas catálogo/quote, sem pagamentos nem pedidos. Não publicar carrinho ou taxas estimadas como cobranças reais. Não implementar chamadas externas sem contrato da API.

## Perguntas para suporte, caso necessário

“Possuo loja própria HTML + Cloudflare Worker e credenciais ApiClient. A documentação da área Frete disponibiliza cotação de frete por CEP para um carrinho ANTES de criar pedido/rascunho? Qual endpoint, método, payload de produtos, formato de resposta, autenticação e validade do preço? Posso passar o código do serviço escolhido ao pedido ou selecionar manualmente depois? A caneca branca 350 ml aceita produção unitária via integração print-on-demand, ou somente pedido avulso/por quantidade?”
