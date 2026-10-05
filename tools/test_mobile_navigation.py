"""Verifica a navegação móvel contra uma prévia local na porta 8765."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=getattr(p,engine).launch(**({'channel':'chromium'} if engine=='chromium' else {}))
  for width,height in [(320,700),(390,844),(667,375),(1440,900),(1024,900)]:
   page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce',has_touch=width<768)
   page.route('**/*',lambda r:r.continue_() if '127.0.0.1' in r.request.url else r.abort())
   page.goto('http://127.0.0.1:8765',wait_until='networkidle')
   if engine=='chromium' and width>=1024:
    image=page.screenshot()
    baseline=Path(f'/private/tmp/nav-before-{width}.png')
    if baseline.exists(): assert image==baseline.read_bytes(),('desktop changed',width)
   if width<768:
    assert page.locator('#menu-btn').bounding_box()['height']>=44
    assert page.locator('#menu-btn').evaluate("e=>getComputedStyle(e,'::after').display")!='none'
   page.locator('#menu-btn').click()
   if engine=='chromium' and width>=1024:
    baseline=Path(f'/private/tmp/nav-before-open-{width}.png')
    if baseline.exists(): assert page.screenshot()==baseline.read_bytes(),('desktop open changed',width)
   if width<768:
    box=page.locator('#side-nav').bounding_box()
    assert width-box['width']>=43
    assert box['height']<=height
    page.locator('#side-nav summary.tempo-comum').click()
    last=page.locator('#side-nav a[href="/pages/tempo-comum-34.html"]')
    last.scroll_into_view_if_needed()
    assert last.bounding_box()['y']+last.bounding_box()['height']<=height
    page.locator('#menu-query').fill('29 comunhao')
    expect(page.locator('.menu-search-results a')).to_have_count(1)
    page.locator('[aria-label="Limpar busca"]').click()
    page.locator('#side-nav summary.tempo-comum').click()
    page.locator('#side-nav > ul').first.evaluate('e=>e.scrollTop=0')
    page.screenshot(path=f'/private/tmp/mobile-nav-{engine}-{width}.png')
    page.mouse.click(width-10,100)
    expect(page.locator('#menu-btn')).to_have_attribute('aria-expanded','false')
   print(engine,width,height,'OK')
   page.close()
  b.close()
