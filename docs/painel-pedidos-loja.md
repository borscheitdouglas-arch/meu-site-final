# Painel de pedidos pagos — operação manual VAVI

Página administrativa: `/pages/admin-pedidos-loja.html`.

## Segurança
- O painel **não permite compras, estornos ou alteração dos pedidos**.
- A API exige o Secret `SHOP_ADMIN_API_KEY` com, no mínimo, 32 caracteres, configurado exclusivamente no Cloudflare Worker `douglas-loja-api`.
- O HTML/JS não contém a chave. O administrador a digita no painel, que a mantém somente em memória enquanto a página estiver aberta.
- A chamada usa HTTPS, `Authorization: Bearer` e CORS para o domínio da loja. O Worker só devolve detalhes da entrega de **pedidos efetivamente pagos no ambiente real**.
- O endereço completo só é decifrado quando um pedido pago é aberto por um administrador autorizado. O cliente não recebe acesso à página.
- Nenhuma senha, endereço, documento ou número de pedido deve ser publicado no GitHub ou em mensagens públicas.
- Não inserir o Access Token do Mercado Pago no painel: é outra credencial.

## Procedimento
1. Confirmar pagamento no sistema da loja e, se necessário, conferir a transação no painel de produção do Mercado Pago.
2. Abrir a página administrativa, inserir a chave própria da loja e consultar os pedidos.
3. Abrir o pedido pago desejado; copiar o endereço apenas quando necessário.
4. Conferir na VAVI a personalização, estoque, fabricação, frete, endereço e prazo antes de registrar a ordem.
5. Criar o pedido na VAVI **uma única vez**, pagar o custo do fornecedor e guardar o identificador para rastreio. Este painel ainda não marca o pedido como atendido.
6. Avisar o comprador do andamento, auxiliar em dúvidas, devoluções ou cancelamentos, conforme os termos da venda e as normas aplicáveis.
7. Clicar **Limpar acesso** depois de consultar os pedidos; evite manter a tela com dados pessoais aberta.

O painel é um primeiro instrumento operacional, **não substitui o gerenciamento de estornos e rastreamento**. O sistema deve continuar bloqueado até a empresa definir as políticas de dados, suporte, armazenamento, prazo e tratamento de incidentes.
