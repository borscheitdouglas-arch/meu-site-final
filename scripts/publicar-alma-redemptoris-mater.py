#!/usr/bin/env python3
"""Publica idempotentemente um card com dois botões nos quatro Domingos do Advento.

Executado apenas pelo agendamento de 23/11/2026.
Não altera páginas da loja nem insere links antes do dia programado.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARD = """<!-- alma-redemptoris-mater-card:start -->
<article class="card alma-advento-card">
<div class="card-header"><div class="card-icon"><img src="../assets/img/Acessar-partitura.png" alt="" width="60" height="60"/></div>
<h3 class="card-title">Alma Redemptoris Mater</h3><p class="card-subtitle">Antífona Mariana · Advento</p></div>
<div class="card-body"><p class="card-description">Duas formas de viver esta antífona: entre na oração contemplativa ou aprenda a pronúncia e o canto com a partitura gratuita.</p></div>
<div class="card-footer alma-card-actions">
<a class="card-link" href="alma-redemptoris-mater.html">ORAÇÃO E CONTEMPLAÇÃO</a>
<a class="card-link alma-card-study" href="alma-redemptoris-mater-aula.html">APRENDA A CANTAR</a>
</div>
</article>
<!-- alma-redemptoris-mater-card:end -->
"""
CARD_LINK = 'href="alma-redemptoris-mater.html"'
LESSON_LINK = 'href="alma-redemptoris-mater-aula.html"'
SECTION = '<div class="carousel-track">'
CLOSE = '</div></div>\n</section>'
STYLE = """<style id="alma-card-duplo-estilo">
.site-editorial .alma-card-actions{display:flex;flex-direction:column;gap:10px}
.site-editorial .alma-advento-card .alma-card-actions .card-link{min-height:42px;line-height:1.4;padding:10px 12px}
.site-editorial .alma-advento-card .alma-card-study{background:rgba(175,161,202,.12);border-color:rgba(175,161,202,.55);color:#e2d3ef}
.site-editorial .alma-advento-card .alma-card-study:hover{background:#d6c7ed;color:#1c1c22;border-color:#d6c7ed}
</style>
"""


def publish_cards():
    for sunday in range(1, 5):
        path = ROOT / "pages" / f"advento-{sunday}.html"
        html = path.read_text(encoding="utf-8")
        if '<article class="card alma-advento-card">' in html:
            assert CARD_LINK in html and LESSON_LINK in html, f"Card incompleto: {path}"
        elif CARD_LINK in html:
            # Atualiza a versão antiga do card, caso já tenha sido inserida.
            end_link = html.index(CARD_LINK)
            beginning = html.rfind('<article class="card">', 0, end_link)
            ending = html.find('</article>', end_link) + len('</article>')
            if beginning < 0 or ending < len('</article>'):
                raise RuntimeError(f"Card antigo não pôde ser identificado: {path}")
            html = html[:beginning] + CARD + html[ending:]
        else:
            start = html.find(SECTION)
            if start < 0:
                raise RuntimeError(f"Grade de cards não encontrada: {path}")
            end = html.find(CLOSE, start)
            if end < 0:
                raise RuntimeError(f"Fechamento dos cards não encontrado: {path}")
            html = html[:end] + CARD + html[end:]
        if 'id="alma-card-duplo-estilo"' not in html:
            if "</head>" not in html:
                raise RuntimeError(f"HEAD ausente: {path}")
            html = html.replace("</head>", STYLE + "</head>", 1)
        if sunday == 4:
            html = html.replace("repertoire-unified repertoire-pairs", "repertoire-unified")
        if html.count(CARD_LINK) != 1 or html.count(LESSON_LINK) != 1:
            raise RuntimeError(f"Duplicidade de card: {path}")
        path.write_text(html, encoding="utf-8")
        print(f"advento-{sunday}.html: card com dois acessos pronto")


if __name__ == "__main__":
    publish_cards()
