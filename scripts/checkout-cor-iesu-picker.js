/* Seletor de variações Cor Iesu. Os SKUs aqui são internos da loja.
 * A API /readiness e o D1 decidem o que pode ser comprado.
 * Para editar cores visíveis, altere somente a lista COLORS abaixo.
 */
(() => {
  'use strict';
  const COLORS=Object.freeze([
    {slug:'marrom',name:'Marrom',hex:'#67513f'},
    {slug:'bege',name:'Bege',hex:'#c9b18e'},
    {slug:'vinho',name:'Vinho',hex:'#632b3e'},
    {slug:'verde-escuro',name:'Verde escuro',hex:'#28473c'},
    {slug:'cinza-claro',name:'Cinza claro',hex:'#b6b9b7'},
    {slug:'grafite',name:'Grafite',hex:'#44474a'}
  ]);
  const SIZES=Object.freeze(['P','M','G','GG']);
  const knownColor=slug=>COLORS.find(c=>c.slug===slug);
  const skuFor=(color,size)=>'cor-iesu-'+color+'-'+size.toLowerCase();
  function parseSku(sku){
    if(typeof sku!=='string')return null;
    for(const color of COLORS){
      for(const size of SIZES){
        if(sku===skuFor(color.slug,size))return {color:color.slug,size};
      }
    }
    return null;
  }
  function render(sku){
    const initial=parseSku(sku)||{color:'marrom',size:'G'};
    const colorOptions=COLORS.map(color=>
      '<label class="checkout-color-choice" data-color-choice="'+color.slug+'">'+
        '<input type="radio" name="corIesuColor" value="'+color.slug+'"'+
          (color.slug===initial.color?' checked':'')+'>'+
        '<span class="checkout-color-swatch" style="--swatch:'+color.hex+'" aria-hidden="true"></span>'+
        '<span class="checkout-color-name">'+color.name+'</span>'+
      '</label>'
    ).join('');
    const sizeOptions=SIZES.map(size=>
      '<label class="checkout-size-choice" data-size-choice="'+size+'">'+
        '<input type="radio" name="corIesuSize" value="'+size+'"'+
          (size===initial.size?' checked':'')+'>'+
        '<span>'+size+'</span>'+
      '</label>'
    ).join('');
    return '<div class="checkout-variant-picker" data-cor-iesu-picker>'+
      '<input type="hidden" name="size" value="'+initial.size+'">'+
      '<input type="hidden" name="color" value="'+initial.color+'">'+
      '<fieldset class="checkout-variant-group">'+
        '<legend>Cor da camiseta <strong id="checkout-selected-color"></strong></legend>'+
        '<div class="checkout-color-options">'+colorOptions+'</div>'+
      '</fieldset>'+
      '<fieldset class="checkout-variant-group">'+
        '<legend>Tamanho <strong id="checkout-selected-size"></strong></legend>'+
        '<div class="checkout-size-options">'+sizeOptions+'</div>'+
      '</fieldset>'+
      '<p class="checkout-variant-note">A foto mostra a camiseta Marrom. As demais cores são opções observadas no fornecedor, ainda sujeitas à confirmação.</p>'+
      '<p class="checkout-variant-status" id="checkout-variant-status" role="status" aria-live="polite"></p>'+
      '<a class="checkout-variant-help" id="checkout-variant-help" href="/pages/contato.html" hidden>Consultar disponibilidade desta combinação</a>'+
    '</div>';
  }
  function mount(form,{requestedSku,availableSkus=[]}={}){
    const root=form.querySelector('[data-cor-iesu-picker]');
    if(!root)return null;
    const available=new Set(Array.isArray(availableSkus)?availableSkus:[]);
    const colorLabel=root.querySelector('#checkout-selected-color');
    const sizeLabel=root.querySelector('#checkout-selected-size');
    const status=root.querySelector('#checkout-variant-status');
    const help=root.querySelector('#checkout-variant-help');
    const chosenColor=()=>root.querySelector('input[name="corIesuColor"]:checked')?.value||'marrom';
    const chosenSize=()=>root.querySelector('input[name="corIesuSize"]:checked')?.value||'G';
    const getSku=()=>skuFor(chosenColor(),chosenSize());
    const isAvailable=()=>available.has(getSku());
    const getLabel=()=> 'Camiseta Cor Iesu Sacratissimum — '+
      (knownColor(chosenColor())?.name||'Marrom')+' '+chosenSize();
    function sync(notify=false){
      const color=chosenColor(),size=chosenSize(),ready=isAvailable();
      form.elements.size.value=size;
      form.elements.color.value=color;
      colorLabel.textContent=knownColor(color)?.name||'Marrom';
      sizeLabel.textContent=size;
      root.querySelectorAll('[data-color-choice]').forEach(label=>{
        const slug=label.dataset.colorChoice;
        const possible=SIZES.some(s=>available.has(skuFor(slug,s)));
        label.classList.toggle('is-pending',!possible);
        label.title=possible?'Ver tamanhos disponíveis':'Cor sob consulta';
      });
      root.querySelectorAll('[data-size-choice]').forEach(label=>{
        const possible=available.has(skuFor(color,label.dataset.sizeChoice));
        label.classList.toggle('is-pending',!possible);
        label.title=possible?'Disponível para compra':'Tamanho/cor sob consulta';
      });
      status.textContent=ready
        ? 'Disponível para compra online. Confira a cor e o tamanho antes de calcular o frete.'
        : 'Esta combinação ainda está sob consulta. Selecione Marrom em um tamanho disponível para comprar agora.';
      status.classList.toggle('is-unavailable',!ready);
      help.hidden=ready;
      const quote=form.querySelector('#ship-quote');
      if(quote)quote.disabled=!ready;
      if(notify)form.elements.size.dispatchEvent(new Event('change',{bubbles:true}));
    }
    root.addEventListener('change',event=>{
      if(!event.target.matches('input[name="corIesuColor"],input[name="corIesuSize"]'))return;
      sync(true);
    });
    sync();
    return {sku:getSku,isAvailable,label:getLabel,size:chosenSize,color:chosenColor,sync};
  }
  window.DouglasCorIesuPicker={COLORS,SIZES,parseSku,render,mount};
})();
