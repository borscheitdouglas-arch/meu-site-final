#!/usr/bin/env python3
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
pages = list((root / 'pages').rglob('*.html'))

standard_header = '''<header class="site-header">
    <button id="menu-btn" class="menu-btn">☰</button>
    <div class="logo"><a href="/index.html"><img src="/assets/img/icone.png" alt="CNP" id="site-logo"></a></div>
    <div class="header-actions">
      <a class="icon-btn" href="/pages/loja.html" title="Loja">
        <img src="/assets/img/icone1.png" alt="Loja" class="icon-img">
        <span class="icon-label">LOJA</span>
      </a>
      <a class="icon-btn" href="/pages/contato.html" title="Contato">
        <img src="/assets/img/icone2.png" alt="Contato" class="icon-img">
        <span class="icon-label">CONTATO</span>
      </a>
      <input id="search" type="search" placeholder="Buscar..." />
    </div>
  </header>'''

header_re = re.compile(r"<header[^>]*class=[\"']site-header[\"'][\s\S]*?</header>", re.IGNORECASE)

for p in pages:
    txt = p.read_text(encoding='utf-8')
    if 'class="site-header"' in txt:
        new_txt, n = header_re.subn(standard_header, txt, count=1)
        if n > 0:
            bak = p.with_suffix(p.suffix + '.bak')
            p.rename(bak)
            bak.write_text(txt, encoding='utf-8')
            p.write_text(new_txt, encoding='utf-8')
            print(f'Updated: {p.relative_to(root)}')
    else:
        print(f'Skipped (no header): {p.relative_to(root)}')

print('Done')
