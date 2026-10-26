"""Regressões de descoberta, exclusão e serialização do sitemap."""
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

from generate_sitemap import collect_urls, render, NAMESPACE


class SitemapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "CNAME").write_text("www.example.com\n")
        self.page("index.html")

    def page(self, path, source="<html><head></head><body>Conteúdo público</body></html>"):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(source, encoding="utf-8")

    def urls(self):
        return collect_urls(self.root)[0]

    def test_new_pages_and_removal(self):
        self.page("pages/novo-canto.html")
        self.assertIn("https://www.example.com/pages/novo-canto.html", self.urls())
        (self.root / "pages/novo-canto.html").unlink()
        self.assertEqual(self.urls(), ["https://www.example.com/"])

    def test_private_backups_templates_and_duplicates(self):
        for name in ["admin/index.html", "editor/index.html", "pages/teste.html",
                     "pages/testes/exemplo.html", "pages/_draft/canto.html",
                     "pages/template.html", "pages/cart.html", "pages/produto-1.html",
                     "pages/advento-1-video.html", "pages/canto.html.bak"]:
            self.page(name)
        self.assertEqual(self.urls(), ["https://www.example.com/"])

    def test_robots_and_redirects(self):
        for i, tag in enumerate([
            '<meta content="NOINDEX, follow" name="robots">',
            '<meta name="googlebot" content="none">',
            '<meta http-equiv="Refresh" content="0; url=/">',
        ]):
            self.page(f"pages/hidden-{i}.html", tag)
        self.assertEqual(self.urls(), ["https://www.example.com/"])

    def test_placeholder_becomes_public_when_completed(self):
        self.page("pages/natal.html", '<section class="editorial-empty">Em breve</section>')
        self.assertEqual(len(self.urls()), 1)
        self.page("pages/natal.html", '<main>Meditação completa. Partitura em breve.</main>')
        self.assertEqual(len(self.urls()), 2)

    def test_real_article_is_not_excluded_by_name(self):
        self.page("pages/materia-nova.html")
        self.assertEqual(len(self.urls()), 2)

    def test_canonical_conflict_fails(self):
        self.page("pages/canto.html", '<link rel="canonical" href="https://seu-dominio.com/canto">')
        with self.assertRaises(ValueError):
            self.urls()
        self.page("pages/canto.html", '<link href="/pages/canto.html" rel="canonical">')
        self.assertEqual(len(self.urls()), 2)

    def test_nested_index_and_unicode_paths(self):
        self.page("pages/colecao/index.html")
        self.page("pages/oração & canto.html")
        self.assertIn("https://www.example.com/pages/colecao/", self.urls())
        self.assertIn("https://www.example.com/pages/ora%C3%A7%C3%A3o%20%26%20canto.html", self.urls())

    def test_xml_namespace_escaping_and_no_invented_dates(self):
        urls = ["https://www.example.com/?a=1&b=2"]
        data = render(urls)
        tree = ET.fromstring(data)
        self.assertEqual(tree.tag, f"{{{NAMESPACE}}}urlset")
        self.assertEqual(tree.find(f"{{{NAMESPACE}}}url/{{{NAMESPACE}}}loc").text, urls[0])
        self.assertIn(b"&amp;", data)
        self.assertNotIn(b"lastmod", data)
        self.assertEqual(data, render(urls))


if __name__ == "__main__":
    unittest.main()
