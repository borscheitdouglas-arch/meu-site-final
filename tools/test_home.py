"""Run against a local preview: python3 -m http.server 8765."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=getattr(p,engine).launch(**({'channel':'chromium'} if engine=='chromium' else {}))
  for w in [320,390,768,1440]:
   page=b.new_page(viewport={'width':w,'height':950},reduced_motion='reduce')
   page.route('**/*',lambda r:r.continue_() if '127.0.0.1' in r.request.url else r.abort())
   page.goto('http://127.0.0.1:8765',wait_until='networkidle')
   page.wait_for_selector('.home-carousel-controls')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(engine,w,'overflow')
   n=page.locator('#recent-content-carousel .lit-card').count()
   for i in range(n):
    page.locator('#recent-content-carousel .lit-dot').nth(i).click()
    assert page.locator('#recent-content-carousel .lit-dot').nth(i).get_attribute('aria-pressed')=='true'
    assert page.evaluate('''() => {let t=document.querySelector('.lit-carousel-track'), c=t.children[Math.round(t.scrollLeft/t.clientWidth)];return Math.abs(c.getBoundingClientRect().left-t.getBoundingClientRect().left)<3}'''),(engine,w,i)
   page.locator('#recent-content-carousel .prev').focus()
   page.keyboard.press('Home')
   page.locator('body').click(position={'x': 2, 'y': 2})
   page.evaluate('window.scrollTo(0,0)')
   page.screenshot(path=f'/private/tmp/home-{engine}-{w}.png',full_page=True)
   print(engine,w,'OK',n,'slides')
   page.close()
  b.close()
