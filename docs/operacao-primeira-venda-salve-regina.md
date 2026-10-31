# Primeira venda da Camiseta Salve Regina — procedimento assistido

Atualização: 30/10/2026 (horário do Brasil).

## O que está disponível no site

A Camiseta Salve Regina **preta, tamanho G, uma unidade** pode receber consultas de clientes por e-mail, através de `/pages/loja.html`. O formulário **não cria pedido, não efetua cobrança, não grava CEP no site, não cadastra cliente em D1**. Ele prepara uma mensagem para envio manual a `magister.douglas@gmail.com`, e permite copiar a mensagem quando o cliente não tem aplicativo de e-mail configurado.

O preço de R$ 109,90 é **preliminar**. Frete e custo VAVI não estão travados. A venda só deve ser oferecida quando o lojista confirmar custo, prazo, viabilidade e aceitar as condições com o comprador.

Moletom e caneca continuam em **pré-lançamento**. Não gerar cobrança para esses produtos.

## Passo a passo para concluir uma compra

1. Receba a mensagem com o CEP, tamanho G, cor preta e quantidade 1. Se o e-mail não chegar, não há pedido.
2. Entre na plataforma VAVI usando a conta do lojista, localize a peça personalizada, e confira a variação e **as duas estampas corretas** (partitura na frente, Nossa Senhora nas costas), material, disponibilidade e preço atualizado. Não use apenas SKU-base para presumir a configuração final.
3. Simule o **frete real para aquele CEP** diretamente na VAVI e confirme o prazo total de fabricação + transporte. Se a VAVI não permitir produzir/enviar para esse CEP ou não mantiver as duas estampas, **não cobre** o cliente.
4. Reconfirme margem, tarifas de recebimento e encargos; o preço ao cliente deve ser o previamente comunicado e aceito, incluindo frete.
5. Envie ao cliente uma proposta escrita com modelo, tamanho, quantidade, preço da peça, frete, **total**, prazo estimado e condições de suporte/trocas/devoluções aplicáveis. Solicite o endereço completo apenas após confirmação do pedido, por canal privado e seguro.
6. Se o cliente concordar, use sua **conta real do Mercado Pago**, seção Ferramentas para vender > Link de pagamento > Criar novo link. Informe título identificável, **valor total já combinado incluindo frete**, meios de pagamento e eventual vencimento. Compartilhe apenas o link oficial dessa cobrança. **Nunca** use link sandbox ou checkout privado.
7. Acompanhe a operação diretamente no painel de **produção** do Mercado Pago; só considere pago quando o próprio painel indicar pagamento aprovado. Comprovantes ou telas enviados pelo comprador não substituem a confirmação.
8. Após a aprovação, cadastre o pedido **manual** na VAVI, utilizando exatamente o endereço confirmado e a configuração aprovada. Pague a fabricação/frete na VAVI e guarde o número do pedido. Não envie duas vezes.
9. Acompanhe a produção e repasse rastreamento e suporte ao comprador. Em cancelamento, defeito ou falha, siga a legislação consumerista e as políticas publicadas, com estorno/reembolso quando cabível.

## Segurança e limites

- Este procedimento **não disponibiliza compra automática** no site.
- A solução é **semiautomática**: o cliente solicita, o lojista confirma e envia cobrança oficial; VAVI recebe um pedido manual.
- Não armazenar CPF, endereço, dados bancários ou comprovantes em GitHub, HTML público ou comentários de PR.
- Se o custo final VAVI, frete ou prazo não forem viáveis, comunicar ao cliente e não criar o link de pagamento.
- Evitar compartilhar o telefone existente em `scripts/cart.js` como contato oficial, pois `pages/contato.html` contém link de WhatsApp incompleto. O canal usado nesta fase é **o e-mail já publicado na página de contato**.

## Referências oficiais

- Mercado Pago, Links de pagamento: https://www.mercadopago.com.br/blog/criar-compartilhar-link-pagamento-mercado-pago
- Mercado Pago, incluir frete na cobrança: https://www.mercadopago.com.br/blog/estrategia-frete-link-pagamento
- VAVI, venda sob demanda: https://www.vaviestampas.com.br/guides/print-ondemand
- VAVI, frete e entrega: https://www.vaviestampas.com.br/policies/shipping-policy
