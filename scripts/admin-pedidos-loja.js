/* Área administrativa: sem credenciais persistidas e sem scripts externos. */
(() => {
  'use strict';
  const API='https://douglas-loja-api.liturgia-gregoriano.workers.dev';
  const form=document.getElementById('admin-form');
  const input=document.getElementById('admin-key');
  const status=document.getElementById('admin-status');
  const listPanel=document.getElementById('orders-panel');
  const list=document.getElementById('order-list');
  const detailPanel=document.getElementById('order-detail-panel');
  const detail=document.getElementById('order-detail');
  const copy=document.getElementById('copy-address');
  const hide=document.getElementById('hide-details');
  const clear=document.getElementById('clear-admin');
  if(![form,input,status,listPanel,list,detailPanel,detail,copy,hide,clear].every(Boolean))return;

  let adminKey='';
  let currentAddress='';
  const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
  function clearDetails(){
    detail.textContent='';
    currentAddress='';
    detailPanel.hidden=true;
  }
  function clearSession(){
    adminKey='';input.value='';
    list.replaceChildren();
    listPanel.hidden=true;
    clearDetails();
    status.textContent='Acesso local encerrado.';
  }
  clear.addEventListener('click',clearSession);
  hide.addEventListener('click',clearDetails);
  function text(tag,value,className){
    const e=document.createElement(tag);
    e.textContent=value;
    if(className)e.className=className;
    return e;
  }
  async function request(path){
    if(!adminKey || adminKey.length<32)throw new Error('unauthorized');
    const response=await fetch(API+path,{
      method:'GET',
      headers:{'Authorization':'Bearer '+adminKey},
      cache:'no-store',
      mode:'cors',
      credentials:'omit',
      signal:AbortSignal.timeout(18000)
    });
    if(!response.ok)throw new Error('http_'+response.status);
    return response.json();
  }
  function formatAddress(data){
    const b=data?.buyer, o=data?.order;
    if(!b||!o||!/^ord_[0-9a-f]{32}$/.test(o.id||''))throw new Error('invalid_order');
    const lines=[
      'Pedido: '+o.id,
      'Status: '+o.status,
      'Total recebido: '+money(o.total_cents),
      'Frete (opção): '+o.shipping_option_id,
      '',
      'DESTINATÁRIO',
      b.name,
      'Telefone: '+b.phone,
      'E-mail: '+b.email,
      'CPF/CNPJ: '+b.taxId,
      '',
      'ENTREGA',
      b.street+', '+b.number,
      b.complement||'Sem complemento',
      b.neighborhood,
      b.city+' / '+b.state,
      'CEP: '+b.zipCode
    ];
    return lines.join('\n');
  }
  async function showOrder(id,button){
    clearDetails();
    button.disabled=true;
    status.textContent='Consultando endereço protegido...';
    try {
      const result=await request('/api/internal/live-orders/'+encodeURIComponent(id));
      currentAddress=formatAddress(result);
      detail.textContent=currentAddress;
      detailPanel.hidden=false;
      status.textContent='Dados carregados. Registre o pedido manualmente na VAVI.';
      detailPanel.scrollIntoView({block:'start',behavior:'smooth'});
    } catch {
      status.textContent='Não foi possível consultar este pedido. Confira sua autorização.';
    } finally {
      button.disabled=false;
    }
  }
  function showList(orders){
    list.replaceChildren();
    clearDetails();
    listPanel.hidden=false;
    if(!Array.isArray(orders)||!orders.length){
      list.append(text('p','Nenhum pedido pago aguardando atendimento.'));return;
    }
    for(const order of orders){
      if(!/^ord_[0-9a-f]{32}$/.test(order.id||''))continue;
      const item=document.createElement('div');item.className='order';
      item.append(text('strong','Pedido '+order.id));
      item.append(text('p','Status: '+String(order.status||'')+
        ' · Total: '+money(order.total_cents)+' · CEP: '+String(order.destination_zip||'')));
      item.append(text('p','Criado em: '+String(order.created_at||''),'muted'));
      const action=document.createElement('button');action.type='button';
      action.textContent='Consultar dados da entrega';
      action.addEventListener('click',()=>showOrder(order.id,action));
      item.append(action);list.append(item);
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const candidate=input.value.trim();
    if(candidate.length<32){
      status.textContent='Chave administrativa inválida ou incompleta.';return;
    }
    adminKey=candidate;
    input.value='';
    status.textContent='Consultando pedidos pagos...';
    const button=form.querySelector('button[type="submit"]');button.disabled=true;
    try {
      const data=await request('/api/internal/live-orders');
      showList(data.orders);
      status.textContent='Consulta realizada. Nenhuma informação foi salva no navegador.';
    } catch {
      clearSession();
      status.textContent='Acesso não autorizado ou servidor indisponível.';
    } finally {button.disabled=false;}
  });
  copy.addEventListener('click',async()=>{
    if(!currentAddress)return;
    try{
      await navigator.clipboard.writeText(currentAddress);
      status.textContent='Endereço copiado. Use-o somente para o pedido correspondente na VAVI.';
    }catch{
      status.textContent='Seu navegador não permitiu copiar. Selecione o texto manualmente.';
    }
  });
  window.addEventListener('pagehide',clearSession);
})();
