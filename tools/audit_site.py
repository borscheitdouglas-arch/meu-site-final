#!/usr/bin/env python3
"""Verifica recursos locais, estrutura HTML e JSON, sem dependências externas.

Uso: python3 tools/audit_site.py
Arquivos .bak não são páginas ativas. Serviços externos não são consultados.
"""
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
URL_ATTRIBUTES = ('href', 'src', 'poster', 'data-preview-pdf', 'data-preview-download')


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = []
        self.links = []
        self.pending = []
        self.tags = Counter()
        self.feed(path.read_text(encoding='utf-8-sig'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags[tag] += 1
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in URL_ATTRIBUTES:
            if attrs.get(key):
                self.links.append((self.getpos()[0], attrs[key]))
        if attrs.get('data-pending-score'):
            self.pending.append(attrs['data-pending-score'])


def main():
    errors = []
    warnings = []
    references = 0
    documents = {p.resolve(): Document(p) for p in ROOT.rglob('*.html') if '.git' not in p.parts}

    def check(path, line, url):
        nonlocal references
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or not parsed.path or any(token in url for token in ('${', '{{', '<')):
            return
        decoded = unquote(parsed.path)
        target = (ROOT / decoded.lstrip('/') if decoded.startswith('/') else path.parent / decoded).resolve()
        references += 1
        label = f'{path.relative_to(ROOT)}:{line}'
        if not target.exists():
            errors.append(f'{label}: arquivo ausente: {url}')
        elif parsed.fragment and target in documents and unquote(parsed.fragment) not in documents[target].ids:
            errors.append(f'{label}: âncora ausente: {url}')
        elif target.suffix.lower() == '.pdf' and not target.read_bytes().startswith(b'%PDF-'):
            errors.append(f'{label}: arquivo sem cabeçalho PDF: {url}')

    for path, doc in documents.items():
        for tag in ('html', 'head', 'body'):
            if doc.tags[tag] != 1:
                errors.append(f'{path.relative_to(ROOT)}: esperado um <{tag}>, encontrados {doc.tags[tag]}')
        for identifier, count in Counter(doc.ids).items():
            if count > 1:
                errors.append(f'{path.relative_to(ROOT)}: id duplicado: {identifier}')
        for line, url in doc.links:
            check(path, line, url)
        for url in doc.pending:
            warnings.append(f'{path.relative_to(ROOT)}: PDF indisponível: {url}')

    for path in list(documents) + list(ROOT.rglob('*.css')):
        source = path.read_text(encoding='utf-8-sig')
        for match in re.finditer(r'''url\(\s*['"]?([^\)'"\n]+)''', source):
            check(path, source.count('\n', 0, match.start()) + 1, match[1].strip())

    for path in ROOT.rglob('*.json'):
        if '.git' in path.parts:
            continue
        try:
            data = json.loads(path.read_text(encoding='utf-8-sig'))
        except (ValueError, UnicodeError) as error:
            errors.append(f'{path.relative_to(ROOT)}: JSON inválido: {error}')
            continue
        if path.name == 'home-carousel.json':
            for item in data:
                for key in ('url', 'image'):
                    check(ROOT / 'index.html', 0, item[key])

    print(f'{len(documents)} arquivos HTML; {references} referências locais; {len(errors)} erros; {len(warnings)} PDFs pendentes.')
    for message in errors:
        print('ERRO:', message)
    for message in warnings:
        print('PENDENTE:', message)
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
