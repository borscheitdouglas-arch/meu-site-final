"""Testes do cadastro: rascunhos, expansão e integridade do HTML gerado."""
import copy
import json
import unittest
from html.parser import HTMLParser

from generate_store import CATALOG, PAGE, START, END, render_catalog, update_page


class Tags(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class StoreCatalogTest(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(CATALOG.read_text(encoding='utf-8'))

    def test_current_product_and_links_work_without_javascript(self):
        html = render_catalog(self.data)
        tags = Tags(html).tags
        self.assertEqual(sum(t == 'article' for t, _ in tags), 1)
        self.assertIn('atelier-grid-single', html)
        self.assertIn('01 produto', html)
        self.assertTrue(all(a.get('loading') == 'lazy' and 'fetchpriority' not in a for t, a in tags if t == 'img'))
        links = [a for t, a in tags if t == 'a']
        self.assertEqual({a['href'] for a in links}, {r['url'] for r in self.data['products'][0]['retailers']})
        self.assertTrue(all(a['target'] == '_blank' and 'noopener' in a['rel'] for a in links))

    def test_incomplete_draft_is_never_exposed(self):
        before = render_catalog(self.data)
        self.data['products'].append({'id': 'partituras-em-preparacao', 'status': 'draft', 'title': 'INEDITO'})
        self.assertEqual(render_catalog(self.data), before)

    def test_multiple_books_get_grid_count_and_unique_heading_ids(self):
        for i in (2, 3, 4):
            product = copy.deepcopy(self.data['products'][0])
            product.update(id=f'livro-{i}', title=f'Livro {i}')
            self.data['products'].append(product)
        html = render_catalog(self.data)
        self.assertIn('04 produtos', html)
        self.assertNotIn('atelier-grid-single', html)
        tags = Tags(html).tags
        ids = [a['id'] for _, a in tags if 'id' in a]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(t == 'article' for t, _ in tags), 4)
        self.assertEqual(sum(t == 'img' and a.get('loading') == 'lazy' for t, a in tags), 4)

    def test_unsafe_or_missing_inputs_fail_before_page_write(self):
        bad_values = [
            ('id', '../escape'), ('status', 'unknown'), ('image', '/assets/../index.html'),
            ('image', '/assets/missing.png'), ('title', ''), ('retailers', []),
        ]
        for field, value in bad_values:
            with self.subTest(field=field, value=value):
                data = copy.deepcopy(self.data)
                data['products'][0][field] = value
                with self.assertRaises(ValueError):
                    render_catalog(data)
        for url in ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', 'https://example.com/ bad']:
            with self.subTest(url=url):
                data = copy.deepcopy(self.data)
                data['products'][0]['retailers'][0]['url'] = url
                with self.assertRaises(ValueError):
                    render_catalog(data)


    def test_contact_product_does_not_create_fake_checkout(self):
        product = copy.deepcopy(self.data['products'][0])
        product.update(
            id='camiseta-exemplo', title='Camiseta de exemplo',
            product_type='apparel', purchase_mode='contact',
            contact_url='/pages/contato.html'
        )
        product.pop('retailers')
        product['status'] = 'published'
        self.data['products'].append(product)
        html = render_catalog(self.data)
        self.assertIn('02 produtos', html)
        self.assertIn('Consultar disponibilidade', html)
        self.assertIn('Não há compra online nesta etapa', html)
        self.assertIn('https://loja.uiclap.com/', html)

    def test_direct_checkout_is_blocked_until_approved(self):
        self.data['products'][0]['purchase_mode'] = 'checkout'
        with self.assertRaisesRegex(ValueError, 'checkout direto ainda indisponível'):
            render_catalog(self.data)

    def test_invalid_contact_destination_fails_closed(self):
        self.data['products'][0].update(
            purchase_mode='contact', contact_url='javascript:alert(1)'
        )
        with self.assertRaisesRegex(ValueError, 'página de contato não autorizada'):
            render_catalog(self.data)

    def test_duplicate_product_id_rejected(self):
        self.data['products'].append(copy.deepcopy(self.data['products'][0]))
        with self.assertRaises(ValueError):
            render_catalog(self.data)

    def test_product_text_is_escaped(self):
        self.data['products'][0]['title'] = '<script>alert("book")</script>'
        html = render_catalog(self.data)
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)

    def test_no_published_products_has_empty_state(self):
        self.data['products'][0]['status'] = 'draft'
        html = render_catalog(self.data)
        self.assertIn('00 produtos', html)
        self.assertIn('Nenhum produto disponível', html)
        self.assertNotIn('<article', html)

    def test_update_preserves_content_outside_markers_and_is_idempotent(self):
        source = 'HEADER\n' + START + '\nold\n' + END + '\nFOOTER'
        catalog = render_catalog(self.data)
        updated = update_page(source, catalog)
        self.assertTrue(updated.startswith('HEADER\n' + START))
        self.assertTrue(updated.endswith(END + '\nFOOTER'))
        self.assertEqual(update_page(updated, catalog), updated)
        for bad_source in ['no markers', START + START + END, END + START]:
            with self.assertRaises(ValueError):
                update_page(bad_source, catalog)


    def test_salve_regina_inquiry_is_request_only(self):
        source = PAGE.read_text(encoding='utf-8')
        self.assertEqual(source.count('data-vavi-inquiry aria-label='), 1)
        self.assertIn('Camiseta Salve Regina', source)
        self.assertIn('Pedido sob consulta · Sem cobrança neste site', source)
        self.assertIn('Enviar por e-mail', source)
        self.assertIn('salve-regina-inquiry.js', source)
        self.assertNotIn('MERCADOPAGO_TEST_ACCESS_TOKEN', source)
        self.assertNotIn('CHECKOUT_TEST_API_KEY', source)
        self.assertNotIn('/api/checkout/test', source)
        self.assertEqual(source.count('Em preparação · Compra indisponível'), 2)
        self.assertIn('Preço preliminar: R$ 109,90 + frete', source)


    def test_salve_regina_shipping_preview_requires_no_checkout(self):
        source = PAGE.read_text(encoding='utf-8')
        from pathlib import Path
        js = (PAGE.parents[1] / 'scripts/salve-regina-inquiry.js').read_text(encoding='utf-8')
        self.assertEqual(source.count('data-vavi-shipping-panel'), 1)
        self.assertIn('Consultar frete e preparar pedido', source)
        self.assertIn('/api/shipping/preview', js)
        self.assertIn('shippingCost', js)
        self.assertIn('Total estimado:', js)
        self.assertIn('Nenhum pedido ou pagamento foi realizado.', js)
        self.assertIn('mailto:', js)
        self.assertNotIn('/api/checkout/test', js)
        self.assertNotIn('MERCADOPAGO_', js)
        self.assertNotIn('VAVI_CLIENT_SECRET', js)
        self.assertEqual(source.count('data-vavi-inquiry aria-label='), 1)

    def test_checked_in_page_matches_source(self):
        source = PAGE.read_text(encoding='utf-8')
        self.assertEqual(update_page(source, render_catalog(self.data)), source)


if __name__ == '__main__':
    unittest.main()
