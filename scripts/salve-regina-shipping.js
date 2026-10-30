// Coleção Salve Regina: shipping preview only. No buyer PII, no checkout.
const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
const SKU='salve-regina-preta-g';
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const form=document.getElementById('salve-shipping-form');
const status=document.getElementById('salve-shipping-status');
const result=document.getElementById('salve-shipping-result');
const submit=form?.querySelector('button[type="submit"]');
function say(message){status.textContent=message;}
async function api(path,body){
  const response=await fetch(API+path,{
    method:body?'POST':'GET',
    headers:body?{'Content-Type':'application/json'}:{},
    body:body?JSON.stringify(body):undefined,
    mode:'cors',cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.message||'Serviço de frete temporariamente indisponível.');
  return data;
}
async function init(){
  if(!form)return;
  try{
    const catalog=await api('/api/catalog');
    const hasG=catalog.products?.some(p=>p.variants?.some(v=>v.sku===SKU && v.available));
    if(!hasG){
      say('A cotação ficará disponível quando a camiseta passar pela validação técnica. Nenhum pedido pode ser feito agora.');
      submit.disabled=true;
      return;
    }
    say('Informe seu CEP para consultar as opções de envio.');
    submit.disabled=false;
  }catch{
    say('A consulta de frete ainda não está disponível. As vendas permanecem fechadas.');
    submit.disabled=true;
  }
}
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  const zip=form.elements.zipCode.value.replace(/\D/g,'');
  result.replaceChildren();
  if(!/^\d{8}$/.test(zip)){say('Digite um CEP com 8 números.');return;}
  submit.disabled=true;
  say('Consultando transportadoras…');
  try{
    const data=await api('/api/shipping/quote',{
      zipCode:zip,items:[{sku:SKU,quantity:1}]
    });
    const list=document.createElement('ul');
    if(!Array.isArray(data.options)||!data.options.length){
      say('Não foram encontradas opções de frete para este CEP.');
    }else{
      say('Valores estimados pela transportadora. Prazo contado após a produção e despacho.');
      for(const option of data.options){
        const li=document.createElement('li');
        li.textContent=`${option.name}: ${money.format(option.shippingCost)} · ${option.deliveryTime} dia(s) úteis de transporte (estimativa)`;
        list.append(li);
      }
      result.append(list);
    }
  }catch{
    say('Ainda não foi possível calcular o frete. Nenhuma cobrança ou pedido foi criado.');
  }finally{submit.disabled=false;}
});
init();
