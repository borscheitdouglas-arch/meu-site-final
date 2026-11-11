/* Detalhes reais da vitrine. Consulta catálogos públicos; não autoriza pagamento nem cria pedidos. */
(() => {
  'use strict';
  const root = document.getElementById('shop-single-root');
  if (!root) return;
  const params=new URLSearchParams(window.location.search);
  const id=params.get('id');
  const legacySize=id==='ecobag-salve-regina-m'?'M':id==='ecobag-salve-regina-g'?'G':null;
  const requestedId=legacySize?'ecobag-salve-regina':id;
  const preferredSize=legacySize||params.get('size');
  const money = cents => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(cents / 100);
  const API = 'https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const info = {
  "camiseta-cor-iesu-sacratissimum": {
    "type": "Camiseta · Coleção Cor Iesu Sacratissimum",
    "material": "100% algodão fio 30.1 penteado",
    "finish": "Estampas fixas em DTF: medalhão na frente e gravura gótica nas costas",
    "description": "Uma peça de inspiração sacra que une a devoção ao Sacratíssimo Coração de Jesus à estética das gravuras tradicionais. O medalhão frontal apresenta o Coração inflamado de amor, coroado de espinhos e acompanhado por lírios. Nas costas, a composição gótica ampliada reúne cruz, chamas, rosas, ornamentos e a inscrição latina Cor Iesu Sacratissimum.",
    "paragraphs": [
      "O Sagrado Coração de Jesus expressa o amor de Cristo pela humanidade. Nesta criação, a cruz, as chamas e a coroa de espinhos aparecem em duas composições complementares: um medalhão refinado na frente e uma gravura gótica ampla nas costas.",
      "Confeccionada em 100% algodão fio 30.1 penteado, a camiseta possui modelagem unissex, toque macio e tecido respirável para o cotidiano. A peça é apresentada na cor Marrom das fotografias, com artes em vermelho profundo, bronze envelhecido e marfim.",
      "Este anúncio apresenta estampas fixas na frente e nas costas, previstas para aplicação DTF. Não inclui personalização de textos, troca de arte ou escolha livre de cores. Produção sob demanda; preço, disponibilidade dos tamanhos e frete serão confirmados antes da abertura das vendas."
    ],
    "features": [
      "Composição: 100% algodão fio 30.1 penteado.",
      "Modelagem unissex; camiseta de manga curta e gola redonda.",
      "Cor desta edição: marrom-acinzentado (conforme fotografias ilustrativas).",
      "Frente: medalhão do Sagrado Coração de Jesus com lírios e raios.",
      "Costas: estampa grande com moldura gótica, rosas, cruz e inscrição latina.",
      "Impressão prevista: DTF, frente e costas, com artes fixas.",
      "Grade do modelo-base: PP, P, M, G, GG e XG; disponibilidade de cada tamanho a confirmar.",
      "Venda por peça; produção sob demanda após confirmação do pedido."
    ],
    "reasons": [
      "Expressa a devoção ao Sacratíssimo Coração de Jesus com arte autoral.",
      "Combina gravura sacra vintage e apresentação contemporânea.",
      "Algodão penteado macio e respirável, com modelagem unissex.",
      "Duas estampas complementares: frente discreta e costas ornamentadas."
    ],
    "faq": [
      [
        "Qual o tecido?",
        "100% algodão fio 30.1 penteado, com modelagem unissex."
      ],
      [
        "Qual estampa fica na frente e qual fica nas costas?",
        "Na frente está o medalhão circular do Sagrado Coração com lírios. Nas costas está a estampa maior emoldurada por ornamentos góticos, com rosas e a inscrição COR IESU SACRATISSIMUM."
      ],
      [
        "Posso personalizar as estampas ou escolher outro método?",
        "Não neste anúncio. A proposta é uma edição com artes fixas em DTF nas duas faces."
      ],
      [
        "Quais cores e tamanhos estão disponíveis?",
        "O anúncio apresenta a cor Marrom das imagens. Esta edição oferece os tamanhos P, M, G e GG, com disponibilidade a confirmar na VAVI."
      ],
      [
        "Já posso comprar?",
        "O preço definido é R$ 109,90, mais frete. A compra segue em preparação até validação das variações e do checkout."
      ],
      [
        "O que significa Cor Iesu Sacratissimum?",
        "Em latim, Sacratíssimo Coração de Jesus."
      ],
      [
        "Qual é o pedido mínimo?",
        "A VAVI informa venda do produto-base a partir de uma peça; a produção desta edição depende de confirmação comercial."
      ]
    ],
    "photos": [
      "/assets/img/loja/cor-iesu/costas-modelo-1500.webp",
      "/assets/img/loja/cor-iesu/frente-modelo-1500.webp",
      "/assets/img/loja/cor-iesu/costas-fundo-vinho-1500.webp",
      "/assets/img/loja/cor-iesu/frente-fundo-vinho-1500.webp",
      "/assets/img/loja/cor-iesu/conjunto-neutro-1500.webp",
      "/assets/img/loja/cor-iesu/conjunto-vinho-1500.webp"
    ],
    "photoLabels": [
      "Camiseta unissex Cor Iesu Sacratissimum, costas com estampa gótica grande em modelo sem tatuagens",
      "Camiseta unissex Cor Iesu Sacratissimum, frente com medalhão do Sagrado Coração",
      "Camiseta vista de costas, estampa gótica grande e fundo vinho texturizado",
      "Camiseta vista de frente, medalhão do Sagrado Coração e fundo vinho texturizado",
      "Apresentação da camiseta frente e costas em cenário de estúdio neutro",
      "Apresentação editorial da camiseta frente e costas com cenário em vinho"
    ],
    "note": "Imagens ilustrativas (mockups digitais). A cor do tecido e o resultado da impressão podem variar. Produto em preparação: nenhum pagamento é realizado nesta página."
  },
  "camiseta-salve-regina": {
    "type": "Camiseta · Coleção Salve Regina",
    "material": "100% algodão fio 30.1 penteado",
    "finish": "Impressão DTF na frente e nas costas",
    "description": "A beleza da arte sacra e a tradição do canto gregoriano em uma peça para o dia a dia. Confeccionada em 100% algodão fio 30.1 penteado, a Camiseta Salve Regina une toque macio, conforto e devoção mariana, com partitura gregoriana na frente e Nossa Senhora nas costas.",
    "paragraphs": [
      "Inspirada na antífona mariana Salve Regina, esta camiseta aproxima a beleza do canto gregoriano e da arte sacra do cotidiano. A composição reúne a partitura na frente e a imagem de Nossa Senhora nas costas, com referências à iluminura medieval e à tradição católica.",
      "Confeccionada em 100% algodão fio 30.1 penteado, oferece toque macio e respirabilidade para o uso diário. A modelagem unissex, a gola canelada reforçada e as costuras reforçadas completam a peça com conforto e cuidado no acabamento.",
      "As estampas são aplicadas por impressão DTF na frente e nas costas. Disponível na cor preta, nos tamanhos P, M, G, GG e XG, a camiseta é produzida sob demanda e vendida a partir de uma unidade."
    ],
    "features": [
      "Composição: 100% algodão fio 30.1 penteado.",
      "Modelagem unissex, com gola canelada reforçada.",
      "Toque macio, tecido respirável e costuras reforçadas.",
      "Cor disponível neste anúncio: preta.",
      "Tamanhos: P, M, G, GG e XG.",
      "Estampas Salve Regina em DTF: partitura gregoriana na frente e Nossa Senhora nas costas.",
      "Produção sob demanda; venda por peça, a partir de 1 unidade."
    ],
    "reasons": [
      "Conforto do algodão penteado para acompanhar o dia a dia.",
      "Arte que une a devoção à Virgem Maria à tradição do canto gregoriano.",
      "Acabamento com gola e costuras reforçadas.",
      "Uma opção de presente para quem aprecia a fé católica, a música sacra e a arte mariana."
    ],
    "faq": [
      [
        "Qual é o tecido da camiseta?",
        "A peça é confeccionada em 100% algodão fio 30.1 penteado, com toque macio e respirabilidade."
      ],
      [
        "A modelagem é unissex?",
        "Sim. A camiseta tem modelagem unissex e gola canelada reforçada."
      ],
      [
        "Quais são as cores e os tamanhos disponíveis?",
        "Neste anúncio, a camiseta está disponível na cor preta, nos tamanhos P, M, G, GG e XG. Escolha o tamanho desejado antes de adicionar ao carrinho."
      ],
      [
        "Como são as estampas?",
        "A camiseta recebe impressão DTF nas duas faces: partitura gregoriana da Salve Regina na frente e a imagem de Nossa Senhora nas costas."
      ],
      [
        "Posso alterar a arte ou escolher outra técnica de impressão?",
        "Este anúncio corresponde à camiseta com as estampas Salve Regina apresentadas nas imagens, em DTF. A compra não inclui edição da arte nem seleção de outra técnica de impressão."
      ],
      [
        "Qual é o pedido mínimo?",
        "Você pode comprar a partir de 1 peça. A produção é realizada sob demanda."
      ],
      [
        "Como consulto o frete?",
        "Selecione o tamanho e a quantidade e informe seu CEP na calculadora desta página. O prazo de produção não está incluído no prazo de transporte informado."
      ]
    ],
    "photos": [
      "/assets/img/loja/Salve-Regina/web/camiseta-salve-regina-vitrine-casal.png",
      "/assets/img/loja/Salve-Regina/web/camiseta-salve-regina-vitrine-masculina.png",
      "/assets/img/loja/Salve-Regina/web/camiseta-salve-regina-frente-partitura-1.png",
      "/assets/img/loja/Salve-Regina/web/camiseta-salve-regina-frente-partitura-2.png",
      "/assets/img/loja/Salve-Regina/web/camiseta-salve-regina-costas-azul-mariano.png",
      "/assets/img/loja/Salve-Regina/web/camiseta-salve-regina-costas-manto-mariano.png"
    ],
    "photoLabels": [
      "Camiseta Salve Regina em ensaio editorial, frente e costas",
      "Camiseta Salve Regina em modelo, frente com partitura e costas com arte mariana",
      "Camiseta Salve Regina, estampa frontal de partitura gregoriana, primeira apresentação",
      "Camiseta Salve Regina, estampa frontal de partitura gregoriana, segunda apresentação",
      "Camiseta Salve Regina, costas com Nossa Senhora, fundo azul mariano",
      "Camiseta Salve Regina, costas com Nossa Senhora, fundo de manto mariano"
    ]
  },
  "caneca-salve-regina-preta": {
    "type": "Caneca · Coleção Salve Regina",
    "material": "Porcelana",
    "finish": "Estampa por sublimação",
    "description": "A beleza do canto gregoriano à mesa. Caneca de porcelana com a partitura da Salve Regina, para acompanhar suas pausas em casa ou no trabalho.",
    "photos": [
      "/assets/img/loja/Salve-Regina/web/caneca-partitura-individual.png"
    ],
    "paragraphs": [
      "A beleza do canto gregoriano à mesa. Caneca de porcelana com a partitura da Salve Regina, para acompanhar suas pausas em casa ou no trabalho.",
      "A estampa da coleção Salve Regina é aplicada por sublimação. A peça já é vendida com a arte apresentada nas imagens, pronta para integrar sua rotina ou presentear alguém que aprecia a tradição católica.",
      "Produzida sob demanda e vendida por unidade, com frete consultado pelo CEP antes da compra."
    ],
    "features": [
      "Confeccionada em porcelana.",
      "Modelo preto com partitura gregoriana.",
      "Estampa da coleção Salve Regina por sublimação.",
      "Venda a partir de uma unidade."
    ],
    "reasons": [
      "Uma peça de uso cotidiano com identidade sacra.",
      "Uma opção de presente para quem aprecia a devoção mariana."
    ],
    "faq": [
      [
        "A caneca já vem estampada?",
        "Sim. Você recebe o modelo com a arte Salve Regina apresentada nas imagens."
      ],
      [
        "Qual é o material e a técnica de impressão?",
        "A caneca é feita de porcelana e recebe estampa por sublimação."
      ],
      [
        "Como escolho a estampa?",
        "Escolha entre os anúncios Partitura Gregoriana e Nossa Senhora, conforme a apresentação de cada produto."
      ],
      [
        "Posso comprar apenas uma?",
        "Sim. A venda é por unidade."
      ],
      [
        "Como consulto a entrega?",
        "Informe seu CEP na página do produto para consultar o frete."
      ]
    ]
  },
  "caneca-salve-regina-pb": {
    "type": "Caneca · Coleção Salve Regina",
    "material": "Porcelana",
    "finish": "Estampa por sublimação",
    "description": "Um toque de devoção mariana no cotidiano. Caneca de porcelana com a imagem de Nossa Senhora, inspirada na beleza da arte sacra.",
    "photos": [
      "/assets/img/loja/Salve-Regina/web/caneca-nossa-senhora-individual.png"
    ],
    "paragraphs": [
      "Um toque de devoção mariana no cotidiano. Caneca de porcelana com a imagem de Nossa Senhora, inspirada na beleza da arte sacra.",
      "A estampa da coleção Salve Regina é aplicada por sublimação. A peça já é vendida com a arte apresentada nas imagens, pronta para integrar sua rotina ou presentear alguém que aprecia a tradição católica.",
      "Produzida sob demanda e vendida por unidade, com frete consultado pelo CEP antes da compra."
    ],
    "features": [
      "Confeccionada em porcelana.",
      "Modelo com arte de Nossa Senhora em composição preto e branco.",
      "Estampa da coleção Salve Regina por sublimação.",
      "Venda a partir de uma unidade."
    ],
    "reasons": [
      "Uma peça de uso cotidiano com identidade sacra.",
      "Uma opção de presente para quem aprecia a devoção mariana."
    ],
    "faq": [
      [
        "A caneca já vem estampada?",
        "Sim. Você recebe o modelo com a arte Salve Regina apresentada nas imagens."
      ],
      [
        "Qual é o material e a técnica de impressão?",
        "A caneca é feita de porcelana e recebe estampa por sublimação."
      ],
      [
        "Como escolho a estampa?",
        "Escolha entre os anúncios Partitura Gregoriana e Nossa Senhora, conforme a apresentação de cada produto."
      ],
      [
        "Posso comprar apenas uma?",
        "Sim. A venda é por unidade."
      ],
      [
        "Como consulto a entrega?",
        "Informe seu CEP na página do produto para consultar o frete."
      ]
    ]
  },
  "ecobag-salve-regina": {
    "type": "Ecobag · Coleção Salve Regina",
    "material": "100% algodão",
    "finish": "Estampa DTF",
    "description": "A arte mariana da coleção Salve Regina em uma bolsa reutilizável de algodão, para acompanhar compras, estudos e trabalho.",
    "paragraphs": [
      "A arte mariana da coleção Salve Regina em uma bolsa reutilizável de algodão, para acompanhar compras, estudos e trabalho.",
      "Confeccionada em 100% algodão, a ecobag reúne a praticidade de uma bolsa para o dia a dia e a beleza da tradição católica. A estampa é aplicada por impressão DTF, conforme a arte apresentada nas imagens.",
      "Disponível para compra nos tamanhos M e G. Escolha o tamanho na página e consulte o frete pelo CEP. A venda é por unidade, com produção sob demanda."
    ],
    "features": [
      "Composição de 100% algodão.",
      "Bolsa reutilizável para diferentes atividades do cotidiano.",
      "Estampa Salve Regina em DTF.",
      "Tamanhos disponíveis para compra: M e G.",
      "Pedido a partir de uma unidade."
    ],
    "reasons": [
      "Praticidade para compras, trabalho e estudos.",
      "Tecido de fibra natural de algodão.",
      "Arte mariana para levar consigo ou presentear."
    ],
    "faq": [
      [
        "Quais tamanhos posso comprar?",
        "Os tamanhos M e G estão disponíveis para compra. P e GG aparecem como indisponíveis."
      ],
      [
        "A ecobag já vem estampada?",
        "Sim. A compra inclui a arte Salve Regina apresentada no anúncio, aplicada por DTF."
      ],
      [
        "Qual é o tecido?",
        "A ecobag é confeccionada em 100% algodão."
      ],
      [
        "Qual é o pedido mínimo?",
        "Você pode comprar a partir de uma peça."
      ]
    ]
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
  function gallery(photos, title, note, photoLabels, fitToFrame=false) {
    const figure=el('figure','shop-single-imagebox');
    const image=el('img');image.src=photos[0];image.alt=photoLabels?.[0] || ('Imagem de '+title);image.width=850;image.height=850;
    const imageClip=el('div','shop-single-image-clip');
    imageClip.append(image);
    figure.append(imageClip);
    // A camiseta exibe a fotografia inteira em uma moldura proporcional à foto,
    // inclusive quando o cliente alterna entre imagens verticais e horizontais.
    if(fitToFrame){
      const updateFrame=()=>{
        const w=image.naturalWidth, h=image.naturalHeight;
        if(!w||!h)return;
        const ratio=w/h;
        const widthDesktop=Math.min(426,Math.round(390*ratio));
        const widthMobile=Math.min(322,Math.round(300*ratio));
        figure.style.setProperty('--shirt-frame-width', (widthDesktop+18)+'px');
        figure.style.setProperty('--shirt-frame-mobile-width', (widthMobile+14)+'px');
        figure.style.setProperty('--shirt-frame-ratio', w+' / '+h);
      };
      image.addEventListener('load',updateFrame);
      if(image.complete)updateFrame();
    }
    if(note) figure.append(el('figcaption','',note));
    const thumbs=el('div','shop-single-thumbs');
    let currentIndex=0, viewer=null, enlargedImage=null, counter=null;
    const showPhoto=index=>{
      currentIndex=(index+photos.length)%photos.length;
      image.src=photos[currentIndex];
      image.alt=photoLabels?.[currentIndex] || ('Imagem '+(currentIndex+1)+' de '+title);
      thumbs.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===currentIndex)));
      if(enlargedImage){enlargedImage.src=image.src;enlargedImage.alt=image.alt;}
      if(counter)counter.textContent=(currentIndex+1)+' / '+photos.length;
    };
    photos.forEach((photo,index)=>{
      const button=el('button','shop-single-thumb');button.type='button';
      button.setAttribute('aria-label',photoLabels?.[index] || ('Ver imagem '+(index+1)+' do produto'));
      button.setAttribute('aria-pressed',index===0?'true':'false');
      const img=el('img');img.src=photo;img.alt='';img.loading='lazy';button.append(img);
      button.addEventListener('click',()=>{
        showPhoto(index);
      });
      thumbs.append(button);
    });
    const gallery=el('div','shop-single-gallery');gallery.append(figure,thumbs);
    if(fitToFrame){
      const control=(label,symbol,cls,action)=>{
        const button=el('button','shop-gallery-control '+cls,symbol);
        button.type='button';button.setAttribute('aria-label',label);button.title=label;
        button.addEventListener('click',action);return button;
      };
      viewer=el('dialog','shop-gallery-viewer');viewer.setAttribute('aria-label','Fotos ampliadas de '+title);
      const stage=el('div','shop-gallery-viewer-stage');
      enlargedImage=el('img');stage.append(enlargedImage);
      counter=el('p','shop-gallery-counter');counter.setAttribute('aria-live','polite');
      const close=control('Fechar imagem ampliada','×','shop-gallery-close',()=>viewer.close());
      close.autofocus=true;
      viewer.append(stage,close,counter);
      const zoom=control('Ampliar imagem','⤢','shop-gallery-zoom',()=>{
        showPhoto(currentIndex);viewer.showModal();
      });
      zoom.setAttribute('aria-haspopup','dialog');
      imageClip.append(zoom);
      imageClip.style.position='relative';
      if(photos.length>1){
        imageClip.append(
          control('Imagem anterior','‹','shop-gallery-prev',()=>showPhoto(currentIndex-1)),
          control('Próxima imagem','›','shop-gallery-next',()=>showPhoto(currentIndex+1))
        );
        viewer.append(
          control('Imagem anterior ampliada','‹','shop-gallery-prev',()=>showPhoto(currentIndex-1)),
          control('Próxima imagem ampliada','›','shop-gallery-next',()=>showPhoto(currentIndex+1))
        );
      }
      viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
      let previousOverflow='';
      zoom.addEventListener('click',()=>{
        previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      });
      viewer.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;zoom.focus();});
      gallery.addEventListener('keydown',event=>{
        if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
          event.preventDefault();showPhoto(currentIndex+(event.key==='ArrowRight'?1:-1));
        }
      });
      gallery.append(viewer);
    }
    return gallery;
  }
  function specs(data) {
    const list=el('dl','shop-single-specs');
    Object.entries(data).forEach(([name,value])=>{
      const row=el('div');row.append(el('dt','',name),el('dd','',value));list.append(row);
    });return list;
  }
  function shipping(container,product,select,quantity) {
    const section=el('section','shop-single-shipping');
    section.append(el('h2','','Calcule o frete pelo CEP'),
      el('p','','Consulte o frete conforme tamanho, modelo e quantidade escolhidos. O prazo de produção não está incluído.'));
    const form=el('form');
    const input=el('input');input.type='text';input.name='zipCode';input.required=true;
    input.inputMode='numeric';input.autocomplete='postal-code';input.maxLength=9;
    input.placeholder='00000-000';input.pattern='[0-9]{5}-?[0-9]{3}';
    input.setAttribute('aria-label','CEP para entrega');
    const button=el('button','','Consultar frete');button.type='submit';
    const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const results=el('div','shop-single-quote-results');
    form.append(input,button);section.append(form,status,results);container.append(section);
    if(!product.variants?.some(v=>v.sku && Number.isInteger(v.priceCents))){
      button.disabled=true;
      status.textContent='Frete em preparação: modelo, preço e dados de envio ainda não foram confirmados.';
      return;
    }
    let serial=0,controller=null;
    const selectedReady=()=>{
      const v=product.variants.find(v=>v.code===select.value);
      return Boolean(v?.sku&&Number.isInteger(v.priceCents));
    };
    function reset(){
      serial++;controller?.abort();controller=null;button.disabled=!selectedReady();
      status.textContent=selectedReady()?'':'Frete indisponível para o tamanho sem preço e produção confirmados.';
      results.replaceChildren();
    }
    input.addEventListener('input',reset);
    select.addEventListener('change',reset);
    quantity.addEventListener('change',reset);
    reset();
    form.addEventListener('submit',async event=>{
      event.preventDefault();reset();
      const zipCode=input.value.replace(/\D/g,'');
      const variant=product.variants.find(v=>v.code===select.value);
      const units=Number(quantity.value);
      if(!Number.isInteger(units)||units<1||units>10){
        status.textContent='Escolha entre 1 e 10 unidades.';return;
      }
      if(!/^\d{8}$/.test(zipCode)){status.textContent='Informe um CEP válido com 8 números.';return;}
      if(!variant?.sku || !Number.isInteger(variant.priceCents)){
        status.textContent='Esta variação ainda não possui preço e dados de frete confirmados.';
        return;
      }
      const turn=serial;controller=new AbortController();button.disabled=true;
      status.textContent='Consultando as opções disponíveis...';
      try {
        const response=await fetch(API+(units>1?
          '/api/shipping/cart-preview':'/api/shipping/preview'),{
          method:'POST',mode:'cors',cache:'no-store',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(units>1?
            {zipCode,items:[{sku:variant.sku,quantity:units}]}:
            {zipCode,sku:variant.sku}),
          signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])
        });
        const data=await response.json().catch(()=>({}));
        if(turn!==serial)return;
        if(!response.ok)throw Error(data?.error||'http_'+response.status);
        const matching=units>1?
          data?.items?.length===1 && data.items[0].sku===variant.sku &&
          data.items[0].quantity===units:
          data?.sku===variant.sku;
        if(!matching||data?.zipCode!==zipCode||!Array.isArray(data.options))
          throw Error('cotacao');
        const choices=data.options.filter(item=>item && item.isActive===true &&
          typeof item.name==='string' && item.name.length<=120 &&
          !/retirada|retire|pickup/i.test(item.name) &&
          Number.isFinite(item.shippingCost) && item.shippingCost>=0 && item.shippingCost<=10000 &&
          Number.isInteger(item.deliveryTime) && item.deliveryTime>=0 && item.deliveryTime<=365);
        if(!choices.length)throw Error('sem_frete');
        status.textContent=data.provisional===true?
          'Simulação orientativa para '+units+' unidade(s), sujeita à confirmação da embalagem:':
          'Opções estimadas para '+units+' unidade(s):';
        choices.forEach(item=>{
          const quote=el('p','shop-single-quote-line',
            item.name+' · Frete: '+money(Math.round(item.shippingCost*100))+
            ' · Total estimado: '+money(variant.priceCents*units+Math.round(item.shippingCost*100))+
            ' · Transporte: '+item.deliveryTime+' dia(s) úteis');
          results.append(quote);
        });
        results.append(el('p','',
          (data.provisional===true?'Embalagem ainda em validação, sem autorização de pagamento. ':'')+
          'Valores sujeitos a reconferência. O prazo de fabricação não está incluído.'));
      } catch(err) {
        if(turn!==serial)return;
        const reason=({
          shipping_product_unverified:'Esta variação ainda não tem dados de transporte confirmados.',
          unavailable_product:'O cadastro de produção e envio desta peça ainda está em validação.',
          shipping_not_configured:'A configuração do frete está incompleta.',
          shipping_provider_unavailable:'A transportadora não retornou uma cotação.',
          shipping_package_unverified:'O pacote deste pedido ainda não foi validado.',
          http_403:'Acesso à API de frete bloqueado (HTTP 403).',
          origin_not_allowed:'O domínio da loja precisa ser autorizado na API.'
        })[String(err?.message||'')] || 'Não foi possível completar a consulta.';
        status.textContent='Frete indisponível neste momento. '+reason+
          ' Você pode consultar na sacola ou entrar em contato.';
      } finally {
        if(turn===serial){button.disabled=!selectedReady();controller=null;}
      }
    });
  }
  function display(product,all) {
    // Aplica o enquadramento compacto somente à camiseta; não altera outros produtos.
    root.dataset.productId=product.id;
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
    const isCorIesuShirt=product.id==='camiseta-cor-iesu-sacratissimum';
    const isEcobag=product.id==='ecobag-salve-regina';
    const statusText=isBook?'Disponível nas lojas parceiras':isPreparation?'Em preparação · não disponível para compra':isShirt?'Compra online disponível · produção sob demanda':'Sob consulta · preço sujeito à confirmação';
    const productStatus=el('span','shop-single-status',statusText);
    summary.append(productStatus);
    let variant=null,select=null;
    const price=el('p','shop-single-price');
    const priceNote=el('p','shop-single-price-note',
      isBook?'Preço e frete informados pela loja parceira.':
      isPreparation?(isCorIesuShirt?'Preço definido: R$ 109,90. Venda em preparação; frete e disponibilidade serão validados antes do pagamento.':'Modelo e preço definitivo ainda não cadastrados.'):
      'Valor sugerido. Frete e preço final conferidos antes de qualquer pagamento.');
    // Ficha comercial uniforme: o preço mantém a variação e a origem de dados do produto.
    const pricePanel=el('div','shop-single-pricebox');
    pricePanel.append(el('span','shop-single-price-label','Preço'),price,priceNote);
    summary.append(pricePanel);
    const description=isBook?product.description:detail.description||'Produto personalizado da coleção Salve Regina.';
    summary.append(el('p','shop-single-excerpt',isShirt?'A partitura da Salve Regina na frente e Nossa Senhora nas costas. Camiseta preta unissex em 100% algodão penteado, com gola canelada reforçada.':description));
    if(isShirt)summary.append(link('Ver detalhes da camiseta ↓','#detalhes-camiseta','shop-single-back'));
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
      variant=(isEcobag&&variants.find(v=>v.code===preferredSize))||
        (isEcobag&&variants.find(v=>v.code==='M'))||variants.find(v=>v.code==='G')||variants[0];
      function renderPrice(){
        variant=variants.find(v=>v.code===select.value)||variants[0];
        price.textContent=Number.isInteger(variant?.priceCents)?money(variant.priceCents):'Preço a confirmar';
        if(isShirt && variant?.code==='XG')
          priceNote.textContent='Tamanho XG · preço R$ 119,90 mais frete calculado pelo CEP.';
        else if(isEcobag&&!variant?.sku)
          priceNote.textContent='Tamanho '+variant.code+': preço e produção ainda não confirmados. M e G estão cadastrados para venda.';
        else priceNote.textContent=isPreparation?(isCorIesuShirt?'Preço definido: R$ 109,90. Venda em preparação; frete e disponibilidade serão validados antes do pagamento.':'Modelo e preço definitivo ainda não cadastrados.'):
          isShirt?'Preço de venda definido. Calcule o frete pelo CEP antes de pagar.':
          'Valor sugerido. Frete e preço final conferidos antes de qualquer pagamento.';
      }
      const form=el('form','shop-single-form');
      const variationGroup=el('fieldset','shop-single-variant-group');
      variationGroup.append(el('legend','shop-single-field-label',
        (isShirt||isCorIesuShirt||isEcobag)?'Tamanho':'Modelo'));
      const hiddenLabel=el('label','shop-single-visually-hidden','Escolha a variação');
      select=el('select','shop-single-native-select');
      select.required=true;select.setAttribute('aria-label','Escolha a variação');
      const chips=el('div','shop-single-variant-chips');
      const chipButtons=new Map();
      variants.forEach(v=>{
        const option=el('option','',v.label+(Number.isInteger(v.priceCents)?' — '+money(v.priceCents):''));
        option.value=v.code;select.append(option);
        const chip=el('button','shop-single-variant-chip',(isShirt||isCorIesuShirt||isEcobag)?v.code:v.label);
        chip.type='button';chip.setAttribute('aria-pressed','false');
        chip.addEventListener('click',()=>{
          select.value=v.code;select.dispatchEvent(new Event('change',{bubbles:true}));
        });
        chips.append(chip);chipButtons.set(v.code,chip);
      });
      select.value=variant?.code||'';
      hiddenLabel.append(select);variationGroup.append(hiddenLabel,chips);
      const updateChips=()=>{
        chipButtons.forEach((chip,code)=>{
          const active=select.value===code;
          chip.classList.toggle('is-selected',active);
          chip.setAttribute('aria-pressed',String(active));
        });
      };
      select.addEventListener('change',updateChips);updateChips();

      const companionOptions=product.category==='canecas'?[
        {id:'caneca-salve-regina-preta',label:'Partitura Gregoriana'},
        {id:'caneca-salve-regina-pb',label:'Nossa Senhora'}
      ]:null;
      if(companionOptions){
        const companion=el('nav','shop-single-companion-options');
        companion.setAttribute('aria-label','Outras opções disponíveis');
        companion.append(el('p','shop-single-field-label',
          product.category==='canecas'?'Acabamento':'Tamanho'));
        const buttons=el('div','shop-single-companion-choices');
        companionOptions.forEach(option=>{
          const active=option.id===product.id;
          const choice=link(option.label,
            '/pages/produto-loja.html?id='+encodeURIComponent(option.id),
            'shop-single-variant-chip'+(active?' is-selected':''));
          if(active)choice.setAttribute('aria-current','page');
          buttons.append(choice);
        });
        companion.append(buttons);variationGroup.append(companion);
      }

      const quantityGroup=el('div','shop-single-quantity-group');
      quantityGroup.append(el('span','shop-single-field-label','Quantidade'));
      const stepper=el('div','shop-single-stepper');
      const minus=el('button','shop-single-stepper-button','−');
      minus.type='button';minus.setAttribute('aria-label','Diminuir quantidade');
      const quantity=el('input','shop-single-quantity-input');
      quantity.type='number';quantity.min='1';quantity.max='10';
      quantity.step='1';quantity.value='1';quantity.required=true;
      quantity.setAttribute('aria-label','Quantidade de unidades');
      const plus=el('button','shop-single-stepper-button','+');
      plus.type='button';plus.setAttribute('aria-label','Aumentar quantidade');
      const changeQty=()=>{
        let value=Number(quantity.value);
        if(!Number.isInteger(value))value=1;
        value=Math.min(10,Math.max(1,value));
        quantity.value=String(value);
        minus.disabled=value===1;plus.disabled=value===10;
        quantity.dispatchEvent(new Event('change',{bubbles:true}));
      };
      minus.addEventListener('click',()=>{quantity.value=String(Number(quantity.value)-1);changeQty();});
      plus.addEventListener('click',()=>{quantity.value=String(Number(quantity.value)+1);changeQty();});
      quantity.addEventListener('blur',changeQty);
      minus.disabled=true;
      stepper.append(minus,quantity,plus);
      quantityGroup.append(stepper,el('span','shop-single-availability',
        isPreparation?'Em preparação':'Produção sob demanda'));
      const actions=el('div','shop-single-actions');
      const add=el('button','','Adicionar ao carrinho');add.type='submit';
      const proceed=el('button','','Ver entrega e compra');proceed.type='button';
      const feedback=el('p','shop-single-feedback');
      feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
      actions.append(add,proceed);
      const approvedSkus=new Set();
      const syncCheckout=()=>{
        const selected=variants.find(v=>v.code===select.value);
        const approved=Boolean(selected?.sku&&approvedSkus.has(selected.sku));
        const configured=Boolean(selected?.sku&&Number.isInteger(selected.priceCents));
        proceed.textContent=approved?'Comprar agora':configured?'Consultar compra':'Tamanho indisponível';
        add.disabled=isPreparation||!configured||!window.Cart;
        proceed.disabled=isPreparation||!configured||!window.Cart;
        if(!isPreparation){
          productStatus.textContent=!configured?'Tamanho indisponível para compra':
            approved?'Compra online disponível · produção sob demanda':
            'Produção sob demanda · compra sob consulta';
          if(approved)priceNote.textContent=
            'Preço aprovado. Frete e total confirmados no checkout.';
        }
      };
      select.addEventListener('change',syncCheckout);
      if(!isPreparation){
        fetch(API+'/api/checkout/live/readiness',{
          mode:'cors',cache:'no-store',signal:AbortSignal.timeout(8000)
        }).then(response=>response.ok?response.json():null).then(data=>{
          if(data?.checkoutEnabled!==true||!Array.isArray(data.availableSkus))return;
          data.availableSkus.forEach(code=>{
            if(typeof code==='string')approvedSkus.add(code);
          });
          syncCheckout();
        }).catch(()=>{/* Sem validação no servidor, só consulta assistida. */});
      }
      syncCheckout();
      if(isCorIesuShirt){
        // Sem preço/variante homologados: consulta somente, sem carrinho ou checkout.
        quantityGroup.hidden=true;
        actions.replaceChildren(link('Consultar disponibilidade ↗','/pages/contato.html','shop-single-buy'));
      }
      form.append(variationGroup,quantityGroup,actions,feedback);
      summary.append(form);
      const state=()=>{
        const selected=variants.find(v=>v.code===select.value);
        const configured=Boolean(selected?.sku&&Number.isInteger(selected.priceCents));
        add.disabled=isPreparation||!configured||!window.Cart;
        proceed.disabled=isPreparation||!configured||!window.Cart;
        if(isPreparation)feedback.textContent='Este modelo ainda não está disponível para compra.';
      };
      state();document.addEventListener('douglas-cart-ready',state);
      select.addEventListener('change',()=>{
        renderPrice();feedback.textContent='';
        if(isEcobag&&!variants.find(v=>v.code===select.value)?.sku)
          feedback.textContent='Este tamanho ainda não está disponível. Escolha M ou G para comprar.';
        state();
      });
      renderPrice();
      const putInCart=goCart=>{
        const amount=Number(quantity.value);
        if(!Number.isInteger(amount)||amount<1||amount>10){
          feedback.textContent='Escolha uma quantidade entre 1 e 10.';return;
        }
        if(!variants.find(v=>v.code===select.value)?.sku){
          feedback.textContent='Esta variação ainda não está disponível para compra.';return;
        }
        if(!window.Cart){feedback.textContent='O carrinho está carregando. Tente novamente.';return;}
        const ok=window.Cart.add(product.id,select.value,amount);
        if(ok){
          if(goCart)window.location.assign('/pages/cart.html');
          else feedback.textContent='Produto adicionado. Você pode continuar comprando ou abrir o carrinho.';
        }else feedback.textContent='Não foi possível adicionar. Verifique a quantidade ou a variação.';
      };
      form.addEventListener('submit',event=>{event.preventDefault();putInCart(false);});
      proceed.addEventListener('click',()=>{
        const selected=variants.find(v=>v.code===select.value);
        const units=Number(quantity.value);
        if(units===1 && selected?.sku && approvedSkus.has(selected.sku)){
          window.location.assign(isShirt?
            '/pages/checkout-salve-regina.html?size='+encodeURIComponent(selected.code):
            '/pages/checkout-salve-regina.html?sku='+encodeURIComponent(selected.sku));
        }else{
          putInCart(true);
        }
      });
      summary.append(link('Ver meu carrinho →','/pages/cart.html','shop-single-back'));
      // Calculadora na página individual de todas as peças físicas, não só camiseta.
      // Produtos em preparação exibem a pendência sem consultar preço inexistente.
      // Frete aparece sempre antes das opções de compra, em todos os produtos físicos.
      const delivery=el('div');
      shipping(delivery,product,select,quantity);
      form.before(delivery);
    }
    const trust=el('div','shop-single-trust');
    trust.append(el('p','',isBook?
      'O pedido, o pagamento e a entrega do livro são responsabilidade da loja parceira escolhida.':
      'Adicionar à sacola não confirma pedido, reserva de produção nem pagamento. A autorização de cobrança depende da disponibilidade do checkout e da confirmação no servidor.'));
    trust.append(link('Condições de entrega e trocas','/pages/condicoes-da-loja.html'));
    summary.append(trust);
    layout.append(gallery(
      photos,title,
      isShirt?'':(detail.note || (isBook?'Arte de divulgação do livro':'Imagem ilustrativa da coleção')),
      detail.photoLabels,true
    ),summary);
    root.replaceChildren(layout);
    if(!isBook){
      const seller=el('section','shirt-seller');
      seller.append(el('strong','','Loja Douglas Assumpção'),link('Visitar a loja','/pages/loja.html','shop-single-back'));
      root.append(seller);
    }
    const details=el('section','shop-single-details shop-single-details-unified');
    const desc=el('div','shop-single-description-block');desc.append(el('h2','','Descrição do produto'),
      el('p','',description));
    if(Array.isArray(detail.paragraphs)){
      desc.replaceChildren(el('h2','','Descrição do produto'));
      if(isShirt)details.id='detalhes-camiseta';
      detail.paragraphs.forEach(p=>desc.append(el('p','',p)));
      const bullets=(heading,items)=>{
        desc.append(el('h3','shop-single-subheading',heading));
        const list=el('ul','shop-single-bullet-list');
        items.forEach(item=>list.append(el('li','',item)));desc.append(list);
      };
      if(!isShirt)bullets('Características do produto',detail.features);
      if(!isShirt)bullets('Por que escolher',detail.reasons);
      desc.append(el('h3','shop-single-subheading','Perguntas frequentes'));
      const faq=el('div','shop-single-faq');
      detail.faq.forEach(([q,a])=>{
        const row=el('details');row.append(el('summary','',q),el('p','',a));faq.append(row);
      });desc.append(faq);
    }
    if(detail.note)desc.append(el('p','shop-single-muted',detail.note));
    const infoBox=el('div','shop-single-specifications-block');infoBox.append(el('h2','','Informações'));
    infoBox.append(specs(isBook?{
      'Categoria':product.category,'Formato':product.format,'Autor':product.author,'Venda':'Parceiros externos'
    }:{
      'Coleção':'Salve Regina','Categoria':detail.type||product.category,
      'Material':detail.material||'A confirmar','Acabamento':detail.finish||'A confirmar',
      'Situação':isPreparation?'Em preparação':isShirt?'Compra online disponível':'Sob consulta'
    }));
    if(isCorIesuShirt){
      infoBox.replaceChildren(el('h2','','Informações do produto'),specs({
        'Coleção':'Cor Iesu Sacratissimum',
        'Material':'100% algodão fio 30.1 penteado',
        'Modelagem':'Unissex',
        'Cor':'Marrom, conforme fotos',
        'Tamanhos desta edição':'P, M, G e GG (em validação)',
        'Impressão':'DTF · frente e costas · estampas fixas',
        'Medidas do pacote (C × L × A)':'300 × 250 × 10 mm (informação da ficha-base)',
        'Peso de catálogo':'0,25 kg (ficha-base)',
        'NCM':'6109.10.00',
        'SKU-base VAVI':'0000002',
        'Unidade':'Peça',
        'Fornecedor da peça-base':'VAVI',
        'Preço de venda':'R$ 109,90 + frete',
        'Situação':'Em preparação · integração e produção pendentes de validação'
      }));
      details.append(infoBox,desc);
    }else if(isShirt){
      infoBox.replaceChildren(el('h2','','Informações do produto'),specs({
        'Coleção':'Salve Regina','Material':detail.material,'Modelagem':'Unissex','Gola':'Canelada reforçada','Cor':'Preta',
        'Tamanhos':product.variants.map(v=>v.code).join(', '),'Estampa':detail.finish,'Produção':'Sob demanda','Venda':'Por unidade'
      }));
      details.append(infoBox,desc);
    }else details.append(infoBox,desc);
    root.append(details);
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
    const product=all.find(p=>p.id===requestedId);
    if(legacySize&&product){
      const url=new URL(window.location.href);
      url.searchParams.set('id',requestedId);url.searchParams.set('size',legacySize);
      window.history.replaceState(null,'',url.pathname+url.search+url.hash);
    }
    if(!product){showError('Produto não encontrado ou temporariamente indisponível.');return;}
    display(product,all);
  }
  init().catch(()=>showError('Não foi possível carregar os detalhes. Volte à loja e tente novamente.'));
})();
