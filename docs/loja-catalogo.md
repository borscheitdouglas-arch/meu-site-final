# Catálogo da loja

A fonte do catálogo é `content/store-products.json`, com `"version": 1` e uma lista `products`. Somente registros com `status: "published"` aparecem na loja; `"draft"` mantém o produto fora da página. A ordem dos registros define a ordem dos cards.

Um produto publicado recebe o layout de destaque. Com vários produtos publicados, a loja passa a exibir uma grade de cards.

## Adicionar um título

1. Acrescente um registro em `products`, inicialmente com `status: "draft"` e um `id` exclusivo.
2. Complete título, subtítulo, autor, descrição, categoria e formato. Prepare uma imagem local na proporção **4:5**, usando um caminho como `/assets/img/Produtos/nome-do-produto.png`, e descreva-a em `image_alt`.
3. Preencha `retailers` com o nome de cada loja e o endereço **HTTPS** da página de compra do produto.
4. Quando arte, informações e links estiverem prontos, altere o status para `"published"` e execute na raiz do projeto:

```sh
python3 tools/generate_store.py
python3 tools/generate_store.py --check
python3 -m unittest discover -s tools -p test_store_catalog.py
```

Confira a página em computador e celular antes de publicar o site. O gerador atualiza os arquivos locais; não faz o envio ao servidor.

## Exemplo de rascunho

O registro abaixo é **apenas um exemplo fictício**, não um produto do catálogo. Substitua todos os dados, a imagem e o endereço antes de publicar.

```json
{
  "id": "exemplo-caderno-de-partituras",
  "status": "draft",
  "title": "Título de exemplo",
  "subtitle": "Subtítulo de exemplo",
  "author": "Nome do autor",
  "description": "Apresentação breve do futuro livro de partituras.",
  "category": "Partituras",
  "format": "Livro físico",
  "image": "/assets/img/Produtos/exemplo-caderno.png",
  "image_alt": "Descrição da arte do futuro livro de partituras.",
  "retailers": [
    {
      "name": "Loja de exemplo",
      "url": "https://example.com/produto"
    }
  ]
}
```

## Manutenção

Não edite manualmente o conteúdo entre `STORE_CATALOG_START` e `STORE_CATALOG_END` em `pages/loja.html`: ele é gerado a partir do JSON. Para retirar um produto da loja, volte seu status para `"draft"` e execute novamente os comandos acima.

Por enquanto, apenas **O Canto Como Mística** deve estar publicado. Os futuros títulos serão adicionados quando estiverem prontos: não existe agendamento automático para a próxima semana.
