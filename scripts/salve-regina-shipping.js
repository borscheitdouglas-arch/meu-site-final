// Coleção Salve Regina: shipping preview only. No buyer PII, no checkout.
const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
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
    mode:'cors',cache:'no-store',signal:AbortSignal.timeout(21000)
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.message||'Serviço de frete temporariamente indisponível.');
  return data;
}
function init(){
  if(!form)return;
  say('Informe seu CEP para consultar o frete estimado. Pedidos e pagamentos ainda não estão disponíveis.');
  submit.disabled=false;
}
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  const zip=form.elements.zipCode.value.replace(/\D/g,'');
  result.replaceChildren();
  if(!/^\d{8}$/.test(zip)){say('Digite um CEP com 8 números.');return;}
  submit.disabled=true;
  say('Consultando transportadoras…');
  try{
    const data=await api('/api/shipping/preview',{zipCode:zip});
    const list=document.createElement('ul');
    if(!Array.isArray(data.options)||!data.options.length){
      say('Não foram encontradas opções de frete para este CEP.');
    }else{
      say('Valores estimados pela transportadora. O prazo informado pela VAVI deve ser considerado junto ao tempo de produção, de 3 a 5 dias úteis.');
      for(const option of data.options){
        const li=document.createElement('li');
        li.textContent=`${option.name}: ${money.format(option.shippingCost)} · ${option.deliveryTime} dia(s) informados pela VAVI para o transporte (estimativa)`;
        list.append(li);
      }
      result.append(list);
    }
  }catch{
    say('Ainda não foi possível calcular o frete. Nenhuma cobrança ou pedido foi criado.');
  }finally{submit.disabled=false;}
});
init();
