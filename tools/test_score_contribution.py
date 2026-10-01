"""Testes de navegador do fluxo global; requer playwright (Chromium e WebKit)."""
import base64
import hashlib
import json
import tempfile
import threading
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(tempfile.mkdtemp(prefix="score-contribution-review-"))
SCORE_A = "pages/advento-1-entrada.html"
SCORE_B = "pages/pater-noster-notacao-moderna-cifrada.html"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class Inventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.downloads = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and "download" in attrs:
            self.downloads.append(attrs)
        if tag == "script":
            self.scripts.append(attrs.get("src", ""))


def context(browser, base, **options):
    result = browser.new_context(accept_downloads=True, **options)
    # Os testes são locais e não carregam anúncios, vídeos ou serviços externos.
    result.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base) or route.request.url.startswith("data:") else route.abort())
    return result


def open_score(page, base, path=SCORE_A):
    page.goto(base + path, wait_until="domcontentloaded")
    page.wait_for_function("Boolean(window.ScoreContribution)")
    link = page.locator("a[download]").first
    href = link.evaluate("el => el.href")
    link.click()
    expect(page.get_by_role("dialog")).to_be_visible()
    expect(page.get_by_role("heading", name="Apoie este apostolado musical")).to_be_focused()
    return href


def finish_download(page, expected_url):
    with page.expect_download() as event:
        page.get_by_role("button", name="Continuar gratuitamente", exact=True).click()
    download = event.value
    assert download.url == expected_url, "O download deve preservar a URL escolhida"
    assert download.failure() is None
    expect(page.get_by_role("dialog")).not_to_be_visible()
    if expected_url.startswith("data:"):
        expected_bytes = base64.b64decode(expected_url.split(",", 1)[1])
    else:
        path = ROOT / unquote(urlsplit(expected_url).path).lstrip("/")
        expected_bytes = path.read_bytes() if path.is_file() else None
    if expected_bytes is not None:
        assert hashlib.sha256(Path(download.path()).read_bytes()).digest() == hashlib.sha256(expected_bytes).digest()
    return download


