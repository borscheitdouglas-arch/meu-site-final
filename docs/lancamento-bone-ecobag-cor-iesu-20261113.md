# Lançamento — Boné e Ecobag Cor Iesu Sacratissimum
Data: 13/11/2026 · Loja: https://www.douglasassumpcao.com.br/pages/loja.html

## Variantes habilitadas
| SKU interno | Produto físico observado VAVI | Design VAVI | Custo sem desconto (R$) | Valor mostrado com desconto (R$) | Preço de venda (R$) |
|---|---|---|---:|---:|---:|
| `cor-iesu-bone-preto` | `0001447` (preto) | `D000008` | 44,90 | 44,00 | 79,90 |
| `cor-iesu-bone-azul-escuro` | `0001449` (azul-escuro) | `D000008` | 44,90 | 44,00 | 79,90 |
| `cor-iesu-ecobag-m` | `0000564` (M) | `D000009` | 19,90 | 19,50 | 39,90 |
| `cor-iesu-ecobag-g` | `0000565` (G) | `D000011` | 21,90 | 21,46 | 39,90 |

A margem bruta **antes de taxas de pagamento, tributos e custos operacionais** é, respectivamente, R$ 35,00, R$ 35,00, R$ 20,00 e R$ 18,00. O desconto de 2% do painel VAVI não é garantido: a integração considera o custo sem desconto.

Boné verde-escuro: **não homologado nem habilitado**.

## Homologações realizadas

- Capturas do fornecedor em 13/11/2026 associam os códigos físicos às variantes acima. O design G é separado do M.
- Integração do Worker ampliada para aceitar **somente** os quatro SKUs registrados com preços pré-aprovados, e validação de custo, fornecedor e frete privados no D1.
- O servidor reconsulta o frete antes de gerar o pagamento e mantém pedidos dos acessórios limitados a **uma unidade por pedido**, enquanto o pacote combinado não for homologado.
- O fluxo de pagamento da loja segue pela **InfinitePay**.
- Worker publicado: versão `728a6d1b-68db-459b-8758-0855213f88b6`, implantação `4620bf66-0bc3-4288-8759-91879d865dc8`; bindings anteriores preservados.
- Quatro consultas de frete em produção retornaram HTTP 200, cada uma com quatro opções de entrega, sem cobrança ou pedido. Evidência: https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/43465833515
- Após ativação, readiness público informou os quatro SKUs, provedor InfinitePay e indisponibilidade do verde. Evidência: https://github.com/borscheitdouglas-arch/meu-site-final/actions/runs/43466708411
- D1: produtos `enabled=1`, `verified=1`; quatro variantes `available=1`; custo e logística das quatro linhas `freight_config_verified=1`.

## Atenção à operação real

1. A loja vende sob demanda; **após o pagamento validado**, a integração prepara um rascunho do pedido VAVI com o design indicado no nome do item.
2. O lojista precisa **conferir o modelo físico, a cor/tamanho, a arte e o frete no painel VAVI, vincular a estampa e pagar a produção**. O checkout não promete fabricação automática.
3. Verificar variações de lote e tonalidade nas fotos e custos. As dimensões base usadas na cotação são as fichas conhecidas do fornecedor, não uma medição do pacote final; absorver eventual diferença na operação assistida.
4. Não houve pagamento real de ponta a ponta feito por este procedimento; as verificações foram sem cobrança.
5. Não divulgar o fornecedor nas páginas da loja. Documentação técnica de bastidor pode citar a VAVI.
6. Se surgirem erros de frete/produção ou preço incompatível, interromper somente os acessórios: `UPDATE products SET enabled=0,verified=0 WHERE id IN ('bone-cor-iesu-sacratissimum','ecobag-cor-iesu-sacratissimum');` e `UPDATE variants SET available=0 WHERE sku IN ('cor-iesu-bone-preto','cor-iesu-bone-azul-escuro','cor-iesu-ecobag-m','cor-iesu-ecobag-g');`, depois refletir a suspensão na vitrine.

## Links

- Boné: https://www.douglasassumpcao.com.br/pages/produto-loja.html?id=bone-cor-iesu-sacratissimum
- Ecobag: https://www.douglasassumpcao.com.br/pages/produto-loja.html?id=ecobag-cor-iesu-sacratissimum

### Segurança

**Nunca** anexar tokens de API, chave do InfinitePay, dados de comprador ou segredo de webhook aos testes ou repositório público.
