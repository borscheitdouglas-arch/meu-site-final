"""Captura apenas a parte superior da loja para revisão visual do cabeçalho."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "header-previews"


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for width in (1440, 390):
                page = browser.new_page(viewport={"width": width, "height": 850}, device_scale_factor=1)
                page.goto(f"http://127.0.0.1:{server.server_port}/pages/loja.html", wait_until="domcontentloaded")
                page.wait_for_load_state("networkidle", timeout=10000)
                page.screenshot(path=str(OUTPUT / f"cabecalho-{width}.png"),
                                clip={"x": 0, "y": 0, "width": width, "height": 320})
                page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
