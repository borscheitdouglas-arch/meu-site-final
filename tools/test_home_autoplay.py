"""Check autoplay, independent image motion and reduced-motion preferences."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
 for engine in ['chromium', 'webkit']:
  browser = getattr(p, engine).launch(**({'channel': 'chromium'} if engine == 'chromium' else {}))
  page = browser.new_page(viewport={'width': 1440, 'height': 950})
  page.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
  page.goto('http://127.0.0.1:8765', wait_until='networkidle')
  root = page.locator('#recent-content-carousel')
  root.scroll_into_view_if_needed()
  page.mouse.move(0, 0)
  assert page.locator('.home-carousel-play').count() == 0
  page.wait_for_function("document.querySelectorAll('.lit-dot')[1].getAttribute('aria-pressed') === 'true'", timeout=12000)
  page.wait_for_timeout(800)
  page.locator('#recent-content-carousel .next').click()
  page.wait_for_function("document.querySelectorAll('.lit-dot')[2].getAttribute('aria-pressed') === 'true'")
  image = page.locator('.lit-card.is-active .home-card-image')
  assert image.evaluate("e => getComputedStyle(e).animationPlayState") == 'running'
  page.wait_for_timeout(1700)
  assert float(image.evaluate("e => getComputedStyle(e).scale")) > 1.04
  page.mouse.move(0, 0)
  page.wait_for_timeout(1800)
  assert float(image.evaluate("e => getComputedStyle(e).scale")) == 1
  assert image.evaluate("e => getComputedStyle(e).animationPlayState") == 'running'
  page.emulate_media(reduced_motion='reduce')
  page.wait_for_function("getComputedStyle(document.querySelector('.lit-card.is-active .home-card-image')).animationName === 'none'")
  assert not root.evaluate("e => e.classList.contains('is-playing')")
  print(engine, 'automatic advance / hover zoom / independent animation / reduced motion OK')
  browser.close()
