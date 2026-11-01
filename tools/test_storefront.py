"""Regressões da loja em Chromium; todas as integrações externas são simuladas.

Requer Playwright e Chromium. Executar: python3 tools/test_storefront.py
Capturas opcionais: STOREFRONT_SCREENSHOT_DIR=/caminho/temporario
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
import os
import threading

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
API_HOST = 'douglas-loja-api.liturgia-gregoriano.workers.dev'
EMAIL = 'douglas.assumpcao27@gmail.com'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass


def assert_no_overflow(page):
    issues = page.evaluate('''() => {
      const issues = [];
      if (document.documentElement.scrollWidth > innerWidth + 1)
        issues.push('page overflow');
      for (const card of document.querySelectorAll('.shop-product-card, .atelier-vavi-card, .atelier-product, .product')) {
        if (card.scrollWidth > card.clientWidth + 2)
          issues.push('clipped product card');
      }
      return issues;
    }''')
    assert not issues, (page.viewport_size, issues)


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    shop_url = base + '/pages/loja.html'
    errors = []
    api_calls = []
    state = {'shipping_failure': False, 'checkout_enabled': False}
    screenshots = os.environ.get('STOREFRONT_SCREENSHOT_DIR')
    if screenshots:
        Path(screenshots).mkdir(parents=True, exist_ok=True)

    def route_request(route):
        url = urlsplit(route.request.url)
        if route.request.url.startswith(base + '/'):
            route.continue_()
            return
        if url.hostname != API_HOST:
            route.abort()
            return
        api_calls.append((route.request.method, url.path))
        headers = {'Access-Control-Allow-Origin': '*'}
        if url.path == '/api/checkout/live/readiness':
            route.fulfill(json={'checkoutEnabled': state['checkout_enabled']}, headers=headers)
            return
        if url.path == '/api/shipping/preview':
            if state['shipping_failure']:
                route.fulfill(status=503, json={'error': 'shipping_unavailable'}, headers=headers)
                return
            body = route.request.post_data_json
            assert body == {'zipCode': '01001000', 'sku': 'salve-regina-preta-g'}, body
            route.fulfill(json={
                'zipCode': body['zipCode'],
                'options': [
                    {'id': 'express', 'name': 'Entrega expressa de teste',
                     'shippingCost': 29.90, 'deliveryTime': 2, 'isActive': True},
                    {'id': 'economic', 'name': 'Entrega econômica de teste',
                     'shippingCost': 18.50, 'deliveryTime': 6, 'isActive': True},
                    {'id': 'pickup', 'name': 'Retirada na fábrica',
                     'shippingCost': 0, 'deliveryTime': 0, 'isActive': True},
                ],
            }, headers=headers)
            return
        errors.append('Unexpected integration request: ' + url.path)
        route.abort()

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            context = browser.new_context(reduced_motion='reduce')
            context.route('**/*', route_request)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: errors.append(
                f'Local HTTP {response.status}: {response.url}')
                if response.url.startswith(base + '/') and response.status >= 400 else None)

            for width in [320, 390, 768, 1440]:
                page.set_viewport_size({'width': width, 'height': 1000})
                page.goto(shop_url, wait_until='networkidle')
                expect(page.get_by_role('heading', level=1)).to_be_visible()
                expect(page.locator('.shop-product-card')).to_have_count(4)
                expect(page.locator('.atelier-vavi-live-link')).to_have_count(0)
                expect(page.locator('.shop-product-card[data-availability="preparation"]')).to_have_count(3)
                assert_no_overflow(page)
                # Identidade cobre/iluminura presente sem sacrificar legibilidade.
                expect(page.locator('.shop-ribbon')).to_be_visible()
                assert page.locator('meta[name="theme-color"]').get_attribute('content') == '#b76436'
                # Safari 26 amostra o fundo do body/cabeçalho; sem backdrop-filter
                # e com o tom cobre como background-color, a interface pode acompanhar.
                assert page.locator('body').evaluate(
                    'el => getComputedStyle(el).backgroundColor') == 'rgb(183, 100, 54)'
                assert page.locator('.site-header').evaluate(
                    'el => getComputedStyle(el).backgroundColor') == 'rgb(183, 100, 54)'
                assert page.locator('.site-header').evaluate(
                    'el => getComputedStyle(el).backdropFilter') == 'none'
                assert 'friso-iluminado-gregoriano.svg' in page.locator('.site-header').evaluate(
                    'el => getComputedStyle(el).backgroundImage')
                if width > 760:
                    assert 'faixa-iluminada-gregoriana.svg' in page.locator('.shop-ribbon').evaluate(
                        'el => getComputedStyle(el).backgroundImage')
                assert page.locator('.shop-search').evaluate(
                    'el => getComputedStyle(el).backgroundColor') == 'rgb(244, 234, 217)'
                # Cinco categorias agora compactas e retangulares, sem sair da tela.
                categories = page.locator('.shop-category-art')
                expect(categories).to_have_count(5)
                for art in categories.all():
                    box = art.bounding_box()
                    assert 28 <= box['width'] <= 75 and 28 <= box['height'] <= 75, box
                    assert box['x'] >= 0 and box['x'] + box['width'] <= width, box
                expect(page.locator('.shop-product-card a[href*="checkout"]')).to_have_count(0)
                # Quatro peças + um livro lado a lado em até cinco colunas.
                tiles = page.locator('.shop-product-grid > .shop-product-card, .shop-product-grid > .atelier-catalog')
                expect(tiles).to_have_count(5)
                boxes = [tile.bounding_box() for tile in tiles.all()]
                columns = 5 if width > 1200 else 3 if width > 760 else 2 if width > 360 else 1
                assert sum(abs(box['y'] - boxes[0]['y']) < 2 for box in boxes) == columns
                if width == 1440:
                    assert page.locator('.shop-hero').bounding_box()['height'] < 410
                    assert boxes[0]['y'] < 980, boxes[0]
                for asset in page.locator('img[srcset]:visible').all():
                    asset.scroll_into_view_if_needed()
                    asset.evaluate('image => image.decode()')
                    assert '/Salve-Regina/web/' in asset.evaluate('image => image.currentSrc')
                    assert asset.evaluate('image => image.naturalWidth > 0')
                if screenshots and width in [390, 1440]:
                    page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(img => img.loading='eager')")
                    for product_image in page.locator('main img:visible').all():
                        product_image.scroll_into_view_if_needed()
                        product_image.evaluate('image => image.decode()')
                    page.evaluate('window.scrollTo(0, 0)')
                    page.locator('.shop-category-grid').evaluate('el => el.scrollLeft = 0')
                    name = 'loja-mobile.png' if width == 390 else 'loja-desktop.png'
                    page.screenshot(path=str(Path(screenshots) / name), full_page=True)
                    if width == 1440:
                        page.screenshot(path=str(Path(screenshots) / 'loja-hero.png'))
                print(f'PASS: loja sem overflow em {width}px', flush=True)

            # Busca e filtros locais não substituem preços nem consultam APIs comerciais.
            page.locator('[data-shop-category="canecas"]').click()
            expect(page.locator('.shop-product-card:visible')).to_have_count(1)
            expect(page.locator('#shop-results')).to_have_text('1 produto encontrado')
            expect(page.locator('#shop-catalog-title')).to_be_focused()
            expect(page.locator('.atelier-catalog')).to_be_hidden()
            page.locator('[data-shop-reset]').first.click()
            page.locator('#shop-query').fill('mistica')
            page.locator('#shop-query').press('Enter')
            expect(page.locator('.shop-product-card:visible')).to_have_count(0)
            expect(page.locator('.atelier-catalog')).to_be_visible()
            page.locator('#shop-query').fill('inexistente')
            expect(page.locator('[data-shop-empty]')).to_be_visible()
            page.locator('[data-shop-empty] [data-shop-reset]').click()
            page.locator('#shop-availability').select_option('preparation')
            expect(page.locator('.shop-product-card:visible')).to_have_count(3)
            page.locator('#shop-availability').select_option('consultation')
            expect(page.locator('.shop-product-card:visible')).to_have_count(1)
            expect(page.locator('.shop-price').filter(has_text='R$ 109,90')).to_be_visible()
            page.locator('[data-shop-reset]').first.click()
            expect(page.locator('#shop-results')).to_have_text('5 produtos encontrados')
            print('PASS: categorias, busca sem acentos, filtros e estado vazio', flush=True)

            # A compra do livro permanece externa, com preço e entrega da loja parceira.
            retailers = page.locator('.atelier-product .atelier-buy')
            expect(retailers).to_have_count(2)
            assert {urlsplit(link.get_attribute('href')).hostname for link in retailers.all()} == {
                'loja.uiclap.com', 'www.amazon.com.br'}
            for link in retailers.all():
                expect(link).to_be_visible()
                assert link.get_attribute('target') == '_blank'
                assert 'noopener' in link.get_attribute('rel')

            # Navegação por teclado, inclusive restaurando o foco após fechar o menu.
            page.locator('#menu-btn').focus()
            page.keyboard.press('Enter')
            expect(page.locator('#menu-btn')).to_have_attribute('aria-expanded', 'true')
            expect(page.locator('#close-nav')).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.locator('#menu-btn')).to_have_attribute('aria-expanded', 'false')
            expect(page.locator('#menu-btn')).to_be_focused()
            faq = page.locator('#acompanhar-pedido')
            faq.locator('summary').focus()
            page.keyboard.press('Enter')
            expect(faq).to_have_attribute('open', '')
            expect(faq.locator('a')).to_have_attribute('href', 'mailto:' + EMAIL)
            page.keyboard.press('Space')
            expect(faq).not_to_have_attribute('open', '')

            # Fluxo de consulta com frete simulado: não gera pedido nem cobrança.
            action = page.locator('[data-category="camisetas"] .shop-product-action')
            action.focus()
            page.keyboard.press('Enter')
            expect(page.locator('#produto-camiseta')).to_have_attribute('open', '')
            expect(page.locator('#produto-camiseta summary')).to_be_focused()
            expect(page).to_have_url(shop_url + '#produto-camiseta')
            zip_input = page.get_by_label('CEP de entrega', exact=True)
            zip_input.fill('01001-000')
            page.get_by_role('button', name='Consultar frete e preparar pedido').click()
            expect(page.locator('[data-vavi-inquiry-result]')).to_be_visible()
            radios = page.locator('input[name="vaviShipping"]')
            expect(radios).to_have_count(2)
            expect(radios.first).to_be_checked()
            expect(page.locator('[data-vavi-total]')).to_contain_text('128,40')
            radios.nth(1).check()
            expect(page.locator('[data-vavi-total]')).to_contain_text('139,80')
            message = page.locator('[data-vavi-inquiry-message]').input_value()
            assert 'Entrega expressa de teste' in message
            assert 'Nenhum pedido ou pagamento foi realizado.' in message
            mailto = urlsplit(page.locator('[data-vavi-inquiry-email]').get_attribute('href'))
            assert mailto.scheme == 'mailto' and mailto.path == EMAIL
            assert parse_qs(mailto.query)['body'] == [message]
            for width in [320, 390, 768, 1440]:
                page.set_viewport_size({'width': width, 'height': 1000})
                assert_no_overflow(page)
                if screenshots and width in [390, 1440]:
                    page.locator('#produto-camiseta').screenshot(path=str(
                        Path(screenshots) / f'consulta-{width}.png'))

            # Editar o CEP invalida preço, opções e mensagem anteriores.
            zip_input.fill('20040-020')
            expect(page.locator('[data-vavi-inquiry-result]')).to_be_hidden()
            expect(page.locator('[data-vavi-shipping-panel]')).to_be_hidden()
            expect(page.locator('[data-vavi-inquiry-message]')).to_have_value('')
            expect(page.locator('[data-vavi-inquiry-email]')).to_have_attribute('href', 'mailto:' + EMAIL)

            # Falha de frete mantém uma consulta manual utilizável, sem total inventado.
            state['shipping_failure'] = True
            page.get_by_role('button', name='Consultar frete e preparar pedido').click()
            expect(page.locator('[data-vavi-inquiry-result]')).to_be_visible()
            expect(page.locator('[data-vavi-shipping-panel]')).to_be_hidden()
            expect(page.locator('[data-vavi-inquiry-status]')).to_contain_text('Não foi possível consultar')
            expect(page.locator('[data-vavi-total]')).to_have_text('')
            message = page.locator('[data-vavi-inquiry-message]').input_value()
            assert '20040-020' in message and 'Frete: pendente de confirmação' in message
            assert 'Total estimado:' not in message
            expect(page.locator('.atelier-vavi-live-link')).to_have_count(0)
            print('PASS: frete, total, seleção, e-mail e fallback sem cobrança', flush=True)

            page.goto(shop_url + '#produto-caneca', wait_until='networkidle')
            expect(page.locator('#produto-caneca')).to_have_attribute('open', '')
            expect(page.locator('#produto-caneca')).to_contain_text('Compra indisponível')
            # Exercita somente o contrato existente, com resposta local simulada.
            state['checkout_enabled'] = True
            page.goto(shop_url + '#produto-camiseta', wait_until='networkidle')

            # Alterar apenas o hash é navegação no mesmo documento. Recarregar
            # para que o readiness de checkout seja consultado novamente.

            page.reload(wait_until='networkidle')
            expect(page.locator('#produto-camiseta .atelier-vavi-live-link')).to_have_count(1)
            state['checkout_enabled'] = False
            page.reload(wait_until='networkidle')
            expect(page.locator('.atelier-vavi-live-link')).to_have_count(0)
            print('PASS: detalhes por URL e controle de disponibilidade preservado', flush=True)

            # A navegação para o carrinho existente preserva seus dados locais.
            cart = [{'id': 'qa-local-only', 'title': 'Item fictício de teste local',
                     'price': 'R$ 10,00', 'qty': 2}]
            page.evaluate('(cart) => localStorage.setItem("shopCart_v1", JSON.stringify(cart))', cart)
            page.locator('.shop-cart-link').click()
            expect(page).to_have_url(base + '/pages/cart.html')
            expect(page.locator('#cart-root')).to_contain_text('Total: R$ 20,00')
            assert page.evaluate('JSON.parse(localStorage.getItem("shopCart_v1"))') == cart
            page.evaluate('localStorage.removeItem("shopCart_v1")')
            print('PASS: acesso ao carrinho existente sem alterar seus dados', flush=True)

            for name, path in [('Condições da loja', '/pages/condicoes-da-loja.html'),
                               ('Privacidade', '/politica-de-privacidade.html')]:
                page.goto(shop_url, wait_until='networkidle')
                link = page.locator('.site-footer').get_by_role('link', name=name, exact=True)
                expect(link).to_have_attribute('href', path)
                link.click()
                expect(page).to_have_url(base + path)
                assert page.locator('body').inner_text().strip()

            # Conteúdo, FAQ, livro e atendimento continuam disponíveis sem JavaScript.
            plain_context = browser.new_context(java_script_enabled=False)
            plain_context.route('**/*', route_request)
            plain = plain_context.new_page()
            plain.goto(shop_url, wait_until='networkidle')
            expect(plain.locator('[data-shop-search]')).to_be_hidden()
            expect(plain.locator('.shop-product-card:visible')).to_have_count(4)
            plain.locator('#produto-camiseta summary').click()
            expect(plain.get_by_role('button', name='Consultar frete e preparar pedido')).to_be_disabled()
            expect(plain.locator('noscript a')).to_be_visible()
            expect(plain.locator('noscript a')).to_have_attribute('href', 'mailto:' + EMAIL)
            expect(plain.locator('.atelier-product .atelier-buy')).to_have_count(2)
            plain.locator('#acompanhar-pedido summary').click()
            expect(plain.locator('#acompanhar-pedido p')).to_be_visible()
            expect(plain.locator('.atelier-vavi-live-link')).to_have_count(0)
            plain_context.close()
            # A coleção usa as mesmas imagens, sem habilitar produtos em preparação.
            for width in [320, 390, 768, 1440]:
                page.set_viewport_size({'width': width, 'height': 1000})
                page.goto(base + '/pages/colecao-salve-regina.html', wait_until='networkidle')
                expect(page.locator('.product')).to_have_count(4)
                expect(page.locator('.product-featured')).to_have_count(1)
                expect(page.locator('.product:not(.product-featured) button')).to_have_count(0)
                expect(page.locator('.product:not(.product-featured) a[href*="checkout"]')).to_have_count(0)
                expect(page.locator('.product-featured .prelaunch')).to_contain_text('R$ 109,90')
                expect(page.locator('.product:not(.product-featured) .prelaunch')).to_have_count(3)
                for asset in page.locator('main img').all():
                    asset.scroll_into_view_if_needed()
                    asset.evaluate('image => image.decode()')
                assert_no_overflow(page)
                # Ampliação abre somente o arquivo de apresentação, sem fluxo de compra.
                for link in page.locator('main .product-image-link').all():
                    assert link.get_attribute('href').endswith('.webp')
                    assert link.get_attribute('target') == '_blank'
                    assert 'noopener' in link.get_attribute('rel')
                if screenshots and width in [390, 1440]:
                    page.evaluate('window.scrollTo(0, 0)')
                    name = 'colecao-mobile.png' if width == 390 else 'colecao-desktop.png'
                    page.screenshot(path=str(Path(screenshots) / name), full_page=True)
                print(f'PASS: coleção e imagens responsivas em {width}px', flush=True)
            assert not errors, errors
            assert api_calls and all(path in {
                '/api/checkout/live/readiness', '/api/shipping/preview'} for _, path in api_calls)
            print('PASS: teclado, políticas, livro e fallback sem JavaScript', flush=True)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
