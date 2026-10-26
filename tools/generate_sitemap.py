#!/usr/bin/env python3
"""Gera o sitemap estático do GitHub Pages, sem dependências externas."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import quote, urljoin
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
# Exclusões editoriais revisadas. Retire uma entrada quando houver conteúdo real.
EXCLUDED = {
    "pages/A-pagina-mestre.html": "ferramenta de curadoria",
    "pages/template.html": "modelo de página",
    "pages/cart.html": "carrinho",
    "pages/produto.html": "modelo dependente de parâmetro, sem produto publicado",
    "pages/produto-1.html": "produto removido",
    "pages/produto-2.html": "produto removido",
    "pages/advento-1-video.html": "duplicata de advento-1.html",
    "pages/advento-2-video.html": "duplicata de advento-2.html",
    "pages/gloria.html": "somente aviso de conteúdo em preparação",
    "pages/sao-pedro-e-sao-paulo.html": "texto e recursos ainda são placeholders",
}
PRIVATE_PARTS = {"admin", "editor", "tools", "scripts", "styles", "assets",
                 "content", "docs", "prompt", "test", "tests", "teste",
                 "testes", "draft", "drafts", "rascunhos", "node_modules"}
PRIVATE_NAME = re.compile(
    r"^(?:404|template|test|teste|draft|rascunho|preview|pagamento|checkout|"
    r"carrinho|cart|agradecimento)(?:[._-]|$)", re.I
)


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.noindex = False
        self.redirect = False
        self.empty = False
        self.canonicals = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            name = (attrs.get("name") or "").lower()
            content = (attrs.get("content") or "").lower()
            if name in {"robots", "googlebot"}:
                self.noindex |= bool({"noindex", "none"} & set(re.split(r"[,\s]+", content)))
            self.redirect |= (attrs.get("http-equiv") or "").lower() == "refresh"
        if tag == "link" and "canonical" in (attrs.get("rel") or "").lower().split():
            self.canonicals.append(attrs.get("href") or "")
        self.empty |= "editorial-empty" in (attrs.get("class") or "").split()

    def handle_data(self, data):
        self.text.append(data)


def origin(root):
    domain = (root / "CNAME").read_text(encoding="utf-8").strip().lower()
    if not re.fullmatch(r"[a-z0-9]+(?:[.-][a-z0-9]+)+", domain):
        raise ValueError("CNAME deve conter somente um domínio válido.")
    return "https://" + domain


def collect_urls(root):
    base = origin(root)
    urls, skipped = set(), {}
    candidates = sorted(root.glob("*.html")) + sorted((root / "pages").rglob("*.html"))
    for path in candidates:
        relative = path.relative_to(root)
        name = relative.as_posix()
        reason = EXCLUDED.get(name)
        if any(p.startswith((".", "_")) or p.lower() in PRIVATE_PARTS
               for p in relative.parts) or PRIVATE_NAME.match(path.stem):
            reason = reason or "arquivo técnico, de teste ou rascunho"
        if reason:
            skipped[name] = reason
            continue
        metadata = Metadata()
        metadata.feed(path.read_text(encoding="utf-8"))
        text = " ".join(" ".join(metadata.text).split()).lower()
        if metadata.noindex or metadata.redirect:
            skipped[name] = "noindex ou redirecionamento"
            continue
        if metadata.empty or "texto de exemplo. substituirei" in text:
            skipped[name] = "página em preparação ou texto de exemplo"
            continue
        url_path = relative.as_posix()
        if path.name == "index.html":
            url_path = url_path[:-len("index.html")]
        url = base + "/" + quote(url_path, safe="/")
        if len(metadata.canonicals) > 1:
            raise ValueError(f"{name}: mais de uma tag canonical.")
        if metadata.canonicals:
            canonical = urljoin(base + "/" + quote(name, safe="/"), metadata.canonicals[0])
            if canonical != url:
                raise ValueError(f"{name}: canonical {canonical!r} difere de {url!r}. "
                                 "Corrija a tag ou registre a duplicata em EXCLUDED.")
        urls.add(url)
    if not urls or len(urls) > 50000:
        raise ValueError("O sitemap deve conter entre 1 e 50.000 URLs.")
    return sorted(urls), skipped


def render(urls):
    ET.register_namespace("", NAMESPACE)
    tree = ET.Element(f"{{{NAMESPACE}}}urlset")
    for url in urls:
        node = ET.SubElement(tree, f"{{{NAMESPACE}}}url")
        ET.SubElement(node, f"{{{NAMESPACE}}}loc").text = url
    ET.indent(tree, space="  ")
    data = ET.tostring(tree, encoding="utf-8", xml_declaration=True) + b"\n"
    if len(data) > 50 * 1024 * 1024:
        raise ValueError("Sitemap excede 50 MB; divida em vários arquivos.")
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Valida sem escrever arquivos")
    parser.add_argument("--explain", action="store_true", help="Lista as exclusões")
    args = parser.parse_args()
    try:
        urls, skipped = collect_urls(ROOT)
        data = render(urls)
        robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
        expected = f"Sitemap: {origin(ROOT)}/sitemap.xml"
        if expected not in robots.splitlines():
            raise ValueError(f"robots.txt precisa conter: {expected}")
        output = ROOT / "sitemap.xml"
        if args.check:
            if not output.exists() or output.read_bytes() != data:
                raise ValueError("Sitemap desatualizado. Execute: python3 tools/generate_sitemap.py")
        else:
            output.write_bytes(data)
        print(f"Sitemap {'validado' if args.check else 'gerado'}: {len(urls)} URLs; "
              f"{len(skipped)} páginas excluídas.")
        if args.explain:
            for path, reason in sorted(skipped.items()):
                print(f"  {path}: {reason}")
    except (ValueError, OSError) as error:
        parser.exit(1, f"Erro: {error}\n")


if __name__ == "__main__":
    main()
