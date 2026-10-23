#!/usr/bin/env python3
"""Gera o catálogo estático da loja; rascunhos nunca aparecem no HTML."""
from __future__ import annotations

import argparse
import json
import re
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'content/store-products.json'
PAGE = ROOT / 'pages/loja.html'
START = '<!-- STORE_CATALOG_START -->'
END = '<!-- STORE_CATALOG_END -->'
TEXT_FIELDS = ('title', 'subtitle', 'author', 'description', 'category', 'format', 'image_alt')


def published_products(data: dict) -> list[dict]:
    if not isinstance(data, dict) or data.get('version') != 1 or not isinstance(data.get('products'), list):
        raise ValueError('Catálogo inválido: esperado version: 1 e products: lista.')
    seen, products = set(), []
    for product in data['products']:
        if not isinstance(product, dict):
            raise ValueError('Cada produto deve ser um objeto.')
        slug = product.get('id')
        if not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug in seen:
            raise ValueError('ID inválido ou repetido: ' + str(slug))
        seen.add(slug)
        if product.get('status') not in ('draft', 'published'):
            raise ValueError(f'{slug}: status deve ser draft ou published.')
        if product['status'] == 'draft':
            continue
        for field in TEXT_FIELDS:
            if not isinstance(product.get(field), str) or not product[field].strip():
                raise ValueError(f'{slug}: campo obrigatório {field}.')
        image = product.get('image', '')
        if not isinstance(image, str) or not image.startswith('/assets/') or '..' in Path(image).parts or '?' in image or '#' in image:
            raise ValueError(f'{slug}: imagem deve ser um caminho local em /assets/.')
        local_image = (ROOT / image.lstrip('/')).resolve()
        if not local_image.is_relative_to((ROOT / 'assets').resolve()) or not local_image.is_file():
            raise ValueError(f'{slug}: arquivo de imagem não encontrado.')
        retailers = product.get('retailers')
        if not isinstance(retailers, list) or not retailers:
            raise ValueError(f'{slug}: informe ao menos um link de compra.')
        for retailer in retailers:
            if not isinstance(retailer, dict) or not isinstance(retailer.get('name'), str) or not retailer['name'].strip():
                raise ValueError(f'{slug}: nome de loja inválido.')
            url = retailer.get('url')
            if not isinstance(url, str) or any(c.isspace() or ord(c) < 32 for c in url):
                raise ValueError(f'{slug}: URL inválida.')
            parsed = urlsplit(url)
            if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or '\\' in url:
                raise ValueError(f'{slug}: use um link HTTPS sem credenciais.')
        products.append(product)
    return products


def render_product(product: dict, first: bool) -> str:
    p = {key: escape(product[key], quote=True) for key in TEXT_FIELDS + ('id', 'image')}
    buttons = []
    for i, retailer in enumerate(product['retailers']):
        kind = 'primary' if i == 0 else 'secondary'
        buttons.append(
            f'<a class="atelier-buy atelier-buy-{kind}" href="{escape(retailer["url"], quote=True)}" target="_blank" rel="noopener noreferrer">'
            f'<span>Comprar na {escape(retailer["name"])}</span><span aria-hidden="true">↗</span>'
            '<span class="atelier-sr"> (abre em nova aba)</span></a>'
        )
    loading = 'loading="eager" fetchpriority="high"' if first else 'loading="lazy"'
    return f'''<article class="atelier-product" aria-labelledby="product-{p['id']}-title">
<figure class="atelier-product-art">
<img src="{p['image']}" alt="{p['image_alt']}" width="1122" height="1402" {loading} decoding="async"/>
<figcaption>Arte de divulgação</figcaption>
</figure>
<div class="atelier-product-copy">
<div class="atelier-product-meta"><p class="atelier-product-kind">{p['category']}</p><span class="atelier-product-format">{p['format']}</span></div>
<h3 id="product-{p['id']}-title">{p['title']}</h3>
<p class="atelier-product-subtitle">{p['subtitle']}</p>
<p class="atelier-product-author">Por {p['author']}</p>
<p class="atelier-product-description">{p['description']}</p>
<div class="atelier-product-purchase">
<p class="atelier-purchase-label">Adquira seu exemplar</p>
<div class="atelier-retailers">
{chr(10).join(buttons)}
</div>
<p class="atelier-purchase-note">Preço, frete e prazo de entrega são informados na loja escolhida.</p>
</div>
</div>
</article>'''


def render_catalog(data: dict) -> str:
    products = published_products(data)
    count = len(products)
    label = 'obra' if count == 1 else 'obras'
    grid_class = 'atelier-grid atelier-grid-single' if count == 1 else 'atelier-grid'
    cards = '\n'.join(render_product(product, i == 0) for i, product in enumerate(products))
    if not products:
        cards = '<p class="atelier-empty">Nenhuma obra disponível no momento.</p>'
    return f'''<section class="atelier-catalog" id="colecao" aria-labelledby="catalog-title">
<div class="atelier-catalog-heading"><div><p class="atelier-eyebrow">A coleção</p><h2 id="catalog-title">Leituras para a vida interior</h2></div><span class="atelier-count">{count:02d} {label}</span></div>
<div class="{grid_class}">
{cards}
</div>
</section>'''


def update_page(source: str, catalog: str) -> str:
    if source.count(START) != 1 or source.count(END) != 1:
        raise ValueError('Esperado um único par de marcadores STORE_CATALOG.')
    before, rest = source.split(START)
    _, after = rest.split(END)
    return before + START + '\n' + catalog + '\n' + END + after


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verifica sem alterar arquivos.')
    args = parser.parse_args()
    try:
        data = json.loads(CATALOG.read_text(encoding='utf-8'))
        current = PAGE.read_text(encoding='utf-8')
        updated = update_page(current, render_catalog(data))
    except (ValueError, OSError) as error:
        parser.exit(1, f'Erro: {error}\n')
    if args.check:
        if updated != current:
            parser.exit(1, 'Catálogo desatualizado. Execute python3 tools/generate_store.py\n')
        print('Catálogo conferido: HTML corresponde aos produtos publicados.')
    else:
        PAGE.write_text(updated, encoding='utf-8')
        print('Loja atualizada em pages/loja.html.')


if __name__ == '__main__':
    main()
