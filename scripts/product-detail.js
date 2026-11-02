/* Detalhes reais da vitrine. Consulta catálogos públicos; não autoriza pagamento nem cria pedidos. */
(() => {
  'use strict';
  const root = document.getElementById('shop-single-root');
  if (!root) return;
  const id = new URLSearchParams(window.location.search).get('id');
  const money = cents => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(cents / 100);
  const API = 'https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const info = {
    'camiseta-salve-regina': {
      type:'Camiseta · Coleção Salve Regina', material:'Malha de algodão penteado 30.1',
      finish:'DTF · estampa autoral', description:'Uma peça que reúne a devoção à Virgem Maria e a tradição do canto gregoriano. A coleção Salve Regina foi concebida com referências à iluminura medieval, combinando a figura de Nossa Senhora com a notação do canto sacro. A versão apresentada é preta, em tamanhos P, M, G, GG e XG.',
      note:'A imagem apresentada é um mockup ilustrativo. Os detalhes de produção e a fidelidade da impressão devem ser confirmados antes da compra.',
      photos:['/assets/img/loja/Salve-Regina/web/camiseta-1254.webp','/assets/img/loja/Salve-Regina/CAMISA-SalveRegina.png']
    },
    'caneca-salve-regina-preta': {
      type:'Caneca · Coleção Salve Regina', material:'Porcelana (conforme catálogo preliminar)',
      finish:'Personalização por sublimação', description:'Caneca preta da coleção Salve Regina, com proposta de estampa dedicada à partitura gregoriana da antífona mariana. Um objeto cotidiano pensado para quem deseja manter próxima a beleza da oração e da tradição católica.',
      note:'Imagem ilustrativa da coleção. Os detalhes dessa variante serão confirmados antes da produção.'
    },
    'caneca-salve-regina-pb': {
      type:'Caneca · Coleção Salve Regina', material:'Porcelana (conforme catálogo preliminar)',
      finish:'Personalização por sublimação', description:'Caneca da coleção Salve Regina na proposta em preto e branco, destacando a imagem de Nossa Senhora. A estética da peça remete à arte sacra clássica e à tradição mariana.',
      note:'Imagem ilustrativa da coleção, não uma prova da variante preto e branco. A arte final deverá ser validada antes da produção.'
    },
    'ecobag-salve-regina-m': {
      type:'Ecobag · Coleção Salve Regina', material:'Algodão cru', finish:'Personalização DTF · tamanho M',
      description:'Ecobag em algodão cru, tamanho M, com arte inspirada na antífona mariana Salve Regina. A composição visual reúne elementos da tradição católica e da arte sacra.',
      note:'Mockup ilustrativo. As medidas definitivas e a aplicação da estampa serão conferidas com o fornecedor.'
    },
    'ecobag-salve-regina-g': {
      type:'Ecobag · Coleção Salve Regina', material:'Algodão cru', finish:'Personalização DTF · tamanho G',
      description:'Ecobag em algodão cru, tamanho G, da coleção Salve Regina. Uma peça autoral inspirada na devoção mariana e na beleza dos manuscritos gregorianos.',
      note:'Mockup ilustrativo. As medidas definitivas e a aplicação da estampa serão conferidas com o fornecedor.'
    },
    'moletom-salve-regina': {
      type:'Moletom · Pré-lançamento', material:'A confirmar',finish:'Modelo, estampa e tamanhos ainda não aprovados',
      description:'Projeto de moletom inspirado na coleção Salve Regina, ainda em fase de preparação. A versão definitiva, os tamanhos, as imagens e o preço não estão disponíveis para venda.',
      note:'Esta imagem é provisória e não representa um item pronto para compra.'
    }
  };
  const el = (tag,cls,value) => {
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(value !== undefined) node.textContent=value;
    return node;
  };
  const link = (text,href,cls) => {
    const a=el('a',cls,text);a.href=href;return a;
  };
  const urlFor = product => '/pages/produto-loja.html?id='+encodeURIComponent(product.id);
  function showError(message) {
    root.replaceChildren(el('h1','',message),link('← Voltar ao catálogo','/pages/loja.html#catalogo','shop-single-back'));
  }
  function gallery(photos, title, note) {
    const figure=el('figure','shop-single-imagebox');
    const image=el('img');image.src=photos[0];image.alt='Imagem de '+title;image.width=850;image.height=850;
    const caption=el('figcaption','',note || 'Imagem ilustrativa da coleção');
    figure.append(image,caption);
    const thumbs=el('div','shop-single-thumbs');
    photos.forEach((photo,index)=>{
      const button=el('button','shop-single-thumb');button.type='button';
      button.setAttribute('aria-label','Ver imagem '+(index+1)+' do produto');
      button.setAttribute('aria-pressed',index===0?'true':'false');
      const img=el('img');img.src=photo;img.alt='';img.loading='lazy';button.append(img);
      button.addEventListener('click',()=>{
        image.src=photo;thumbs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));
        button.setAttribute('aria-pressed','true');
      });
      thumbs.append(button);
    });
    const gallery=el('div','shop-single-gallery');gallery.append(figure,thumbs);return gallery;
  }
  function specs(data) {
    const list=el('dl','shop-single-specs');
    Object.entries(data).forEach(([name,value])=>{
      const row=el('div');row.append(el('dt','',name),el('dd','',value));list.append(row);
    });return list;
  }
  function shipping(container,product,select) {
    const section=el('section','shop-single-shipping');
    section.append(el('h2','','Calcule o frete pelo CEP'),
      el('p','','Cotação estimada para 1 camiseta. A produção não está incluída no prazo do transporte.'));
    const form=el('form');
    const input=el('input');input.type='text';input.name='zipCode';input.required=true;
    input.inputMode='numeric';input.autocomplete='postal-code';input.maxLength=9;
    input.placeholder='00000-000';input.pattern='[0-9]{5}-?[0-9]{3}';
    input.setAttribute('aria-label','CEP para entrega');
    const button=el('button','','Consultar frete');button.type='submit';
    const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const results=el('div','shop-single-quote-results');
    form.append(input,button);section.append(form,status,results);container.append(section);
    let serial=0,controller=null;
    function reset(){serial++;controller?.abort();controller=null;button.disabled=false;status.textContent='';results.replaceChildren();}
    input.addEventListener('input',reset);select.addEventListener('change',reset);
    form.addEventListener('submit',async event=>{
      event.preventDefault();reset();
      const zipCode=input.value.replace(/\D/g,'');
      const variant=product.variants.find(v=>v.code===select.value);
      if(!/^\d{8}$/.test(zipCode)){status.textContent='Informe um CEP válido com 8 números.';return;}
      if(!variant?.sku){status.textContent='Esta variação ainda não possui cotação automática.';return;}
      const turn=serial;controller=new AbortController();button.disabled=true;
      status.textContent='Consultando as opções disponíveis...';
      try {
        const response=await fetch(API+'/api/shipping/preview',{
          method:'POST',mode:'cors',cache:'no-store',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({zipCode,sku:variant.sku}),
          signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])
        });
        const data=await response.json().catch(()=>({}));
        if(turn!==serial)return;
        if(!response.ok)throw Error(data?.error||'http_'+response.status);
        if(data?.sku!==variant.sku||data?.zipCode!==zipCode||!Array.isArray(data.options))throw Error('cotacao');
        const choices=data.options.filter(item=>item && item.isActive===true &&
          typeof item.name==='string' && item.name.length<=120 &&
          !/retirada|retire|pickup/i.test(item.name) &&
          Number.isFinite(item.shippingCost) && item.shippingCost>=0 && item.shippingCost<=10000 &&
          Number.isInteger(item.deliveryTime) && item.deliveryTime>=0 && item.deliveryTime<=365);
        if(!choices.length)throw Error('sem_frete');
        status.textContent='Opções estimadas para uma unidade:';
        choices.forEach(item=>{
          const quote=el('p','shop-single-quote-line',
            item.name+' · Frete: '+money(Math.round(item.shippingCost*100))+
            ' · Total estimado: '+money(variant.priceCents+Math.round(item.shippingCost*100))+
            ' · Transporte: '+item.deliveryTime+' dia(s) úteis');
          results.append(quote);
        });
        results.append(el('p','',
          'Valores sujeitos a reconferência. O prazo de fabricação não está incluído.'));
      } catch(err) {
        if(turn!==serial)return;
        const reason=({
          shipping_product_unverified:'Este tamanho ainda não tem dados de frete confirmados.',
          shipping_not_configured:'A configuração do frete está incompleta.',
          shipping_provider_unavailable:'A transportadora não retornou uma cotação.',
          shipping_package_unverified:'O pacote deste pedido ainda não foi validado.',
          http_403:'Acesso à API de frete bloqueado (HTTP 403).',
          origin_not_allowed:'O domínio da loja precisa ser autorizado na API.'
        })[String(err?.message||'')] || 'Não foi possível completar a consulta.';
        status.textContent='Frete indisponível neste momento. '+reason+
          ' Você pode consultar na sacola ou entrar em contato.';
      } finally {
        if(turn===serial){button.disabled=false;controller=null;}
      }
    });
  }
  function display(product,all) {
    const isBook=product.product_type==='book';
    const detail=info[product.id] || {};
    const photos=detail.photos || [product.image];
    const title=product.title;
    const breadcrumb=document.getElementById('shop-single-breadcrumb-name');
    if(breadcrumb)breadcrumb.textContent=title;
    document.title=title+' | Loja Douglas Assumpção';
    const layout=el('div','shop-single-layout');
    const summary=el('section','shop-single-summary');
    summary.append(el('p','shop-single-kicker',isBook?'Livros · Música sacra':detail.type||'Coleção Salve Regina'),
      el('h1','',title));
    const isPreparation=product.status==='preparation';
    const isShirt=product.id==='camiseta-salve-regina';
    const statusText=isBook?'Disponível nas lojas parceiras':isPreparation?'Em preparação · não disponível para compra':isShirt?'Compra online disponível · produção sob demanda':'Sob consulta · preço sujeito à confirmação';
    const productStatus=el('span','shop-single-status',statusText);
    summary.append(productStatus);
    let variant=null,select=null;
    const price=el('p','shop-single-price');
    const priceNote=el('p','shop-single-price-note',
      isBook?'Preço e frete informados pela loja parceira.':
      isPreparation?'Modelo e preço definitivo ainda não cadastrados.':
      'Valor sugerido. Frete e preço final conferidos antes de qualquer pagamento.');
    summary.append(price,priceNote);
    const description=isBook?product.description:detail.description||'Produto personalizado da coleção Salve Regina.';
    summary.append(el('p','shop-single-excerpt',description));
    if(isBook){
      price.textContent='Consulte o valor nas lojas parceiras';
      const shops=el('div','shop-single-partners');
      (product.retailers||[]).forEach(item=>{
        try {
          const url=new URL(item.url);
          if(url.protocol!=='https:')return;
          const a=link('Comprar na '+item.name+' ↗',url.href);
          a.target='_blank';a.rel='noopener noreferrer';shops.append(a);
        } catch {}
      });
      summary.append(shops);
    } else {
      const variants=Array.isArray(product.variants)?product.variants:[];
      variant=variants.find(v=>v.code==='G')||variants[0];
      function renderPrice(){
        variant=variants.find(v=>v.code===select.value)||variants[0];
        price.textContent=Number.isInteger(variant?.priceCents)?money(variant.priceCents):'Preço a definir';
        if(detail.type?.includes('Camiseta') && variant?.code==='XG')
          priceNote.textContent='Tamanho XG · preço R$ 119,90 mais frete calculado pelo CEP.';
        else priceNote.textContent=isPreparation?'Modelo e preço definitivo ainda não cadastrados.':
          isShirt?'Preço de venda definido. Calcule o frete pelo CEP antes de pagar.':
          'Valor sugerido. Frete e preço final conferidos antes de qualquer pagamento.';
      }
      const form=el('form','shop-single-form');
      const selectLabel=el('label','',variants.length>1?'Escolha o tamanho':'Modelo / variação');
      select=el('select');select.required=true;select.setAttribute('aria-label','Escolha a variação');
      variants.forEach(v=>{
        const opt=el('option','',v.label+(Number.isInteger(v.priceCents)?' — '+money(v.priceCents):''));
        opt.value=v.code;select.append(opt);
      });
      select.value=variant?.code||'';selectLabel.append(select);
      const quantityLabel=el('label','','Quantidade');
      const quantity=el('input');quantity.type='number';quantity.min='1';quantity.max='10';
      quantity.step='1';quantity.value='1';quantity.required=true;
      quantityLabel.append(quantity);
      const actions=el('div','shop-single-actions');
      const add=el('button','','Adicionar ao carrinho');add.type='submit';
      const proceed=el('button','','Ver entrega e compra');proceed.type='button';
      const feedback=el('p','shop-single-feedback');
      feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
      actions.append(add,proceed);
      if(isShirt){
        const direct=link('Comprar agora · Calcular frete e pagar',
          '/pages/checkout-salve-regina.html?size='+encodeURIComponent(select.value),'shop-single-buy');
        direct.addEventListener('click',event=>{
          if(Number(quantity.value)!==1){
            event.preventDefault();
            feedback.textContent='Para compra direta, selecione 1 camiseta por pedido.';
          }
        });
        select.addEventListener('change',()=>{
          direct.href='/pages/checkout-salve-regina.html?size='+encodeURIComponent(select.value);
        });
        actions.append(direct);
        proceed.textContent='Adicionar e ver carrinho';
      }else if(!isPreparation){
        proceed.textContent='Consultar disponibilidade no carrinho';
        const direct=link('Comprar agora · Calcular frete e pagar','#','shop-single-buy');
        direct.hidden=true;
        direct.addEventListener('click',event=>{
          if(Number(quantity.value)!==1){
            event.preventDefault();
            feedback.textContent='A compra direta permite uma peça por pedido.';
          }
        });
        actions.append(direct);
        const approvedSkus=new Set();
        const sync=()=>{
          const selected=variants.find(v=>v.code===select.value);
          const approved=Boolean(selected?.sku && approvedSkus.has(selected.sku));
          direct.hidden=!approved;
          if(approved){
            direct.href='/pages/checkout-salve-regina.html?sku='+encodeURIComponent(selected.sku);
            productStatus.textContent='Compra online disponível · produção sob demanda';
            priceNote.textContent='Preço de venda aprovado. Frete calculado pelo CEP no checkout.';
            proceed.textContent='Adicionar e ver carrinho';
          }
        };
        select.addEventListener('change',sync);
        fetch(API+'/api/checkout/live/readiness',{
          mode:'cors',cache:'no-store',signal:AbortSignal.timeout(8000)
        }).then(r=>r.ok?r.json():null).then(data=>{
          if(data?.checkoutEnabled!==true || !Array.isArray(data.availableSkus))return;
          data.availableSkus.forEach(s=>{if(typeof s==='string')approvedSkus.add(s)});
          sync();
        }).catch(()=>{/* Sem confirmação do servidor não mostrar compra. */});
      }
      form.append(selectLabel,quantityLabel,actions,feedback);
      summary.append(form);
      const state=()=>{
        add.disabled=isPreparation||!window.Cart;
        proceed.disabled=isPreparation||!window.Cart;
        if(isPreparation)feedback.textContent='Este modelo ainda não está disponível para compra.';
      };
      state();document.addEventListener('douglas-cart-ready',state);
      select.addEventListener('change',()=>{renderPrice();feedback.textContent='';});
      renderPrice();
      const putInCart=goCart=>{
        const amount=Number(quantity.value);
        if(!Number.isInteger(amount)||amount<1||amount>10){
          feedback.textContent='Escolha uma quantidade entre 1 e 10.';return;
        }
        if(!window.Cart){feedback.textContent='O carrinho está carregando. Tente novamente.';return;}
        const ok=window.Cart.add(product.id,select.value,amount);
        if(ok){
          if(goCart)window.location.assign('/pages/cart.html');
          else feedback.textContent='Produto adicionado. Você pode continuar comprando ou abrir o carrinho.';
        }else feedback.textContent='Não foi possível adicionar. Verifique a quantidade ou a variação.';
      };
      form.addEventListener('submit',event=>{event.preventDefault();putInCart(false);});
      proceed.addEventListener('click',()=>putInCart(true));
      summary.append(link('Ver meu carrinho →','/pages/cart.html','shop-single-back'));
      if(product.id==='camiseta-salve-regina')shipping(summary,product,select);
    }
    const trust=el('div','shop-single-trust');
    trust.append(el('p','',isBook?
      'O pedido, o pagamento e a entrega do livro são responsabilidade da loja parceira escolhida.':
      'Adicionar à sacola não confirma pedido, reserva de produção nem pagamento. A autorização de cobrança depende da disponibilidade do checkout e da confirmação no servidor.'));
    trust.append(link('Condições de entrega e trocas','/pages/condicoes-da-loja.html'));
    summary.append(trust);
    layout.append(gallery(photos,title,detail.note || (isBook?'Arte de divulgação do livro':'Imagem ilustrativa da coleção')),summary);
    root.replaceChildren(layout);
    const details=el('section','shop-single-details');
    const desc=el('div');desc.append(el('h2','','Descrição do produto'),
      el('p','',description));
    if(detail.note)desc.append(el('p','shop-single-muted',detail.note));
    const infoBox=el('div');infoBox.append(el('h2','','Informações'));
    infoBox.append(specs(isBook?{
      'Categoria':product.category,'Formato':product.format,'Autor':product.author,'Venda':'Parceiros externos'
    }:{
      'Coleção':'Salve Regina','Categoria':detail.type||product.category,
      'Material':detail.material||'A confirmar','Acabamento':detail.finish||'A confirmar',
      'Situação':isPreparation?'Em preparação':isShirt?'Compra online disponível':'Sob consulta'
    }));
    details.append(desc,infoBox);root.append(details);
    const related=all.filter(p=>p.id!==product.id && (p.product_type==='book'||Array.isArray(p.variants))).slice(0,3);
    if(related.length){
      const section=el('section','shop-single-related');
      section.append(el('h2','','Conheça outros produtos'));
      const grid=el('div','shop-single-related-grid');
      related.forEach(p=>{
        const a=link('',urlFor(p));
        const img=el('img');img.src=p.image;img.alt='';img.loading='lazy';
        a.append(img,el('span','',p.title));grid.append(a);
      });
      section.append(grid);root.append(section);
    }
  }
  async function init() {
    if(!id||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)){showError('Escolha um produto do catálogo.');return;}
    const [shop,books]=await Promise.allSettled([
      fetch('/content/shop-cart-catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('shop');return r.json();}),
      fetch('/content/store-products.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('books');return r.json();})
    ]);
    const merch=shop.status==='fulfilled' && Array.isArray(shop.value.products)?shop.value.products:[];
    const literature=books.status==='fulfilled' && Array.isArray(books.value.products)?
      books.value.products.filter(p=>p.status==='published'):[];
    const all=[...merch,...literature];
    const product=all.find(p=>p.id===id);
    if(!product){showError('Produto não encontrado ou temporariamente indisponível.');return;}
    display(product,all);
  }
  init().catch(()=>showError('Não foi possível carregar os detalhes. Volte à loja e tente novamente.'));
})();
