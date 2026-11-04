"""Auditoria visual/mobile sem pagamentos nem chamadas externas, Chromium + WebKit.

Ambiente: Playwright 1.60; abre arquivos do próprio repositório num servidor local.
AUDIT_STRICT=1 transforma problemas de viewport em falhas de CI.
"""
from __future__ import annotations
import json,os,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PATHS=[
    '/index.html',
    '/pages/loja.html',
    '/pages/produto-loja.html?id=camiseta-salve-regina',
    '/pages/cart.html',
    '/pages/checkout-carrinho.html',
    '/pages/colecao-salve-regina.html',
    '/pages/produtos-personalizados.html',
]
VIEWPORTS=[(320,720),(375,812),(390,844),(430,932),(667,375),(768,1024)]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def inspect(page):
    return page.evaluate(r"""() => {
      const vw=document.documentElement.clientWidth,sw=document.documentElement.scrollWidth;
      const offenders=[];
      for(const el of document.body.querySelectorAll('*')){
        const st=getComputedStyle(el);
        if(st.display==='none'||st.visibility==='hidden'||st.position==='fixed'&&
           /side-nav|shop-shell-menu/.test(el.id)||el.closest('dialog:not([open])'))continue;
        const r=el.getBoundingClientRect();
        if(!r.width||!r.height||r.width<5)continue;
        if((r.right>vw+4||r.left<-4)&&r.top<5500&&r.bottom>0){
          if(el.closest('.shop-category-grid,.lit-carousel-track,[role=tablist],.carousel-track'))continue;
          offenders.push({
            tag:el.tagName.toLowerCase(),id:el.id,cls:String(el.className||'').slice(0,85),
            left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)
          });
        }
      }
      const header=document.querySelector('.shop-shared-header');
      const boxes={};
      if(header)for(const [k,sel] of Object.entries({
        menu:'#menu-btn',brand:'.logo',cart:'.shop-cart-link',search:'.shop-search'
      })){
        const el=header.querySelector(sel);
        if(el){const r=el.getBoundingClientRect(); boxes[k]=
          {left:Math.round(r.left),right:Math.round(r.right),
          top:Math.round(r.top),bottom:Math.round(r.bottom)};}
      }
      const hero=document.querySelector('body.shop-manto .shop-hero');
      const grid=document.querySelector('body.shop-manto #shop-product-grid');
      const heroHeight=hero?Math.round(hero.getBoundingClientRect().height):null;
      const gridColumns=grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:null;
      const form=document.querySelector('#checkout-multi-form');
      let controls=[];
      if(form)controls=Array.from(form.querySelectorAll('input:not([type=hidden]),select,button'))
        .slice(0,14).map(el=>{const r=el.getBoundingClientRect();
          return {name:el.name||el.id,w:Math.round(r.width),h:Math.round(r.height)}});
      return {viewport:vw,scrollWidth:sw,overflow:sw-vw,offenders:offenders.slice(0,12),header:boxes,controls,heroHeight,gridColumns};
    }""")

def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    failures=[]
    with sync_playwright() as playwright:
        for browser_name in ['chromium','webkit']:
            browser=getattr(playwright,browser_name).launch(headless=True)
            for width,height in VIEWPORTS:
                context=browser.new_context(
                    viewport={'width':width,'height':height},
                    has_touch=width<768,is_mobile=width<768,device_scale_factor=2,
                    reduced_motion='reduce')
                context.add_init_script("localStorage.setItem('douglasShopCart_v2', JSON.stringify([{id:'camiseta-salve-regina',variant:'G',qty:2}]));")
                context.route('**/*', lambda route:route.continue_()
                    if route.request.url.startswith(base) or route.request.url.startswith('data:')
                    else route.abort())
                context.route('**/api/checkout/live/readiness', lambda r:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body=json.dumps({'checkoutEnabled':True,'multiCheckoutEnabled':True,'availableSkus':['salve-regina-preta-g']})))
                page=context.new_page()
                for path in PATHS:
                    try:
                        page.goto(base+path,wait_until='domcontentloaded',timeout=20000)
                        page.wait_for_timeout(100)
                        m=inspect(page)
                        print('MOBILE_AUDIT',json.dumps({
                            'browser':browser_name,'path':path,'w':width,
                            'h':height,**m
                        },ensure_ascii=False),flush=True)
                        if m['overflow']>3:
                            failures.append((browser_name,path,width,'document overflow',m['overflow']))
                        if path=='/pages/loja.html' and width<=430:
                            expected_columns=1 if width<360 else 2
                            if m['gridColumns']!=expected_columns:
                                failures.append((browser_name,path,width,'product columns',m['gridColumns']))
                            if m['heroHeight'] is None or m['heroHeight']>540:
                                failures.append((browser_name,path,width,'oversized hero',m['heroHeight']))
                        if path=='/pages/checkout-carrinho.html' and width<=430:
                            actual=[c for c in m['controls'] if c['w']>0 and c['name'] in ('zipCode','street','number')]
                            if len(actual)!=3 or any(c['w']<110 or c['h']<44 for c in actual):
                                failures.append((browser_name,path,width,'checkout inputs clipped',actual))
                        header=m['header']
                        if width<=430 and header and all(k in header for k in ['menu','brand','cart']):
                            if header['menu']['right']>header['brand']['left']+4 or \
                               header['brand']['right']>header['cart']['left']+4:
                                failures.append((browser_name,path,width,'header overlaps',header))
                    except Exception as error:
                        print('MOBILE_AUDIT_ERROR',browser_name,width,path,str(error),flush=True)
                        failures.append((browser_name,path,width,'page_error',str(error)))
                context.close()
            browser.close()
    server.shutdown()
    print('MOBILE_AUDIT_SUMMARY',json.dumps({'problems':failures},ensure_ascii=False),flush=True)
    if os.environ.get('AUDIT_STRICT')=='1' and failures:
        raise AssertionError(f'Mobile viewport issues: {len(failures)}')

if __name__=='__main__': main()
