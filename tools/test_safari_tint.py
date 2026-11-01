"""Verifica cores computadas para o Safari 26 sem realizar pagamentos ou pedidos.

O teste usa Chromium para conferir CSS e navegação em telas distintas.
A cor real da interface do Safari deve ser verificada no Mac do usuário.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GOLD = "rgb(172, 116, 47)"   # Dourado-âmbar do conteúdo editorial
COPPER = "rgb(183, 100, 54)"  # Cobre da loja e páginas próprias


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass


# Nome, caminho, cor do body (None se a página tem fundo particular),
# cor do header (None se o cabeçalho não é fixo).
PAGES = [
    ("início", "/index.html", GOLD, GOLD),
    ("repertório", "/pages/advento-1.html", GOLD, GOLD),
    ("canto gregoriano", "/pages/advento-1-entrada.html", GOLD, GOLD),
    ("canto de comunhão", "/pages/tempo-comum-23-comunhao.html", GOLD, GOLD),
    ("formações", "/pages/formacoes.html", GOLD, GOLD),
    ("contato", "/pages/contato.html", GOLD, GOLD),
    ("doação", "/pages/doacao.html", None, GOLD),
    ("loja", "/pages/loja.html", COPPER, COPPER),
    ("coleção Salve Regina", "/pages/colecao-salve-regina.html", COPPER, None),
    ("condições da loja", "/pages/condicoes-da-loja.html", COPPER, None),
    ("checkout não ativo", "/pages/checkout-salve-regina.html", COPPER, None),
    ("retorno de pagamento", "/pages/resultado-pagamento.html", COPPER, None),
    ("prévia de produtos", "/pages/produtos-personalizados.html", COPPER, None),
]


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0),
                                 partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(reduced_motion="reduce")
            context.route("**/*", lambda route: route.continue_()
                          if route.request.url.startswith(base + "/")
                          else route.abort())
            page = context.new_page()
            for width in (390, 1440):
                page.set_viewport_size({"width": width, "height": 900})
                for name, path, body_expected, header_expected in PAGES:
                    response = page.goto(base + path, wait_until="domcontentloaded")
                    assert response and response.status == 200, (name, response)
                    if body_expected:
                        body_color = page.evaluate(
                            "() => getComputedStyle(document.body).backgroundColor")
                        assert body_color == body_expected, (name, width, "body", body_color)
                        bg_image = page.evaluate(
                            "() => getComputedStyle(document.body).backgroundImage")
                        assert bg_image != "none", (name, width, "missing visual background")
                    if header_expected:
                        header_color = page.locator("body > .site-header").evaluate(
                            "el => getComputedStyle(el).backgroundColor")
                        assert header_color == header_expected, (name, width, "header", header_color)
                        backdrop = page.locator("body > .site-header").evaluate(
                            "el => getComputedStyle(el).backdropFilter")
                        assert backdrop == "none", (name, width, "backdrop", backdrop)
                    if body_expected == COPPER:
                        meta = page.locator('meta[name="theme-color"]')
                        assert meta.count() == 1, (name, width, "missing theme-color")
                        assert meta.get_attribute("content") == "#b76436", (name, width)
                    print(f"PASS: {name} — {width}px", flush=True)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
