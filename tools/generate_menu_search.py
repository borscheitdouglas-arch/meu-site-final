"""Gera um índice local de títulos; não envia buscas a serviços externos."""
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
class Titles(HTMLParser):
    def __init__(self):
        super().__init__(); self.tag = ''; self.parts = {'title': [], 'h1': []}
    def handle_starttag(self, tag, attrs):
        if tag in self.parts: self.tag = tag
    def handle_endtag(self, tag):
        if tag == self.tag: self.tag = ''
    def handle_data(self, data):
        if self.tag: self.parts[self.tag].append(data)

excluded = {'A-pagina-mestre','materia-nova','produto','produto-1','produto-2','loja','pagamento','carrinho','cart','agradecimento','404','template'}
records = []
for path in sorted((ROOT / 'pages').glob('*.html')):
    if path.stem in excluded: continue
    parser = Titles(); parser.feed(path.read_text())
    title = ' '.join(' '.join(parser.parts['title']).split()).split('|')[0].strip()
    heading = ' '.join(' '.join(parser.parts['h1']).split())
    if title:
        records.append({'title': title, 'keywords': heading + ' ' + path.stem.replace('-', ' '), 'url': '/pages/' + path.name})
(ROOT / 'content/menu-search.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(f'{len(records)} páginas no índice do menu.')
