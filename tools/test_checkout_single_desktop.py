"""Regressão visual do checkout individual: desktop modernizado, celular intacto.

Usa ?preview=visual (sem pagamento, sem cotar frete, sem dados pessoais).
Executa offline em Chromium e WebKit com os estilos reais da página.
"""
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0),
                                 partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as playwright:
            for engine in ('chromium', 'webkit'):
                browser = getattr(playwright, engine).launch(headless=True)
                for width, height in ((390, 844), (667, 375), (1024, 768), (1440, 900)):
                    context = browser.new_context(
                        viewport={'width': width, 'height': height},
                        has_touch=width < 768,
                        reduced_motion='reduce',
                    )
                    requests = []

                    def route_request(route):
                        url = route.request.url
                        if url.startswith(base+'/') or url.startswith('data:'):
                            route.continue_()
                        else:
                            requests.append(url)
                            route.abort()

                    context.route('**/*', route_request)
                    page = context.new_page()
                    page.goto(base + '/pages/checkout-salve-regina.html?preview=visual'
                              '&sku=caneca-salve-regina-preta', wait_until='domcontentloaded')
                    expect(page.locator('#sale-checkout')).to_be_visible(timeout=12000)
                    expect(page.locator('.checkout-panel')).to_have_count(4)
                    expect(page.locator('#checkout-total')).to_be_visible()
                    expect(page.locator('#pay-now')).to_be_disabled()
                    expect(page.locator('#checkout-readiness')).to_contain_text('PRÉVIA VISUAL')
                    assert 'checkout-single-modern' in page.locator('body').get_attribute('class')
                    assert page.locator('link[href*="checkout-salve-regina-desktop.css"]').count() == 1

                    props = page.evaluate("""() => {
                        const st = selector => getComputedStyle(document.querySelector(selector));
                        const rect = selector => {
                          const b = document.querySelector(selector).getBoundingClientRect();
                          return {x:b.x,right:b.right,width:b.width,height:b.height};
                        };
                        return {
                          bodyBg:st('body').backgroundColor,
                          panelBg:st('.checkout-panel').backgroundColor,
                          panelImage:st('.checkout-panel').backgroundImage,
                          sidebarBg:st('.checkout-summary').backgroundImage,
                          gridCols:st('#sale-checkout').gridTemplateColumns.split(' ').length,
                          left:rect('.checkout-form-column'),
                          right:rect('.checkout-sidebar'),
                          viewport:document.documentElement.clientWidth,
                          scroll:document.documentElement.scrollWidth,
                          buttonHeight:rect('#pay-now').height,
                          header:rect('.shop-shared-header')
                        };
                    }""")
                    assert props['scroll'] <= props['viewport']+2, (engine, width, props)
                    assert props['buttonHeight'] >= 44, (engine, width, props)
                    if width >= 881:
                        assert props['bodyBg'] == 'rgb(245, 242, 236)', (engine, width, props)
                        assert props['panelBg'] == 'rgb(255, 254, 250)', (engine, width, props)
                        assert props['gridCols'] == 2, (engine, width, props)
                        assert props['left']['right'] <= props['right']['x'], props
                        assert 'linear-gradient' in props['sidebarBg'], props
                    else:
                        # CSS antigo mantém exatamente seu tema e layout no celular.
                        assert props['bodyBg'] == 'rgb(183, 100, 54)', (engine, width, props)
                        assert props['gridCols'] == 1, (engine, width, props)
                        assert 'linear-gradient' in props['panelImage'], props
                    # Nenhuma tentativa de pagamento nem de frete na prévia.
                    assert not [url for url in requests if '/api/pay' in url
                                or '/api/checkout/live/start' in url
                                or '/api/shipping/preview' in url], requests
                    print(f'PASS: {engine} checkout {width}px - '
                          + ('desktop moderno' if width>=881 else 'mobile preservado'),
                          flush=True)
                    context.close()
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
