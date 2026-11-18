#!/usr/bin/env python3
"""Inclui o card de Alma Redemptoris Mater nos quatro Domingos do Advento.

Executado apenas pelo workflow de publicação em 23/11/2026.
Idempotente e limitado às quatro páginas editoriais do Advento.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARD = """<article class="card">
<div class="card-header"><div class="card-icon"><img src="../assets/img/Acessar-partitura.png" alt="" width="60" height="60"/></div>
<h3 class="card-title">Alma Redemptoris Mater</h3><p class="card-subtitle">Antífona Mariana · Advento</p></div>
<div class="card-body"><p class="card-description">Ouça a antífona para oração e contemplação, conheça sua mensagem e baixe a partitura gratuita.</p></div>
<div class="card-footer"><a class="card-link" href="alma-redemptoris-mater.html">ACESSAR ANTÍFONA</a></div>
</article>
"""
CARD_LINK = 'href="alma-redemptoris-mater.html"'
SECTION = '<div class="carousel-track">'
CLOSE = '</div></div>\n</section>'


def publish_cards():
    for sunday in range(1, 5):
        path = ROOT / "pages" / f"advento-{sunday}.html"
        content = path.read_text(encoding="utf-8")
        if CARD_LINK in content:
            print(f"advento-{sunday}.html: card já publicado")
            continue
        start = content.find(SECTION)
        if start < 0:
            raise RuntimeError(f"{path}: grade de cards não encontrada")
        end = content.find(CLOSE, start)
        if end < 0:
            raise RuntimeError(f"{path}: fechamento dos cards não encontrado")
        content = content[:end] + CARD + content[end:]
        if sunday == 4:
            content = content.replace("repertoire-unified repertoire-pairs", "repertoire-unified")
        path.write_text(content, encoding="utf-8")
        print(f"advento-{sunday}.html: card inserido")


if __name__ == "__main__":
    publish_cards()
