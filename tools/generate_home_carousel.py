#!/usr/bin/env python3
"""Gera o catálogo do primeiro carrossel a partir das páginas novas do site."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "pages"
OUTPUT = ROOT / "content" / "home-carousel.json"
MAX_ITEMS = 8

# Páginas técnicas ou de navegação não são publicações editoriais.
IGNORED = {
    "404.html", "A-pagina-mestre.html", "agradecimento.html", "carrinho.html",
    "contato.html", "doacao.html", "formacoes.html", "loja.html",
    "materia-nova.html", "pagamento.html", "produto.html",
}

# Páginas que funcionam apenas como índice de cards. O carrossel da home deve
# apontar diretamente para o conteúdo final, e não criar uma etapa repetida.
LANDING_PAGE = re.compile(
    r"^(?:tempo-comum-\d+|advento-\d+|quaresma-(?:\d+|ramos)|pascoa-\d+)\.html$",
    flags=re.I,
)


def last_updated_timestamp(path: Path) -> int:
    result = subprocess.run(
        ["git", "log", "-1", "--follow", "--format=%ct", "--", str(path.relative_to(ROOT))],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    timestamps = [int(value) for value in result.stdout.split() if value.isdigit()]
    if timestamps:
        return timestamps[0]
    return int(path.stat().st_mtime)


def meta_value(source: str, name: str) -> str:
    patterns = (
        rf'<meta\s+name=["\']{re.escape(name)}["\']\s+content=["\']([^"\']+)',
        rf'<meta\s+content=["\']([^"\']+)["\']\s+name=["\']{re.escape(name)}["\']',
    )
    for pattern in patterns:
        match = re.search(pattern, source, flags=re.I)
        if match:
            return unescape(re.sub(r"\s+", " ", match.group(1))).strip()
    return ""


def text_tag(source: str, tag: str) -> str:
    match = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", source, flags=re.I | re.S)
    if not match:
        return ""
    value = re.sub(r"<[^>]+>", "", match.group(1))
    return unescape(re.sub(r"\s+", " ", value)).strip()


def category(filename: str, title: str) -> str:
    value = f"{filename} {title}".lower()
    if "comunhao" in value or "comunhão" in value:
        return "Canto de Comunhão"
    if "entrada" in value:
        return "Canto de Entrada"
    if "tempo-comum" in value or "tempo comum" in value:
        return "Tempo Comum"
    if "advento" in value:
        return "Advento"
    if "quaresma" in value:
        return "Quaresma"
    if "pascoa" in value or "páscoa" in value:
        return "Páscoa"
    return "Conteúdo novo"


def background(filename: str) -> str:
    value = filename.lower()
    seasonal_images = {
        "tempo-comum-": "Carrossel - Tempo Comum.png",
        "advento-": "Carrrosel - Tempo do Advento.png",
        "natal-": "Carrrosel - Tempo do Natal.png",
        "quaresma-": "Carrrosel - Quaresma.png",
        "pascoa-": "Carrrosel - Pascoa.png",
        "sao-pedro-e-sao-paulo": "Carrrosel - Festas e solenidades.png",
        "festa-": "Carrrosel - Festas e solenidades.png",
        "solenidade-": "Carrrosel - Festas e solenidades.png",
    }
    for prefix, image in seasonal_images.items():
        if value.startswith(prefix):
            return f"/assets/img/Carrossel da página inicial/{image}"
    if "pater-noster" in value:
        return "/assets/img/Imagens-religiosas-devocionais/Pater-noster.jpg"
    if "ad-libitum" in value:
        return "/assets/img/Imagens-religiosas-devocionais/Ad-libitum.png"
    return "/assets/img/cabeçalho4.png"


def main() -> None:
    records = []
    for path in PAGES.glob("*.html"):
        if path.name in IGNORED or path.name.endswith(".bak") or LANDING_PAGE.match(path.name):
            continue
        source = path.read_text(encoding="utf-8", errors="replace")
        title = text_tag(source, "title") or text_tag(source, "h1") or path.stem.replace("-", " ").title()
        description = meta_value(source, "description") or f"Novo conteúdo disponível: {title}."
        timestamp = last_updated_timestamp(path)
        records.append({
            "title": title,
            "description": description,
            "category": category(path.name, title),
            "url": f"pages/{path.name}",
            "image": background(path.name),
            "published": datetime.fromtimestamp(timestamp, timezone.utc).date().isoformat(),
            "_timestamp": timestamp,
        })

    records.sort(
        key=lambda item: (item["_timestamp"], "comunhao" in item["url"].lower(), item["url"]),
        reverse=True,
    )
    for item in records:
        item.pop("_timestamp", None)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(records[:MAX_ITEMS], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Catálogo atualizado com {min(len(records), MAX_ITEMS)} páginas: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
