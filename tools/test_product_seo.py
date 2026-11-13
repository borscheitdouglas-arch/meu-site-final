"""Verifica se os endereços SEO dos produtos mantêm os dados do catálogo e o checkout existente."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://www.douglasassumpcao.com.br"
CATALOG = ROOT / "content" / "shop-cart-catalog.json"
SITEMAP = ROOT / "sitemap.xml"
SHOP = ROOT / "pages" / "loja.html"

class SEOProductPagesTests(unittest.TestCase):
    def test_product_pages_match_sale_catalog(self):
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        sitemap = SITEMAP.read_text(encoding="utf-8")
        shop = SHOP.read_text(encoding="utf-8")
        for product in data["products"]:
            product_id = product["id"]
            path = ROOT / "pages" / ("produto-" + product_id + ".html")
            valid = [
                v for v in product.get("variants", [])
                if v.get("sku") and isinstance(v.get("priceCents"), int) and v["priceCents"] > 0
            ]
            if product.get("status") != "available" or not valid:
                self.assertFalse(path.exists(), f"{product_id}: não publicar SEO de item indisponível")
                continue
            with self.subTest(product=product_id):
                self.assertTrue(path.is_file(), f"Falta página SEO: {path}")
                html = path.read_text(encoding="utf-8")
                url = BASE + "/pages/" + path.name
                self.assertIn('data-shop-product-id="' + product_id + '"', html)
                self.assertIn('<link rel="canonical" href="' + url + '">', html)
                self.assertIn('name="robots" content="index,follow"', html)
                self.assertIn('<script src="/scripts/product-detail.js', html)
                self.assertIn('<loc>' + url + '</loc>', sitemap)
                self.assertIn('href="/pages/' + path.name + '"', shop)
                match = re.search(r'<script type="application/ld\\+json">(.*?)</script>', html, re.S)
                self.assertIsNotNone(match, f"{product_id}: JSON-LD ausente")
                structured = json.loads(match.group(1))
                self.assertEqual(structured["@type"], "Product")
                self.assertEqual(structured["name"], product["title"])
                self.assertEqual(structured["url"], url)
                self.assertEqual(structured["image"][0], BASE + product["image"])
                self.assertEqual(structured["offers"]["priceCurrency"], "BRL")
                self.assertEqual(structured["offers"]["price"], f'{min(v["priceCents"] for v in valid) / 100:.2f}')
                self.assertEqual(structured["offers"]["availability"], "https://schema.org/InStock")

if __name__ == "__main__":
    unittest.main()
