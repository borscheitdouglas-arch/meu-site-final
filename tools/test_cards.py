"""Regressões dos cards: largura, conteúdo visível, grades e acesso aos repertórios.

Requer Playwright e Chromium instalados. Executar: python3 tools/test_cards.py
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright, expect

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
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    paths = ['tempo-comum-10.html', 'tempo-comum-30.html', 'tempo-comum-32.html',
             'solenidade-todos-os-santos.html', 'solenidade-nossa-senhora-aparecida.html',
             'advento-1.html', 'advento-2.html', 'advento-3.html', 'advento-4.html',
             'advento-1-video.html', 'advento-2-video.html', 'kyrie.html', 'gloria.html',
             'sanctus.html', 'agnus-dei.html', 'ad-libitum.html', 'pater-noster.html', 'loja.html']
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            context = browser.new_context(reduced_motion='reduce')
            context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            for name in paths:
                for width in [1440, 768, 390, 320]:
                    page.set_viewport_size({'width': width, 'height': 1000})
                    page.goto(f'{base}/pages/{name}', wait_until='load')
                    expect(page.locator('main .card, main .store-card, main .atelier-product').first).to_be_visible()
                    failures = page.evaluate('''() => {
                      const issues = [];
                      if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('page overflow');
                      for (const card of document.querySelectorAll('main .card, main .store-card, main .atelier-product')) {
                        if (card.scrollWidth > card.clientWidth + 2) issues.push('card content clipped');
                        const box = card.getBoundingClientRect();
                        for (const el of card.querySelectorAll('.card-link, .store-buy-button, .atelier-buy, h2, h3')) {
                          const r = el.getBoundingClientRect();
                          if (r.left < box.left - 1 || r.right > box.right + 1) issues.push('title or button outside card');
                        }
                      }
                      for (const track of document.querySelectorAll('.carousel-section:not(:has(.carousel-controls)) .carousel-track')) {
                        if (track.scrollWidth > track.clientWidth + 1) issues.push('cards hidden without navigation');
                      }
                      for (const img of document.querySelectorAll('.carousel-section .card-icon img, .cards-container .card-icon img')) {
                        if (img.width !== 60 || img.height !== 60 || !img.naturalWidth) issues.push('invalid icon');
                      }
                      return issues;
                    }''')
                    assert not failures, (name, width, failures)
                print('OK', name, flush=True)
            # Repertoire links must also work without JavaScript.
            plain = browser.new_context(java_script_enabled=False)
            plain.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())
            static = plain.new_page()
            for name, count in [('advento-1', 3), ('advento-2', 3), ('advento-3', 3),
                                ('advento-4', 2), ('ad-libitum', 3), ('pater-noster', 4)]:
                static.goto(f'{base}/pages/{name}.html')
                expect(static.locator('main')).to_have_count(1)
                expect(static.locator('.card-link')).to_have_count(count)
                for link in static.locator('.card-link').all():
                    expect(link).to_be_visible()
            plain.close()
            page.goto(f'{base}/pages/loja.html')
            expect(page.locator('.atelier-product')).to_have_count(1)
            expect(page.locator('.atelier-buy')).to_have_count(2)
            for link in page.locator('.atelier-buy').all():
                expect(link).to_be_visible()
                assert link.get_attribute('href').startswith('https://')
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
    print('Cards aprovados em quatro larguras; repertórios sem JavaScript e compra externa funcionando.')

if __name__ == '__main__':
    main()
