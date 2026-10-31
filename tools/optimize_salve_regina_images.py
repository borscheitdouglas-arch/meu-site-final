"""Exporta cópias WebP responsivas, sem recortar ou sobrescrever os PNGs originais.

Requer Playwright/Chromium, também usados nos testes da loja.
Executar: python3 tools/optimize_salve_regina_images.py
"""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/img/loja/Salve-Regina'
TARGET = SOURCE / 'web'
IMAGES = {
    'CAMISA-SalveRegina.png': ('camiseta', [480, 800, 1254]),
    'CANECA-SalveRegina.png': ('caneca', [480, 800, 1254]),
    'ECOBAG-SalveRegina.png': ('ecobag', [480, 800, 1254]),
    'CCE-SalveRegina.png': ('colecao', [640, 1024, 1672]),
}


def main():
    TARGET.mkdir(exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.route('**/*', lambda route: route.abort())
        for filename, (slug, sizes) in IMAGES.items():
            original = (SOURCE / filename).read_bytes()
            for width in sizes:
                encoded = page.evaluate('''async ({source, width}) => {
                    const image = new Image();
                    image.src = 'data:image/png;base64,' + source;
                    await image.decode();
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.min(width, image.naturalWidth);
                    canvas.height = Math.round(image.naturalHeight * canvas.width / image.naturalWidth);
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    return canvas.toDataURL('image/webp', 0.88);
                }''', {'source': base64.b64encode(original).decode(), 'width': width})
                if not encoded.startswith('data:image/webp;base64,'):
                    raise RuntimeError('O navegador não exportou WebP.')
                output = TARGET / f'{slug}-{width}.webp'
                output.write_bytes(base64.b64decode(encoded.split(',', 1)[1]))
                print(f'{output.relative_to(ROOT)}: {output.stat().st_size:,} bytes')
        browser.close()


if __name__ == '__main__':
    main()
