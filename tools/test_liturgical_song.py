"""Validação das páginas de canto; requer Playwright e Chromium instalados."""
from pathlib import Path
import tempfile, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json,hashlib
from urllib.parse import unquote,urlsplit
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self, *_args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}'
OUT=Path(tempfile.mkdtemp(prefix='chant-review-'))
files=sorted([*ROOT.glob('pages/*-entrada.html'),*ROOT.glob('pages/*-comunhao.html')])
errors=[]; metrics=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chromium')
 ctx=browser.new_context(accept_downloads=True)
 ctx.route('**/*', lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
 page=ctx.new_page();page.on('pageerror', lambda e:errors.append(str(e)))
 for file in files:
  for width in [1440,768,390,320]:
   page.set_viewport_size({'width':width,'height':900})
   page.goto(BASE+'/pages/'+file.name,wait_until='domcontentloaded');page.evaluate('document.fonts.ready'); page.wait_for_timeout(250)
   m=page.evaluate('''() => {const shell=document.querySelector('.video-shell').getBoundingClientRect(); const button=document.querySelector('.chant-play').getBoundingClientRect();const title=document.querySelector('#video-title').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,center:shell.x+shell.width/2,clip:button.bottom>shell.bottom || title.top<shell.top,images:[...document.querySelectorAll('main img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}}''')
   metrics.append([file.name,width,m]);assert m['scroll']==width,(file.name,m);assert abs(m['center']-width/2)<1,(file.name,m);assert not m['clip'],(file.name,m);assert not m['images'],m
   if file.name in ['advento-1-entrada.html','advento-2-comunhao.html','tempo-comum-29-comunhao.html'] and width in [390,1440]:
    page.screenshot(path=str(OUT/f'{file.stem}-{width}.png'),full_page=True)
  assert not page.locator('#video-player iframe').count()
  src=page.locator('.chant-media').get_attribute('data-video-src');title=page.locator('.chant-media').get_attribute('data-video-title')
  page.locator('.chant-play').click();expect(page.locator('#video-player iframe')).to_have_attribute('src',src);expect(page.locator('#video-player iframe')).to_have_attribute('title',title)
  page.locator('.chant-hide-player').click();expect(page.locator('.chant-play')).to_be_focused()
  if page.locator('[data-preview-target]').count():
   page.locator('[data-preview-target]').click();expect(page.locator('#score-preview')).to_be_visible(); page.locator('.chant-close-preview').click(); expect(page.locator('[data-preview-target]')).to_be_focused()
   link=page.locator('a[download]').first;url=link.get_attribute('href');link.click();expect(page.get_by_role('dialog')).to_be_visible()
   with page.expect_download() as event:page.get_by_role('button',name='Continuar gratuitamente',exact=True).click()
   assert hashlib.sha256(Path(event.value.path()).read_bytes()).digest()==hashlib.sha256((file.parent/unquote(url)).read_bytes()).digest()
  else:expect(page.get_by_role('heading',name='Partitura em breve')).to_be_visible()
  print('PASS',file.name,flush=True)
 page.locator('#menu-btn').click();expect(page.locator('#close-nav')).to_be_focused(); page.keyboard.press('Shift+Tab');assert page.evaluate("!!document.activeElement.closest('#side-nav')"); page.keyboard.press('Tab');expect(page.locator('#close-nav')).to_be_focused();page.keyboard.press('Escape');expect(page.locator('#menu-btn')).to_be_focused()
 page.emulate_media(reduced_motion='reduce');assert page.locator('.chant-heading h1').evaluate('(el)=>getComputedStyle(el).animationName')=='none'
 # Simula uma página ainda sem vídeo: a partitura continua funcionando.
 html=(ROOT/'pages/tempo-comum-29-comunhao.html').read_text().replace('data-video-id="zItxataYVA8"','data-video-id=""')
 ctx.route('**/pages/sem-video.html',lambda r:r.fulfill(body=html,content_type='text/html'))
 page.goto(BASE+'/pages/sem-video.html');expect(page.get_by_role('heading',name='Vídeo em breve')).to_be_visible()
 assert page.locator('.chant-media a, .chant-media button, .chant-media iframe').count()==0
 page.locator('[data-preview-target]').click();expect(page.locator('#score-preview')).to_be_visible()
 # Conteúdo e links diretos seguem acessíveis sem JavaScript.
 nojs=browser.new_context(java_script_enabled=False)
 nojs.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
 fallback=nojs.new_page();fallback.goto(BASE+'/pages/advento-1-entrada.html')
 expect(fallback.locator('.chant-video-links a')).to_be_visible();expect(fallback.locator('a[download]').first).to_be_visible()
 nojs.close()
 assert not errors,errors
 browser.close()
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2));print('PASS menu, reduced motion; no JS errors')

server.shutdown()
print("Capturas:", OUT)
