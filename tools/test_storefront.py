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
            assert body.get('zipCode') == '01001000', body
            assert body.get('sku') in ('salve-regina-preta-g','salve-regina-preta-xg'), body
            route.fulfill(json={
                'zipCode': body['zipCode'], 'sku': body['sku'],
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
                expect(page.locator('.shop-product-card')).to_have_count(6)
                expect(page.locator('.atelier-vavi-live-link')).to_have_count(0)
                expect(page.locator('.shop-product-card[data-availability="preparation"]')).to_have_count(1)
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
                # Cabeçalho iluminado deve manter os elementos separados:
                # a versão rejeitada deslocava a marca e sobrepunha a navegação.
                brand_box = page.locator('.site-header .logo').bounding_box()
                menu_box = page.locator('.site-header .menu-btn').bounding_box()
                cart_box = page.locator('.site-header .shop-cart-link').bounding_box()
                assert menu_box['x'] + menu_box['width'] < brand_box['x'], (width, menu_box, brand_box)
                assert brand_box['x'] + brand_box['width'] < cart_box['x'], (width, brand_box, cart_box)
                if width == 1440:
                    links_box = page.locator('.shop-header-links').bounding_box()
                    search_box = page.locator('.shop-search').bounding_box()
                    assert brand_box['x'] + brand_box['width'] < links_box['x'], (brand_box, links_box)
                    assert links_box['x'] + links_box['width'] < search_box['x'], (links_box, search_box)
                # Cinco categorias agora compactas e retangulares, sem sair da tela.
                categories = page.locator('.shop-category-art')
                expect(categories).to_have_count(5)
                for art in categories.all():
                    box = art.bounding_box()
                    assert 28 <= box['width'] <= 75 and 28 <= box['height'] <= 75, box
                    assert box['x'] >= 0 and box['x'] + box['width'] <= width, box
                expect(page.locator('.shop-product-card a[href*="checkout"]')).to_have_count(0)
                # Seis peças + um livro em uma vitrine responsiva.
                tiles = page.locator('.shop-product-grid > .shop-product-card, .shop-product-grid > .atelier-catalog')
                expect(tiles).to_have_count(7)
                boxes = [tile.bounding_box() for tile in tiles.all()]
                columns = (6 if width > 1320 else 5 if width > 1080
                           else 4 if width > 860 else 3 if width > 630 else 2)
                assert sum(abs(box['y'] - boxes[0]['y']) < 2 for box in boxes) == columns
                if width == 1440:
                    assert page.locator('.shop-hero').bounding_box()['height'] < 410
                    assert boxes[0]['y'] < 980, boxes[0]
                    # Cards menores, com fotos completas e ações ainda acessíveis.
                    assert max(box['height'] for box in boxes[:6]) < 490, boxes
                    assert page.locator('.shop-product-image img').first.bounding_box()['height'] <= 150
                expect(page.locator('.shop-product-variation > span')).to_have_count(16)
                assert all(card.get_attribute('data-availability') in ('consultation','preparation')
                           for card in page.locator('.shop-product-card').all())
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
            expect(page.locator('.shop-product-card:visible')).to_have_count(2)
            expect(page.locator('#shop-results')).to_have_text('2 produtos encontrados')
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
            expect(page.locator('.shop-product-card:visible')).to_have_count(1)
            page.locator('#shop-availability').select_option('consultation')
            expect(page.locator('.shop-product-card:visible')).to_have_count(5)
            expect(page.locator('.shop-price').filter(has_text='R$ 109,90')).to_be_visible()
            page.locator('[data-shop-reset]').first.click()
            expect(page.locator('#shop-results')).to_have_text('7 produtos encontrados')
            print('PASS: categorias, busca sem acentos, filtros e estado vazio', flush=True)
            # Calculadora por CEP; respostas do fornecedor simuladas nos testes.
            calc=page.locator('[data-shipping-calculator]')
            calc.locator('select[name="product"]').select_option('caneca-salve-regina-preta')
            calc.locator('input[name="zipCode"]').fill('01001-000')
            previous_calls=len(api_calls)
            calc.get_by_role('button',name='Consultar frete').click()
            expect(calc.locator('[data-shipping-status]')).to_contain_text('não configurado')
            assert len(api_calls)==previous_calls
            calc.locator('select[name="product"]').select_option('salve-regina-preta-g')
            calc.get_by_role('button',name='Consultar frete').click()
            expect(calc.locator('[data-shipping-results]')).to_contain_text('R$ 128,40')
            expect(calc.locator('[data-shipping-results]')).not_to_contain_text('Retirada na fábrica')
            expect(calc.locator('[data-shipping-status]')).to_contain_text('não realiza compra')
            print('PASS: calculadora de frete, recusa segura e total por CEP',flush=True)


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
            expect(page.locator('#produto-caneca')).to_contain_text('compra automática indisponível')
            # Exercita somente o contrato existente, com resposta local simulada.
            state['checkout_enabled'] = True
            page.goto(shop_url + '#produto-camiseta', wait_until='networkidle')

            # Alterar apenas o hash é navegação no mesmo documento. Recarregar
            # para que o readiness de checkout seja consultado novamente.

            page.reload(wait_until='networkidle')
            expect(page.locator('#produto-camiseta .atelier-vavi-live-link')).to_have_count(1)
            expect(page.locator('.shop-cart-buy-now')).to_have_count(1)
            page.locator('[data-category="camisetas"] [data-cart-size]').select_option('XG')
            expect(page.locator('.shop-cart-buy-now')).to_have_attribute(
                'href','/pages/checkout-salve-regina.html?size=XG')
            state['checkout_enabled'] = False
            page.reload(wait_until='networkidle')
            expect(page.locator('.atelier-vavi-live-link')).to_have_count(0)
            expect(page.locator('.shop-cart-buy-now')).to_have_count(0)
            print('PASS: detalhes por URL e controle de disponibilidade preservado', flush=True)

            # Sacola com variantes reconhecidas: sem preços inventados nem pedidos.
            page.goto(shop_url, wait_until='networkidle')
            expect(page.locator('[data-cart-add]')).to_have_count(6)
            expect(page.locator('[data-cart-buy]')).to_have_count(6)
            page.locator('[data-cart-buy="caneca-salve-regina-pb"]').click()
            expect(page).to_have_url(base+'/pages/cart.html')
            expect(page.locator('.cart-item')).to_have_count(1)
            expect(page.get_by_role('button',name='Finalizar compra',exact=True)).to_be_disabled()
            page.on('dialog', lambda dialog: dialog.accept())
            page.locator('.cart-clear').click()
            expect(page.locator('.cart-empty')).to_be_visible()
            page.goto(shop_url,wait_until='networkidle')
            page.locator('[data-cart-add="caneca-salve-regina-preta"]').click()
            page.locator('[data-cart-add="ecobag-salve-regina-m"]').click()
            page.locator('[data-category="camisetas"] [data-cart-size]').select_option('XG')
            expect(page.locator('[data-category="camisetas"] .shop-price')).to_contain_text('R$ 119,90')
            page.locator('[data-cart-add="camiseta-salve-regina"]').click()
            expect(page.locator('#shop-cart-feedback a[href="/pages/cart.html"]')).to_be_visible()
            expect(page.locator('[data-cart-count]')).to_have_text('3')
            saved=page.evaluate('JSON.parse(localStorage.getItem("douglasShopCart_v2"))')
            assert saved==[
                {'id':'caneca-salve-regina-preta','variant':'unico','qty':1},
                {'id':'ecobag-salve-regina-m','variant':'unico','qty':1},
                {'id':'camiseta-salve-regina','variant':'XG','qty':1}
            ],saved
            page.locator('.shop-cart-link').click()
            expect(page).to_have_url(base + '/pages/cart.html')
            expect(page.locator('.cart-item')).to_have_count(3)
            expect(page.locator('.cart-items-heading')).to_contain_text('Produtos no carrinho')
            expect(page.locator('.cart-line-total')).to_have_count(3)
            expect(page.locator('.shop-steps li[aria-current="step"]')).to_contain_text('Carrinho')
            expect(page.locator('.cart-summary')).to_contain_text('R$ 209,70')
            expect(page.locator('.cart-summary')).not_to_contain_text('sem preço de venda definido')
            expect(page.locator('.cart-summary a[href^="mailto:"]')).to_have_count(1)
            expect(page.locator('a[href^="/pages/checkout-salve-regina.html"]')).to_have_count(0)
            expect(page.locator('.cart-shipping-form')).to_have_count(0)
            expect(page.locator('.cart-shipping-slot')).to_contain_text('pacote')
            expect(page.get_by_role('button',name='Finalizar compra',exact=True)).to_be_disabled()
            assert 'D000002' in page.locator('.cart-action-secondary[href^="mailto:"]').get_attribute('href')
            page.locator('.cart-item').first.get_by_role('button',name='Aumentar quantidade').click()
            expect(page.locator('.cart-item').first.locator('.cart-quantity-number')).to_have_text('2')
            page.locator('.cart-item').first.get_by_role('button',name='Remover').click()
            expect(page.locator('.cart-item')).to_have_count(2)
            page.locator('.cart-clear').click()
            expect(page.locator('.cart-empty')).to_be_visible()
            assert page.evaluate('JSON.parse(localStorage.getItem("douglasShopCart_v2"))') == []

            # Só uma camiseta e só com readiness verdadeiro expõe o checkout.
            page.goto(shop_url,wait_until='networkidle')
            page.locator('[data-category="camisetas"] [data-cart-size]').select_option('XG')
            page.locator('[data-cart-add="camiseta-salve-regina"]').click()
            state['checkout_enabled']=True
            page.goto(base+'/pages/cart.html',wait_until='networkidle')
            expect(page.locator('a[href^="/pages/checkout-salve-regina.html"]')).to_have_attribute(
                'href','/pages/checkout-salve-regina.html?size=XG')
            expect(page.get_by_role('link',name='Finalizar compra com Mercado Pago')).to_be_visible()
            expect(page.locator('.cart-shipping-form')).to_be_visible()
            expect(page.locator('.cart-total')).to_have_text('Total com frete: a calcular')
            cart_zip=page.locator('.cart-shipping-form input[name="zipCode"]')
            cart_zip.fill('01001-000')
            # O ensaio anterior simulou uma falha externa. Testa aqui a recuperação.
            state['shipping_failure']=True
            page.locator('.cart-shipping-form').get_by_role('button',name='Consultar frete').click()
            expect(page.locator('.cart-shipping-status')).to_contain_text('Frete indisponível')
            expect(page.locator('.cart-total')).to_have_text('Total com frete: a calcular')
            state['shipping_failure']=False
            page.locator('.cart-shipping-form').get_by_role('button',name='Consultar frete').click()
            expect(page.locator('.cart-shipping-choice')).to_have_count(2)
            expect(page.locator('.cart-shipping-choice-info .cart-shipping-best')).to_have_count(1)
            expect(page.locator('.cart-shipping-choice-price')).to_have_count(2)
            expect(page.locator('.cart-total')).to_contain_text('R$ 149,80')
            expect(page.locator('.cart-freight')).to_contain_text('R$ 29,90')
            page.locator('.cart-shipping-choice').nth(1).locator('input').check()
            expect(page.locator('.cart-total')).to_contain_text('R$ 138,40')
            expect(page.locator('.cart-freight')).to_contain_text('R$ 18,50')
            assert '138%2C40' in page.locator('.cart-action-secondary[href^="mailto:"]').get_attribute('href')
            page.get_by_role('link',name='Finalizar compra com Mercado Pago').click()
            expect(page).to_have_url(base+'/pages/checkout-salve-regina.html?size=XG')
            expect(page.locator('#sale-checkout input[name="zipCode"]')).to_have_value('01001-000')
            expect(page.locator('#checkout-total')).to_contain_text('138,40')
            expect(page.locator('.checkout-panel')).to_have_count(4)
            expect(page.locator('.checkout-summary')).to_contain_text('Resumo do pedido')
            expect(page.locator('.checkout-section-heading')).to_have_count(4)
            expect(page.locator('.shipping-choice')).to_have_count(2)
            expect(page.locator('.shipping-choice.is-selected')).to_have_count(1)
            for width in [320, 390, 768, 1440]:
                page.set_viewport_size({'width':width,'height':900})
                assert_no_overflow(page)
            page.set_viewport_size({'width':1440,'height':900})
            page.goto(base+'/pages/cart.html',wait_until='networkidle')
            cart_zip=page.locator('.cart-shipping-form input[name="zipCode"]')
            cart_zip.fill('01001-000')
            page.locator('.cart-shipping-form').get_by_role('button',name='Consultar frete').click()
            expect(page.locator('.cart-total')).to_contain_text('R$ 149,80')
            cart_zip.fill('20040-020')
            expect(page.locator('.cart-total')).to_have_text('Total com frete: a calcular')
            state['checkout_enabled']=False
            page.reload(wait_until='networkidle')
            expect(page.locator('a[href^="/pages/checkout-salve-regina.html"]')).to_have_count(0)
            page.goto(base+'/pages/checkout-salve-regina.html?size=G',wait_until='networkidle')
            expect(page.locator('#checkout-container')).to_be_hidden()
            expect(page.locator('#checkout-readiness')).to_contain_text('aguarda')
            expect(page.locator('#sale-checkout')).to_have_count(0)
            calls_before=len(api_calls)
            page.goto(base+'/pages/checkout-salve-regina.html?preview=visual&size=XG',wait_until='networkidle')
            expect(page.locator('#checkout-readiness')).to_contain_text('PRÉVIA VISUAL')
            expect(page.locator('.checkout-panel')).to_have_count(4)
            expect(page.locator('#product-amount')).to_have_text('R$ 119,90')
            expect(page.locator('#pay-now')).to_be_disabled()
            expect(page.locator('#ship-quote')).to_be_disabled()
            assert page.locator('#sale-checkout input:not([disabled])').count()==0
            assert all(path!='/api/checkout/live' for _,path in api_calls[calls_before:])
            page.evaluate('localStorage.removeItem("douglasShopCart_v2")')
            print('PASS: sacola, tamanhos, quantidades, cotação e checkout condicionado', flush=True)

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
            expect(plain.locator('.shop-product-card:visible')).to_have_count(6)
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
