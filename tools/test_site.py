"""Revisão em Chromium: navegação, erros locais, celular, PDF, PIX e carrinho.
Requer playwright e Chromium; todos os serviços externos ficam bloqueados.
"""
import sys,json,threading,hashlib
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import unquote,urlsplit,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
issues=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 ctx=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
 ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) or r.request.url.startswith('data:') else r.abort())
 page=ctx.new_page(); current=''
 page.on('pageerror',lambda e:issues.append({'page':current,'error':str(e)}))
 page.on('response',lambda r:issues.append({'page':current,'http':r.status,'url':r.url}) if r.url.startswith(base) and r.status>=400 else None)
 paths=[ROOT/'index.html',ROOT/'politica-de-privacidade.html',ROOT/'admin/index.html']+sorted((ROOT/'pages').glob('*.html'))
 overflows=[]
 for index,path in enumerate(paths):
  current=str(path.relative_to(ROOT));page.goto(base+current,wait_until='load');page.wait_for_timeout(100)
  # Force lazy local images to load without contacting external services.
  page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(el=>el.loading='eager')")
  if page.locator('#menu-btn').count():
   page.locator('#menu-btn').click()
   try:expect(page.locator('#side-nav')).to_have_class(__import__('re').compile(r'\bopen\b'),timeout=2000)
   except Exception:issues.append({'page':current,'error':'Menu não abriu'})
   page.keyboard.press('Escape')
  page.set_viewport_size({'width':390,'height':844})
  page.wait_for_timeout(30)
  dims=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
  if dims['scroll']>dims['width']+2:overflows.append({'page':current,**dims})
  page.set_viewport_size({'width':1280,'height':900})
  if index%20==0:print('Páginas verificadas:',index+1,flush=True)
 current='pages/tempo-comum-26-comunhao.html';page.goto(base+current)
 page.get_by_role('button',name='Visualizar partitura',exact=True).click()
 expect(page.locator('#score-preview')).to_be_visible()
 url=page.locator('#score-preview iframe').get_attribute('src')
 response=ctx.request.get(base+'pages/'+url)
 assert response.status==200 and response.body().startswith(b'%PDF-')
 page.locator('a[download]').first.click();expect(page.get_by_role('dialog')).to_be_visible()
 with page.expect_download() as event:page.get_by_role('button',name='Continuar gratuitamente',exact=True).click()
 download=event.value
 source=ROOT/unquote(urlsplit(download.url).path).lstrip('/')
 assert hashlib.sha256(Path(download.path()).read_bytes()).digest()==hashlib.sha256(source.read_bytes()).digest()
 print('PASS: prévia e download real do PDF do 26º Domingo',flush=True)
 # Os botões antigos de PIX devem funcionar inclusive após a cópia assíncrona.
 ctx.grant_permissions(['clipboard-read','clipboard-write'])
 for path in paths:
  if 'onclick="copyPixKey(this)"' not in path.read_text(encoding='utf-8-sig'):continue
  current=str(path.relative_to(ROOT));page.goto(base+current)
  button=page.locator('[onclick="copyPixKey(this)"]').first
  button.click()
  expect(button).to_contain_text('Copiado!')
  assert page.evaluate('navigator.clipboard.readText()')=='douglas.assumpcao@hotmail.com'
 print('PASS: todos os nove botões de copiar PIX',flush=True)
 current='pages/cart.html';page.goto(base+current)
 page.evaluate("localStorage.setItem('shopProducts_v1',JSON.stringify([{id:'review',title:'Partitura teste',price:'R$ 1.234,56'}]));addToCart('review',2)")
 page.reload();expect(page.locator('#cart-root')).to_contain_text('2469,12')
 page.evaluate('window.open = url => { window.reviewCheckout = url; }')
 page.locator('#whatsCheckout').click()
 msg=parse_qs(urlsplit(page.evaluate('window.reviewCheckout')).query)['text'][0]
 assert '\n' in msg and '%0A' not in msg and '2469,12' in msg
 print('PASS: carrinho, milhares no preço e texto WhatsApp (sem envio)',flush=True)
 print('BROWSER_ISSUES',json.dumps(issues,ensure_ascii=False),flush=True)
 print('MOBILE_OVERFLOW',json.dumps(overflows,ensure_ascii=False),flush=True)
 assert not issues, issues
 assert not overflows, overflows
 browser.close()
server.shutdown()
