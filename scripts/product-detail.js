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
      "Confeccionada em 100% algodão fio 30.1 penteado, a camiseta possui modelagem unissex, toque macio e tecido respirável para o cotidiano. Escolha sua cor entre as 11 opções da galeria e selecione o tamanho desejado.",
      "Esta edição apresenta estampas fixas na frente e nas costas, com impressão DTF. Preço único de R$ 109,90 em todas as 11 cores e nos tamanhos P, M, G e GG, mais o frete calculado no checkout. Produção sob demanda com conferência manual das opções antes de fabricar."
    ],
    "features": [
      "Composição: 100% algodão fio 30.1 penteado.",
      "Modelagem unissex; camiseta de manga curta e gola redonda.",
      "11 cores apresentadas na galeria, com seleção de cor e tamanho.",
      "Frente: medalhão do Sagrado Coração de Jesus com lírios e raios.",
      "Costas: estampa grande com moldura gótica, rosas, cruz e inscrição latina.",
      "Impressão prevista: DTF, frente e costas, com artes fixas.",
      "Tamanhos desta edição: P, M, G e GG, sem alteração de preço.",
      "Venda por peça; produção sob demanda após confirmação do pedido."
    ],
    "reasons": [
      "Expressa a devoção ao Sacratíssimo Coração de Jesus com arte autoral.",
      "Combina gravura sacra vintage e apresentação contemporânea.",
      "Algodão penteado macio e respirável, com modelagem unissex.",
      "Duas estampas complementares: frente discreta e costas ornamentadas."
    ],
    "photos": [
      "/assets/img/loja/cor-iesu/capa-modelos-frente-costas-20261111.jpg",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-marrom-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-branco-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-preto-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-off-white-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-azul-marinho-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-azul-royal-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-verde-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-cinza-claro-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-cinza-escuro-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-areia-1200.webp",
      "/assets/img/loja/cor-iesu/cores/cor-iesu-bordo-1200.webp"
    ],
    "photoLabels": [
      "Camiseta Cor Iesu Sacratissimum em dois modelos, vista frontal e traseira da cor Marrom.",
      "Camiseta Sagrado Coração de Jesus: Marrom — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Branco — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Preto — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Off-white — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Azul-marinho — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Azul-royal — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Verde — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Cinza-claro — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Cinza-escuro — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Areia — frente e costas.",
      "Camiseta Sagrado Coração de Jesus: Bordô — frente e costas."
    ]
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
  function gallery(photos, title, photoLabels, fitToFrame=false, fixedFrame=false, onPhotoChange=null) {
    const figure=el('figure','shop-single-imagebox');
    const image=el('img');image.src=photos[0];image.alt=photoLabels?.[0] || ('Imagem de '+title);image.width=850;image.height=850;
    const imageClip=el('div','shop-single-image-clip');
    imageClip.append(image);
    figure.append(imageClip);
    if(fixedFrame){
      image.width=1200;image.height=900;
      figure.style.setProperty('--shirt-frame-width','426px');
      figure.style.setProperty('--shirt-frame-mobile-width','322px');
      figure.style.setProperty('--shirt-frame-ratio','4 / 3');
    }
    // A camiseta exibe a fotografia inteira em uma moldura proporcional à foto,
    // inclusive quando o cliente alterna entre imagens verticais e horizontais.
    if(fitToFrame&&!fixedFrame){
      const updateFrame=()=>{
        const w=image.naturalWidth, h=image.naturalHeight;
        if(!w||!h)return;
        const ratio=w/h;
        // Retratos de corpo inteiro ganham altura para que pernas e estampa
        // fiquem visíveis, sem recortar a fotografia ou reduzir demais o modelo.
        const tallPortrait=ratio<0.62;
        // Retrato com jeans parcial (aprox. 2:3): não encolher a camisa
        // como se fosse uma foto de corpo inteiro.
        const partialLegs=ratio>=0.62&&ratio<0.72;
        const widthDesktop=Math.min(426,Math.round((tallPortrait?730:partialLegs?520:390)*ratio));
        const widthMobile=Math.min(322,Math.round((tallPortrait?520:partialLegs?390:300)*ratio));
        figure.style.setProperty('--shirt-frame-width', (widthDesktop+18)+'px');
        figure.style.setProperty('--shirt-frame-mobile-width', (widthMobile+14)+'px');
        figure.style.setProperty('--shirt-frame-ratio', w+' / '+h);
      };
      image.addEventListener('load',updateFrame);
      if(image.complete)updateFrame();
    }
    const photoColor=fixedFrame?el('p','shop-single-photo-color'):null;
    const photoColorNames={
      'branco':'Branco','preto':'Preto','off-white':'Off-white',
      'azul-marinho':'Azul-marinho','azul-royal':'Azul-royal','verde':'Verde',
      'cinza-claro':'Cinza-claro','cinza-escuro':'Cinza-escuro',
      'areia':'Areia','marrom':'Marrom','bordo':'Bordô'
    };
    const syncPhotoColor=index=>{
      if(!photoColor)return;
      if(index===0 && photos[index].endsWith('capa-modelos-frente-costas-20261111.jpg')){
        photoColor.textContent='Camiseta Marrom · frente e costas';
        return;
      }
      const match=photos[index].match(/\/cores\/cor-iesu-([a-z-]+)-1200\.webp/);
      if(match?.[1]==='editorial')photoColor.textContent='Apresentação editorial · frente e costas';
      else if(match?.[1]&&photoColorNames[match[1]])photoColor.textContent=
        'Cor: '+photoColorNames[match[1]];
      else photoColor.textContent='Outras imagens da camiseta Marrom';
    };
    if(photoColor){syncPhotoColor(0);figure.append(photoColor);}
    const thumbs=el('div','shop-single-thumbs');
    let currentIndex=0, viewer=null, enlargedImage=null, counter=null;
    const showPhoto=index=>{
      currentIndex=(index+photos.length)%photos.length;
      image.src=photos[currentIndex];
      image.alt=photoLabels?.[currentIndex] || ('Imagem '+(currentIndex+1)+' de '+title);
      syncPhotoColor(currentIndex);
      thumbs.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===currentIndex)));
      if(enlargedImage){enlargedImage.src=image.src;enlargedImage.alt=image.alt;}
      if(counter)counter.textContent=(currentIndex+1)+' / '+photos.length;
      if(typeof onPhotoChange==='function')onPhotoChange(currentIndex);
    };
    photos.forEach((photo,index)=>{
      const button=el('button','shop-single-thumb');button.type='button';
      button.setAttribute('aria-label',photoLabels?.[index] || ('Ver imagem '+(index+1)+' do produto'));
      button.setAttribute('aria-pressed',index===0?'true':'false');
      const img=el('img');img.src=photo.replace(/-1200\.webp$/, '-480.webp');img.alt='';img.loading='lazy';button.append(img);
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
    gallery.showPhoto=showPhoto;
    return gallery;
  }
  function specs(data) {
    const list=el('dl','shop-single-specs');
    Object.entries(data).forEach(([name,value])=>{
      const row=el('div');row.append(el('dt','',name),el('dd','',value));list.append(row);
    });return list;
  }
  function shipping(container,product,select,quantity,canQuote=()=>true,resolveVariant=()=>product.variants.find(v=>v.code===select.value)) {
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
      const v=resolveVariant();
      return Boolean(canQuote()&&v?.sku&&Number.isInteger(v.priceCents));
    };
    function reset(){
      serial++;controller?.abort();controller=null;button.disabled=!selectedReady();
      status.textContent=selectedReady()?'':!canQuote()?
        'Frete indisponível para esta combinação. Aguarde confirmação da loja.':
        'Frete indisponível para o tamanho sem preço e produção confirmados.';
      results.replaceChildren();
    }
    input.addEventListener('input',reset);
    select.addEventListener('change',reset);
    quantity.addEventListener('change',reset);
    reset();
    form.addEventListener('submit',async event=>{
      event.preventDefault();reset();
      if(!canQuote()){
        status.textContent='Esta cor está sob consulta e ainda não possui frete aprovado.';
        return;
      }
      const zipCode=input.value.replace(/\D/g,'');
      const variant=resolveVariant();
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
          (data.provisional===true?'Estimativa de frete: o checkout reconfirma o valor e a loja confere a embalagem na produção. ':'')+
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
    // Ficha de compra compartilhada: mesma disposição para todos os artigos físicos.
    root.dataset.productId=product.id;
    const isBook=product.product_type==='book';
    root.classList.toggle('shop-single-physical',!isBook);
    const detail=info[product.id] || {};
    const photos=detail.photos || [product.image];
    const title=product.title;
    const breadcrumb=document.getElementById('shop-single-breadcrumb-name');
    if(breadcrumb)breadcrumb.textContent=title;
    document.title=title+' | Loja Douglas Assumpção';
    const layout=el('div','shop-single-layout');
    const summary=el('section','shop-single-summary');
    const corIesuPage=product.id==='camiseta-cor-iesu-sacratissimum';
    summary.append(el('p','shop-single-kicker',corIesuPage?'COLEÇÃO COR IESU':isBook?'Livros · Música sacra':detail.type||'Coleção Salve Regina'),
      el('h1','',corIesuPage?'Camiseta Cor Iesu Sacratissimum':title));
    const isPreparation=product.status==='preparation';
    const isShirt=product.id==='camiseta-salve-regina';
    const isCorIesuShirt=product.id==='camiseta-cor-iesu-sacratissimum';
    // A primeira foto é a capa; as 11 opções de cor começam no índice 1.
    const corIesuColors=isCorIesuShirt?[
      {slug:'marrom',name:'Marrom',hex:'#67513f'},
      {slug:'branco',name:'Branco',hex:'#f7f5f0'},
      {slug:'preto',name:'Preto',hex:'#202024'},
      {slug:'off-white',name:'Off-white',hex:'#ebe5d5'},
      {slug:'azul-marinho',name:'Azul-marinho',hex:'#1d2b43'},
      {slug:'azul-royal',name:'Azul-royal',hex:'#24509a'},
      {slug:'verde',name:'Verde',hex:'#3c5941'},
      {slug:'cinza-claro',name:'Cinza-claro',hex:'#bfc1c2'},
      {slug:'cinza-escuro',name:'Cinza-escuro',hex:'#55575a'},
      {slug:'areia',name:'Areia',hex:'#cbb79a'},
      {slug:'bordo',name:'Bordô',hex:'#702b41'}
    ]:[];
    let chosenColor='marrom',showSelectedPhoto=null,syncColorFromGallery=()=>{},refreshColorChoices=()=>{};
    const isEcobag=product.id==='ecobag-salve-regina';
    const statusText=isBook?'Disponível nas lojas parceiras':isPreparation?'Em preparação · não disponível para compra':'Produção sob demanda';
    const productStatus=el('span','shop-single-status',statusText);
    summary.append(productStatus);
    let variant=null,select=null;
    const price=el('p','shop-single-price');
    const priceNote=el('p','shop-single-price-note',
      isBook?'Preço e frete informados pela loja parceira.':
      isPreparation?(isCorIesuShirt?'Preço definido: R$ 109,90. Venda em preparação; frete e disponibilidade serão validados antes do pagamento.':'Modelo e preço definitivo ainda não cadastrados.'):
      'Preço por unidade · frete confirmado antes do pagamento.');
    // Ficha comercial uniforme: o preço mantém a variação e a origem de dados do produto.
    const pricePanel=el('div','shop-single-pricebox');
    pricePanel.append(el('span','shop-single-price-label','Preço'),price,priceNote);
    summary.append(pricePanel);
    const description=isBook?product.description:detail.description||'Produto personalizado da coleção Salve Regina.';
    // Detalhes e descrições completas ficam abaixo da área de compra.
    if(isBook)summary.append(el('p','shop-single-excerpt',description));
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
      const approvedSkus=new Set();
      // Cor Iesu tem 44 SKUs, mas somente 4 tamanhos visíveis.
      // Duplicar o tamanho para cada cor alongava a tela e escondia o botão.
      const sizeVariants=isCorIesuShirt?
        ['P','M','G','GG'].map(size=>variants.find(v=>v.code===size)).filter(Boolean):variants;
      const selectedVariant=()=>isCorIesuShirt?
        variants.find(v=>v.sku==='cor-iesu-'+chosenColor+'-'+select.value.toLowerCase()):
        variants.find(v=>v.code===select.value);
      variant=(isEcobag&&variants.find(v=>v.code===preferredSize))||
        (isEcobag&&variants.find(v=>v.code==='M'))||variants.find(v=>v.code==='G')||variants[0];
      function renderPrice(){
        variant=selectedVariant()||variants[0];
        price.textContent=Number.isInteger(variant?.priceCents)?money(variant.priceCents):'Preço a confirmar';
        if(isShirt && variant?.code==='XG')
          priceNote.textContent='Tamanho XG · preço R$ 119,90 mais frete calculado pelo CEP.';
        else if(isEcobag&&!variant?.sku)
          priceNote.textContent='Tamanho '+variant.code+': preço e produção ainda não confirmados. M e G estão cadastrados para venda.';
        else priceNote.textContent=isPreparation?
          'Venda em preparação: consulte a disponibilidade antes de comprar.':
          !Number.isInteger(variant?.priceCents)?
            'Preço desta variação ainda não confirmado.':
            'Preço por unidade · frete confirmado antes do pagamento.';
      }
      const form=el('form','shop-single-form');
      const variationGroup=el('fieldset','shop-single-variant-group');
      const hasSizeOptions=sizeVariants.length>1;
      if(hasSizeOptions)variationGroup.append(el('legend','shop-single-field-label',
        (isShirt||isCorIesuShirt||isEcobag)?'Tamanho':'Modelo'));
      const hiddenLabel=el('label','shop-single-visually-hidden','Escolha a variação');
      select=el('select','shop-single-native-select');
      select.required=true;select.setAttribute('aria-label','Escolha a variação');
      const chips=el('div','shop-single-variant-chips');
      const chipButtons=new Map();
      sizeVariants.forEach(v=>{
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
      hiddenLabel.append(select);variationGroup.append(hiddenLabel);
      if(hasSizeOptions)variationGroup.append(chips);
      const updateChips=()=>{
        chipButtons.forEach((chip,code)=>{
          const active=select.value===code;
          chip.classList.toggle('is-selected',active);
          chip.setAttribute('aria-pressed',String(active));
        });
      };
      select.addEventListener('change',updateChips);updateChips();

      let colorGroup=null;
      if(isCorIesuShirt){
        colorGroup=el('fieldset','shop-single-color-group');
        const legend=el('legend','shop-single-field-label');
        const chosenName=el('strong','shop-single-color-selected-name','Marrom');
        legend.append('Cor da camiseta · ',chosenName);
        const choices=el('div','shop-single-color-choices');
        const buttons=new Map();
        const chooseColor=(slug,fromGallery=false)=>{
          const chosen=corIesuColors.find(color=>color.slug===slug);
          if(!chosen)return;
          const changed=chosenColor!==slug;
          chosenColor=slug;
          chosenName.textContent=chosen.name;
          buttons.forEach((button,key)=>{
            const active=slug===key;
            button.classList.toggle('is-selected',active);
            button.setAttribute('aria-pressed',String(active));
          });
          if(!fromGallery)showSelectedPhoto?.(corIesuColors.indexOf(chosen)+1);
          // Revalida preço, frete, carrinho e checkout após mudar de cor.
          if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));
        };
        for(const color of corIesuColors){
          const option=el('button','shop-single-color-choice');
          option.type='button';
          option.setAttribute('aria-pressed',color.slug==='marrom'?'true':'false');
          option.setAttribute('aria-label','Selecionar cor '+color.name);
          option.title='Selecionar '+color.name;
          const swatch=el('span','shop-single-color-swatch');
          swatch.style.setProperty('--color-swatch',color.hex);
          swatch.setAttribute('aria-hidden','true');
          option.append(swatch,el('span','shop-single-color-name',color.name));
          option.addEventListener('click',()=>chooseColor(color.slug));
          choices.append(option);buttons.set(color.slug,option);
        }
        colorGroup.append(legend,choices);
        chooseColor('marrom',true);
        refreshColorChoices=()=>chooseColor(chosenColor,true);
        syncColorFromGallery=index=>{
          if(index===0){chooseColor('marrom',true);return;}
          const color=corIesuColors[index-1];
          if(color)chooseColor(color.slug,true);
        };
      }

      const companionOptions=product.category==='canecas'?[
        {id:'caneca-salve-regina-preta',label:'Partitura Gregoriana'},
        {id:'caneca-salve-regina-pb',label:'Nossa Senhora'}
      ]:null;
      if(companionOptions){
        const companion=el('nav','shop-single-companion-options');
        companion.setAttribute('aria-label','Outras opções disponíveis');
        companion.append(el('p','shop-single-field-label',
          product.category==='canecas'?'Escolha a estampa':'Opções disponíveis'));
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
      minus.disabled=true;plus.disabled=false;
      stepper.append(minus,quantity,plus);
      const unitLabel=(isShirt||isCorIesuShirt)?'camiseta':isEcobag?'ecobag':'caneca';
      const subtotalHint=el('span','shop-single-quantity-subtotal');
      quantityGroup.append(stepper,subtotalHint);
      const actions=el('div','shop-single-actions');
      const add=el('button','','Adicionar ao carrinho');add.type='submit';
      const proceed=el('button','','Ver entrega e compra');proceed.type='button';
      const feedback=el('p','shop-single-feedback');
      feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
      actions.append(add,proceed);
      const syncCheckout=()=>{
        const selected=selectedVariant();
        const approved=Boolean(selected?.sku&&approvedSkus.has(selected.sku));
        const configured=Boolean(selected?.sku&&Number.isInteger(selected.priceCents));
        // A disponibilidade anunciada pelo backend é informativa nesta tela.
        // A validação definitiva de SKU, preço e frete ocorre no checkout/API.
        // Se a consulta inicial falhar, não substituir Compra por e-mail.
        const units=Number(quantity.value);
        const validUnits=Number.isInteger(units)&&units>=1&&units<=10;
        subtotalHint.textContent=validUnits&&configured?
          units+' '+unitLabel+(units===1?'':'s')+' · '+money(selected.priceCents*units):
          configured?'Informe de 1 a 10 unidades':'Preço a confirmar';
        proceed.textContent=units>1?
          'Revisar '+units+' '+unitLabel+(units===1?'':'s'):
          isCorIesuShirt||approved?'Comprar agora':
          configured?'Consultar disponibilidade':'Tamanho indisponível';
        add.disabled=isPreparation||!configured||!validUnits||!window.Cart;
        proceed.disabled=isPreparation||!configured||!validUnits||
          (units>1&&!window.Cart)||(!isCorIesuShirt&&!window.Cart);
        if(!isPreparation){
          productStatus.textContent=!configured?'Variação em preparação':
            approved||isCorIesuShirt?'Produção sob demanda':'Disponibilidade conferida no checkout';
          if(configured)priceNote.textContent=
            'Valor por unidade · frete confirmado antes do pagamento.';
        }
      };
      if(!isPreparation){
        fetch(API+'/api/checkout/live/readiness',{
          mode:'cors',cache:'no-store',signal:AbortSignal.timeout(8000)
        }).then(response=>response.ok?response.json():null).then(data=>{
          if(data?.checkoutEnabled!==true||!Array.isArray(data.availableSkus))return;
          data.availableSkus.forEach(code=>{
            if(typeof code==='string')approvedSkus.add(code);
          });
          syncCheckout();renderPrice();refreshColorChoices();
        }).catch(()=>{/* Sem validação no servidor, só consulta assistida. */});
      }
      syncCheckout();
      if(colorGroup)form.append(colorGroup);
      // Um único padrão para produtos físicos. A quantidade (1 a 10)
      // atualiza o subtotal, enquanto o checkout valida cada variante.
      form.append(variationGroup,quantityGroup,actions,feedback);
      quantity.addEventListener('input',syncCheckout);
      quantity.addEventListener('change',syncCheckout);
      summary.append(form);
      const state=()=>{
        syncCheckout();
        if(isPreparation)feedback.textContent='Este modelo ainda não está disponível para compra.';
      };
      state();document.addEventListener('douglas-cart-ready',state);
      select.addEventListener('change',()=>{
        renderPrice();feedback.textContent='';
        if(isEcobag&&!variants.find(v=>v.code===select.value)?.sku)
          feedback.textContent='Este tamanho ainda não está disponível. Escolha M ou G para comprar.';
        state();refreshColorChoices();
      });
      renderPrice();
      const putInCart=goCart=>{
        const amount=Number(quantity.value);
        if(!Number.isInteger(amount)||amount<1||amount>10){
          feedback.textContent='Escolha uma quantidade entre 1 e 10.';return;
        }
        // O carrinho conserva o SKU exato da cor escolhida.
        // O servidor só autoriza a cobrança de combinações habilitadas.
        if(!selectedVariant()?.sku){
          feedback.textContent='Esta variação ainda não está disponível para compra.';return;
        }
        if(!window.Cart){feedback.textContent='O carrinho está carregando. Tente novamente.';return;}
        const ok=window.Cart.add(product.id,
          isCorIesuShirt?selectedVariant().sku:selectedVariant().code,amount);
        if(ok){
          if(goCart)window.location.assign('/pages/cart.html');
          else feedback.textContent='Produto adicionado. Você pode continuar comprando ou abrir o carrinho.';
        }else feedback.textContent='Não foi possível adicionar. Verifique a quantidade ou a variação.';
      };
      form.addEventListener('submit',event=>{event.preventDefault();putInCart(false);});
      proceed.addEventListener('click',()=>{
        const selected=selectedVariant();
        const units=Number(quantity.value);
        if(!selected?.sku||!Number.isInteger(selected.priceCents)||
           !Number.isInteger(units)||units<1||units>10){
          feedback.textContent='Selecione uma variação e quantidade entre 1 e 10.';
          return;
        }
        if(units>1){
          // Mais de uma peça: registrar no carrinho e conferir frete conjunto.
          // Não redirecionar para checkout unitário descartando quantidade.
          putInCart(true);
          return;
        }
        if(isCorIesuShirt){
          window.location.assign(
            '/pages/checkout-salve-regina.html?sku='+encodeURIComponent(selected.sku)
          );
          return;
        }
        if(approvedSkus.has(selected.sku)){
          window.location.assign(isShirt?
            '/pages/checkout-salve-regina.html?size='+encodeURIComponent(selected.code):
            '/pages/checkout-salve-regina.html?sku='+encodeURIComponent(selected.sku));
        }else{
          putInCart(true);
        }
      });
      // Carrinho já está acessível no cabeçalho da loja; remover link repetido.
      // Mesma ordem em todas as fichas: quantidade e compra antes do frete.
      // Frete conjunto ainda é confirmado pela API, não pela página.
      const delivery=el('div');
      // Cotação só retorna frete para SKU ativo no backend. Não bloquear
      // a consulta pelo estado de uma requisição anterior de readiness.
      shipping(delivery,product,select,quantity,()=>true,selectedVariant);
      const freight=el('details','shop-single-freight-disclosure');
      freight.append(el('summary','','Calcular frete pelo CEP'),delivery);
      form.after(freight);
    }
    const trust=el('div','shop-single-trust');
    if(isBook)trust.append(el('p','',
      'O pedido, pagamento e entrega do livro são responsabilidade da loja parceira.'));
    trust.append(link('Informações de entrega e trocas','/pages/condicoes-da-loja.html'));
    summary.append(trust);
    const productGallery=gallery(
      photos,title,detail.photoLabels,true,isCorIesuShirt,syncColorFromGallery
    );
    showSelectedPhoto=index=>productGallery.showPhoto(index);
    layout.append(productGallery,summary);
    root.replaceChildren(layout);
    // Não duplicar o nome da loja e o link do cabeçalho sob cada produto.
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
      if(Array.isArray(detail.faq)&&detail.faq.length){
        desc.append(el('h3','shop-single-subheading','Perguntas frequentes'));
        const faq=el('div','shop-single-faq');
        detail.faq.forEach(([q,a])=>{
          const row=el('details');row.append(el('summary','',q),el('p','',a));faq.append(row);
        });desc.append(faq);
      }
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
        'Cores':'11 opções disponíveis para seleção na galeria',
        'Tamanhos':'P, M, G e GG',
        'Estampas':'Medalhão do Sagrado Coração na frente e gravura gótica nas costas',
        'Impressão':'DTF · frente e costas',
        'Produção':'Sob demanda'
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
