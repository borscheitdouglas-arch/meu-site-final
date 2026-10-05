"""Verifica layouts, arquivos e menu das páginas editoriais e dos novos cantos."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import tempfile, threading
from playwright.sync_api import sync_playwright,expect
import json
R=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def handle(self):
  try:super().handle()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/'
OUT=Path(tempfile.mkdtemp(prefix='editorial-review-'))
paths=[p for p in [*R.glob('*.html'),*(R/'pages').glob('*.html')] if 'site-editorial' in p.read_text() or ('liturgical-song' in p.read_text() and not p.name.endswith(('-entrada.html','-comunhao.html')))]
issues=[];current='';reps={'index.html','pater-noster.html','contato.html','formacoes.html','tempo-comum-2.html','advento-1.html','pater-noster-notacao-quadrada-cifrada.html','veni-veni-emmanuel.html','doacao.html','materia-nova.html','tempo-comum-29.html','loja.html','politica-de-privacidade.html'}
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chromium');c=b.new_context();c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) or r.request.url.startswith('data:') else r.abort())
 p=c.new_page();p.on('pageerror',lambda e:issues.append([current,'JS',str(e)]));p.on('response',lambda r:issues.append([current,r.status,r.url]) if r.url.startswith(BASE) and r.status>=400 else None)
 for i,f in enumerate(paths):
  current=str(f.relative_to(R));p.set_viewport_size({'width':1440,'height':1000});p.goto(BASE+current,wait_until='load');p.wait_for_timeout(100)
  for w in [1440,390,320]:
   p.set_viewport_size({'width':w,'height':1000});p.wait_for_timeout(60)
   dims=p.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
   if dims['scroll']>w+1:
    els=p.evaluate("[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&e.getBoundingClientRect().width>0&&!e.closest('#side-nav')).slice(0,8).map(e=>e.tagName+'.'+e.className)")
    issues.append([current,'overflow',w,dims,els])
   if f.name in reps and w in [1440,390]:p.screenshot(path=str(OUT/f'{f.stem}-{w}.png'))
  try:
   p.locator('#menu-btn').click();expect(p.locator('#close-nav')).to_be_focused(timeout=1200);p.keyboard.press('Escape');expect(p.locator('#menu-btn')).to_be_focused(timeout=1200)
  except Exception as e:issues.append([current,'menu',str(e)[:130]])
  if i%15==0:print('Checked',i+1,'/',len(paths),flush=True)
 b.close()
(OUT/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2));print('TOTAL',len(paths),'ISSUES',json.dumps(issues,ensure_ascii=False))

server.shutdown()
print("Capturas:", OUT)
assert not issues, issues
