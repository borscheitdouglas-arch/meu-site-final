# Operação manual dos pedidos pagos — VAVI

O pagamento deve ser confirmado por webhook autenticado do Mercado Pago antes
de um pedido constar no painel de administração.

1. Acesse `/pages/admin-pedidos-loja.html` e autentique-se com a chave
   administrativa `SHOP_ADMIN_API_KEY`. A chave nunca é armazenada no site.
2. Abra um pedido com status **paid** e confira os dados da entrega.
3. Acesse a VAVI e crie uma ordem real, conferindo previamente
   personalização, produto, estoque, frete, custos e destino.
4. Depois que a VAVI confirmar a criação da ordem, copie o identificador da
   ordem para o campo do painel e confirme o registro.
5. O servidor aceitará esse registro **somente para pedido de produção já pago**,
   atualizará o estado para `vavi_draft` e rejeitará outro identificador
   para o mesmo pedido. Também há índice único contra reutilização do
   identificador VAVI entre pedidos de produção.

Esse fluxo **não transmite nem compra automaticamente na VAVI**.
Não marque antes de criar a ordem na VAVI, ou você poderá impedir o
tratamento correto sem suporte administrativo. Reembolsos, estornos e
cancelamentos ainda dependem de procedimento operacional próprio.

**Continua não permitido ativar o checkout apenas porque essa melhoria foi
publicada**: verificar dados fiscais e identificação comercial, disponibilidade
real do produto, antiabuso e um pagamento de ponta a ponta antes de
abrir cobranças.