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
  const registerPanel=document.getElementById('vavi-registration-panel');
  const registerForm=document.getElementById('vavi-registration-form');
  const vaviIdInput=document.getElementById('vavi-order-id');
  const registerStatus=document.getElementById('vavi-registration-status');
  const launchPanel=document.getElementById('launch-panel');
  const launchChecks=document.getElementById('launch-checks');
  const launchValidation=document.getElementById('launch-validation');
  const refreshLaunch=document.getElementById('refresh-launch');
  if(![form,input,status,listPanel,list,detailPanel,detail,copy,hide,clear,
      registerPanel,registerForm,vaviIdInput,registerStatus,
      launchPanel,launchChecks,launchValidation,refreshLaunch].every(Boolean))return;

  let adminKey='';
  let currentAddress='';
  let currentOrderId='';
  const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
  function clearDetails(){
    detail.textContent='';
    currentAddress='';
    currentOrderId='';
    registerPanel.hidden=true;
    vaviIdInput.value='';
    registerStatus.textContent='';
    detailPanel.hidden=true;
  }
  function clearSession(){
    adminKey='';input.value='';
    list.replaceChildren();
    listPanel.hidden=true;
    launchChecks.replaceChildren();
    launchValidation.replaceChildren();
    launchPanel.hidden=true;
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
  async function request(path,options={}){
    if(!adminKey || adminKey.length<32)throw new Error('unauthorized');
    const sendBody=options.body!==undefined;
    const response=await fetch(API+path,{
      method:options.method||'GET',
      headers:{
        'Authorization':'Bearer '+adminKey,
        ...(sendBody?{'Content-Type':'application/json'}:{})
      },
      ...(sendBody?{body:JSON.stringify(options.body)}:{}),
      cache:'no-store',
      mode:'cors',
      credentials:'omit',
      signal:AbortSignal.timeout(18000)
    });
    if(!response.ok)throw new Error('http_'+response.status);
    return response.json();
  }
  function renderLaunch(report){
    launchChecks.replaceChildren();
    launchValidation.replaceChildren();
    launchPanel.hidden=false;
    const overview=report?.checkoutEnabled===true
      ? 'Checkout habilitado no servidor. Confira também os testes operacionais.'
      : 'Checkout ainda bloqueado. Confira os itens pendentes abaixo.';
    launchChecks.append(text('p',overview,report?.checkoutEnabled===true?'':'warning'));
    if(!Array.isArray(report?.checks)||!Array.isArray(report.operationalValidations)){
      launchChecks.append(text('p','Não foi possível interpretar o diagnóstico.'));return;
    }
    for(const check of report.checks){
      if(typeof check.label!=='string'||typeof check.detail!=='string')continue;
      const item=document.createElement('p');
      item.append(text('strong',(check.ok===true?'✓ ':'○ ')+check.label+' — '));
      item.append(text('span',check.detail));
      launchChecks.append(item);
    }
    const ul=document.createElement('ul');
    for(const validation of report.operationalValidations){
      if(typeof validation!=='string')continue;
      ul.append(text('li',validation));
    }
    launchValidation.append(ul);
  }
  async function reloadLaunch(){
    if(!adminKey)return;
    refreshLaunch.disabled=true;
    try{
      const report=await request('/api/internal/launch-readiness');
      renderLaunch(report);
    }catch{
      launchPanel.hidden=false;
      launchChecks.replaceChildren(text('p','Diagnóstico de lançamento indisponível. O checkout continua protegido.'));
    }finally{refreshLaunch.disabled=false;}
  }
  refreshLaunch.addEventListener('click',reloadLaunch);
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
      const order=result.order;
      currentOrderId=id;
      registerPanel.hidden=order.status!=='paid'||Boolean(order.vavi_order_id);
      registerStatus.textContent=order.vavi_order_id
        ? 'Já registrado na VAVI: '+String(order.vavi_order_id)
        : 'Crie o pedido na VAVI antes de registrá-lo aqui.';
      status.textContent='Dados carregados. Confira o pedido e o endereço.';
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
      item.append(text('p','Criado em: '+String(order.created_at||'')+
        (order.vavi_order_id?' · VAVI: '+String(order.vavi_order_id):''),'muted'));
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
      await reloadLaunch();
      status.textContent='Consulta realizada. Nenhuma informação foi salva no navegador.';
    } catch {
      clearSession();
      status.textContent='Acesso não autorizado ou servidor indisponível.';
    } finally {button.disabled=false;}
  });
  registerForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const id=currentOrderId, vaviOrderId=vaviIdInput.value.trim();
    if(!/^ord_[0-9a-f]{32}$/.test(id)||!adminKey){
      registerStatus.textContent='Entre novamente e escolha um pedido pago.';return;
    }
    if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(vaviOrderId)){
      registerStatus.textContent='Informe um identificador de pedido VAVI válido.';return;
    }
    if(!window.confirm('Você já CRIOU o pedido '+vaviOrderId+' na VAVI e conferiu seu pagamento e endereço?'))return;
    const button=document.getElementById('vavi-register-button');
    button.disabled=true;registerStatus.textContent='Registrando identificação VAVI...';
    try{
      const recorded=await request('/api/internal/live-orders/'+id+'/fulfillment',{
        method:'POST',body:{vaviOrderId}
      });
      const data=await request('/api/internal/live-orders');
      showList(data.orders);
      status.textContent=recorded.alreadyRegistered
        ? 'Pedido já constava como registrado na VAVI.'
        : 'Identificador VAVI registrado. O pedido não será marcado como novo novamente.';
    }catch{
      registerStatus.textContent='Não foi possível registrar. Confira se o pedido já está registrado ou contate o suporte.';
    }finally{button.disabled=false;}
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