def desktop_checks(browser, base):
    ctx = context(browser, base, viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    href = open_score(page, base)
    assert page.evaluate("document.body.style.position") == "fixed"
    page.screenshot(path=str(ARTIFACTS / "desktop.png"), animations="disabled")
    finish_download(page, href)
    expect(page.locator("a[download]").first).to_be_focused()
    assert page.evaluate("document.body.style.position") != "fixed"
    for amount in ("5", "10", "20"):
        page.locator("a[download]").first.click()
        page.get_by_role("radio", name="R$ " + amount, exact=True).check()
        expect(page.get_by_role("radio", name="R$ " + amount, exact=True)).to_be_checked()
        page.get_by_role("button", name="Contribuir via PIX e baixar").click()
        expect(page.locator(".sc-pix-amount")).to_contain_text(amount + ",00")
        expect(page.locator("#sc-pix-key")).to_have_value("douglas.assumpcao@hotmail.com")
        finish_download(page, href)
    print("PASS: download real (bytes do PDF), foco restaurado, R$ 5/10/20 e PIX", flush=True)

    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    page.locator("a[download]").first.click()
    page.get_by_role("button", name="Contribuir via PIX e baixar").click()
    page.get_by_role("button", name="Copiar chave PIX").click()
    expect(page.get_by_role("status")).to_contain_text("Chave PIX copiada")
    assert page.evaluate("navigator.clipboard.readText()") == "douglas.assumpcao@hotmail.com"
    page.evaluate("Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(new Error('denied'))}, configurable: true})")
    page.get_by_role("button", name="Copiar chave PIX").click()
    expect(page.get_by_role("status")).to_contain_text("Selecione e copie")
    expect(page.locator("#sc-pix-key")).to_be_focused()
    page.get_by_role("button", name="Voltar aos valores").click()
    expect(page.get_by_role("radio", name="R$ 10", exact=True)).to_be_focused()
    finish_download(page, href)
    print("PASS: cópia de PIX, cópia manual e retorno aos valores", flush=True)

    page.locator("a[download]").first.click()
    page.get_by_role("radio", name="Outro valor").check()
    custom = page.get_by_label("Qual valor deseja oferecer?")
    expect(custom).to_be_focused()
    for invalid in ("", "0", "-5", "abc", "1,234", "Infinity"):
        custom.fill(invalid)
        page.get_by_role("button", name="Contribuir via PIX e baixar").click()
        expect(page.get_by_role("alert")).to_be_visible()
        expect(page.locator(".sc-pix")).not_to_be_visible()
    # Mesmo um valor inválido nunca impede o download gratuito.
    finish_download(page, href)
    for raw, formatted in (("12,34", "12,34"), ("7.50", "7,50"), ("1.234,56", "1.234,56")):
        page.locator("a[download]").first.click()
        page.get_by_role("radio", name="Outro valor").check()
        custom.fill(raw)
        page.get_by_role("button", name="Contribuir via PIX e baixar").click()
        expect(page.locator(".sc-pix-amount")).to_contain_text(formatted)
        finish_download(page, href)

    for close in ("escape", "button", "backdrop"):
        page.locator("a[download]").first.click()
        expect(page.get_by_role("dialog")).to_be_visible()
        page.keyboard.press("Shift+Tab")
        expect(page.get_by_role("button", name="Continuar gratuitamente", exact=True)).to_be_focused()
        page.keyboard.press("Tab")
        expect(page.get_by_role("button", name="Fechar contribuição")).to_be_focused()
        if close == "escape":
            page.keyboard.press("Escape")
        elif close == "button":
            page.get_by_role("button", name="Fechar contribuição").click()
        else:
            page.mouse.click(2, 2)
        expect(page.get_by_role("dialog")).not_to_be_visible()
        expect(page.locator("a[download]").first).to_be_focused()
    assert page.locator("dialog.score-contribution").count() == 1
    print("PASS: outro valor, validação, gratuidade independente do valor, X/ESC/fundo e teclado", flush=True)

    href_b = open_score(page, base, SCORE_B)
    assert href_b != href
    finish_download(page, href_b)
    # Outra URL na mesma página, inserida após o carregamento, com nome de arquivo.
    page.evaluate("""href => {
      const a = document.createElement('a');
      a.id = 'new-score'; a.href = href; a.download = 'nova-partitura.pdf';
      a.textContent = 'Baixar partitura nova'; document.querySelector('main').prepend(a);
    }""", href)
    page.locator("#new-score").click()
    # Alterar o link depois do clique não pode trocar o arquivo já escolhido.
    page.locator("#new-score").evaluate("(el, href) => el.href = href", href_b)
    result = finish_download(page, href)
    assert result.suggested_filename == "nova-partitura.pdf"
    page.locator("#new-score").click()
    finish_download(page, href_b)
    assert not errors, errors
    print("PASS: partituras consecutivas, link dinâmico e preservação do arquivo selecionado", flush=True)

    # Cadastro real pelo formulário administrativo, em armazenamento isolado do teste.
    page.goto(base + "admin/index.html")
    page.locator("#pwd").fill("admin123")
    page.locator("#loginBtn").click()
    page.locator("#title").fill("Partitura gratuita cadastrada no teste")
    pdf = ROOT / unquote(urlsplit(href).path).lstrip("/")
    page.locator("#sheet").set_input_files(str(pdf))
    page.locator("#saveProd").click()
    page.wait_for_function("JSON.parse(localStorage.getItem('shopProducts_v1') || '[]').length === 1")
    product = page.evaluate("JSON.parse(localStorage.getItem('shopProducts_v1'))[0]")
    page.goto(base + "pages/produto.html?id=" + product["id"])
    page.get_by_role("link", name="Download da partitura").click()
    expect(page.locator(".sc-score-name")).to_have_text(product["title"])
    result = finish_download(page, product["sheet"])
    assert result.suggested_filename == product["sheetName"]
    page.evaluate("""() => { const products = JSON.parse(localStorage.getItem('shopProducts_v1'));
      products[0].price = 'R$ 19,90'; localStorage.setItem('shopProducts_v1', JSON.stringify(products)); }""")
    page.reload()
    with page.expect_download():
        page.get_by_role("link", name="Download da partitura").click()
    expect(page.get_by_role("dialog")).not_to_be_visible()
    print("PASS: cadastro local real, data URL, nome do upload e produto pago excluído", flush=True)

    # Destaques inseridos assincronamente pelo mecanismo existente.
    ctx.route("**/pages/pages.json", lambda route: route.fulfill(content_type="application/json", body=json.dumps([
        {"title": "Novo destaque", "url": "/" + SCORE_A, "download": href, "hasPartitura": True}
    ])))
    page.goto(base + "index.html")
    page.locator(".articles a[download]").click()
    expect(page.locator(".sc-score-name")).to_have_text("Novo destaque")
    finish_download(page, href)
    print("PASS: novos destaques gerados a partir de pages.json", flush=True)
    ctx.close()


def inventory_checks(browser, base):
    ctx = context(browser, base, reduced_motion="reduce")
    page = ctx.new_page()
    total = 0
    missing = []
    for path in sorted(ROOT.glob("pages/*.html")):
        parser = Inventory()
        parser.feed(path.read_text(encoding="utf-8-sig"))
        if not parser.downloads or path.name == "template.html":
            continue
        assert any(src.endswith("/scripts/script.js") for src in parser.scripts), path
        page.goto(base + "pages/" + path.name, wait_until="domcontentloaded")
        page.wait_for_function("Boolean(window.ScoreContribution)")
        # Captura a retomada, evitando navegação para os PDFs que já estão ausentes.
        page.evaluate("""() => {
          window.resumed = [];
          document.addEventListener('click', event => {
            const link = event.target.closest('a[download]');
            if (link && link.hidden) { window.resumed.push(link.href); event.preventDefault(); }
          }, true);
        }""")
        for index, attrs in enumerate(parser.downloads):
            link = page.locator("a[download]").nth(index)
            href = link.evaluate("el => el.href")
            # Inclui botões escondidos dentro dos pré-visualizadores.
            link.evaluate("el => el.click()")
            expect(page.get_by_role("dialog")).to_be_visible()
            page.get_by_role("button", name="Continuar gratuitamente", exact=True).click()
            expect(page.get_by_role("dialog")).not_to_be_visible()
            assert page.evaluate("window.resumed.at(-1)") == href
            local = ROOT / unquote(urlsplit(href).path).lstrip("/")
            if not local.is_file():
                missing.append({"page": path.name, "pdf": attrs["href"]})
            total += 1
    (ARTIFACTS / "missing-existing-pdfs.json").write_text(json.dumps(missing, ensure_ascii=False, indent=2))
    print(f"PASS: todos os {total} links públicos atuais; {len(missing)} apontam a PDFs previamente ausentes", flush=True)
    ctx.close()


def responsive_checks(browser, base, name):
    for width, height in ((390, 844), (320, 568), (768, 1024)):
        ctx = context(browser, base, viewport={"width": width, "height": height}, is_mobile=True, has_touch=True, device_scale_factor=2)
        page = ctx.new_page()
        # Esta página usa o layout responsivo atual; páginas antigas possuem
        # sobreposições próprias em 320px, anteriores ao sistema de contribuição.
        href = open_score(page, base, SCORE_B)
        dialog = page.get_by_role("dialog")
        box = dialog.bounding_box()
        assert box["x"] >= 0 and box["y"] >= 0
        assert box["x"] + box["width"] <= width + 1
        assert box["y"] + box["height"] <= height + 1
        assert dialog.evaluate("el => el.scrollWidth <= el.clientWidth")
        assert page.locator(".sc-content").evaluate("el => el.scrollWidth <= el.clientWidth")
        expect(page.get_by_role("button", name="Continuar gratuitamente", exact=True)).to_be_in_viewport(ratio=1)
        page.screenshot(path=str(ARTIFACTS / f"{name}-{width}.png"), animations="disabled")
        page.get_by_role("radio", name="Outro valor").check()
        page.get_by_label("Qual valor deseja oferecer?").fill("8,50")
        page.get_by_role("button", name="Contribuir via PIX e baixar").click()
        expect(page.locator(".sc-pix-amount")).to_contain_text("8,50")
        expect(page.get_by_role("button", name="Continuar gratuitamente", exact=True)).to_be_in_viewport(ratio=1)
        page.wait_for_function("document.querySelector('.sc-qr').complete && document.querySelector('.sc-qr').naturalWidth > 0")
        page.screenshot(path=str(ARTIFACTS / f"{name}-{width}-pix.png"), animations="disabled")
        finish_download(page, href)
        expect(page.locator("a[download]").first).to_be_focused()
        ctx.close()
    print(f"PASS: {name}, telas 320/390/768 px, PIX e downloads", flush=True)


def fallback_checks(browser, base):
    ctx = context(browser, base)
    ctx.route("**/styles/score-contribution.css", lambda route: route.abort())
    page = ctx.new_page()
    page.goto(base + SCORE_A)
    link = page.locator("a[download]").first
    with page.expect_download():
        link.click()
    expect(page.get_by_role("dialog")).not_to_be_visible()
    ctx.close()
    ctx = context(browser, base, java_script_enabled=False)
    page = ctx.new_page()
    page.goto(base + SCORE_A)
    with page.expect_download():
        page.locator("a[download]").first.click()
    ctx.close()
    print("PASS: download preservado sem CSS e sem JavaScript", flush=True)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/"
    try:
        with sync_playwright() as playwright:
            chromium = playwright.chromium.launch()
            desktop_checks(chromium, base)
            inventory_checks(chromium, base)
            responsive_checks(chromium, base, "chromium")
            fallback_checks(chromium, base)
            chromium.close()
            webkit = playwright.webkit.launch()
            responsive_checks(webkit, base, "webkit")
            webkit.close()
    finally:
        server.shutdown()
        server.server_close()
        print(f"Capturas e inventário: {ARTIFACTS}", flush=True)


if __name__ == "__main__":
    main()
