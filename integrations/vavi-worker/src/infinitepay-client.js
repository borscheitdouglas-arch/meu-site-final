import {CatalogError} from './catalog.js';

const API='https://api.checkout.infinitepay.io/links';
// A InfinitePay documenta o checkout.infinitepay.com.br e também publica links oficiais em pay.infinitepay.io.
// O host deve coincidir EXATAMENTE: nunca aceitar subdomínios arbitrários ou HTTP.
const CHECKOUT_HOSTS=new Set(['checkout.infinitepay.com.br','pay.infinitepay.io']);
const ORDER_ID=/^ord_[a-f0-9]{32}$/;

export function isInfinitePayCheckoutUrl(value) {
  try {
    const u=new URL(value);
    return typeof value==='string' && u.protocol==='https:' &&
      CHECKOUT_HOSTS.has(u.hostname) && !u.port && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Cobrança criada somente no servidor, com total conferido pelo catálogo e frete VAVI. */
export async function createInfinitePayCheckout({
  order,lines,shippingCents,buyer,apiKey,siteBaseUrl,webhookUrl,fetchImpl=fetch
}) {
  if (!ORDER_ID.test(order?.id||'') || order?.status!=='draft' ||
      !Number.isSafeInteger(order.totalCents) || order.totalCents<100 ||
      !apiKey?.startsWith('inchk_') || !Array.isArray(lines) || !lines.length ||
      !Number.isSafeInteger(shippingCents) || shippingCents<0)
    throw new CatalogError('infinitepay_not_ready','Pagamento não configurado.',503);
  const items=lines.map(line=>({
    description:String(line.name+' — '+line.variation).slice(0,200),
    quantity:line.quantity,price:line.unitPriceCents
  }));
  if (items.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1||
       !Number.isSafeInteger(i.price)||i.price<1) ||
      lines.reduce((n,line)=>n+line.quantity*line.unitPriceCents,0)+shippingCents!==order.totalCents)
    throw new CatalogError('checkout_total_mismatch','Total do pedido inválido.',409);
  if (shippingCents>0)items.push({description:'Frete',quantity:1,price:shippingCents});
  const site=new URL(siteBaseUrl),hook=new URL(webhookUrl);
  if(site.protocol!=='https:'||hook.protocol!=='https:')
    throw new CatalogError('infinitepay_not_ready','URLs de integração inválidas.',503);
  const address={
    cep:buyer.zipCode,street:buyer.street,number:buyer.number,
    neighborhood:buyer.neighborhood,city:buyer.city,state:buyer.state
  };
  if(buyer.complement)address.complement=buyer.complement;
  const phoneDigits=String(buyer.phone||'').replace(/\D/g,'');
  const phone=phoneDigits.startsWith('55')?('+'+phoneDigits):('+55'+phoneDigits);
  const payload={
    order_nsu:order.id,
    items,
    redirect_url:site.origin+'/pages/resultado-pagamento.html',
    webhook_url:hook.href,
    customer:{name:buyer.name,email:buyer.email,phone_number:phone},
    address,
    options:{
      assured_installments:3,
      require_delivery_address:false,
      single_payment:true,
      valid_until:new Date(Date.now()+30*60*1000).toISOString(),
      payment_methods_enabled:['credit_card','pix']
    }
  };
  let response;
  try {
    response=await fetchImpl(API,{
      method:'POST',
      headers:{'X-Api-Key':apiKey,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(10000)
    });
  }catch{
    throw new CatalogError('infinitepay_connection_failed','InfinitePay indisponível.',503);
  }
  if(!response?.ok){
    const httpStatus=Number.isInteger(response?.status)?response.status:0;
    // Nenhum dado de cartão, chave ou resposta com PII é armazenado/exposto.
    const code=[401,403].includes(httpStatus)?'infinitepay_auth_failed':
      [400,422].includes(httpStatus)?'infinitepay_request_rejected':
      'infinitepay_provider_unavailable';
    const error=new CatalogError(code,'A InfinitePay não iniciou o pagamento.',502);
    error.providerHttpStatus=httpStatus;
    throw error;
  }
  let result;
  try{result=await response.json()}catch{
    throw new CatalogError('infinitepay_response_invalid','Resposta inválida do checkout.',502);
  }
  if(!isInfinitePayCheckoutUrl(result?.url)) {
    const error=new CatalogError('infinitepay_response_invalid','URL de checkout inválida.',502);
    // Só o host público é registrado para diagnóstico; nunca armazenar
    // URL completa, parâmetros, pedido, comprador ou API Key.
    try {
      const parsed=typeof result?.url==='string'?new URL(result.url):null;
      if(parsed && /^[a-z0-9.-]{1,120}$/.test(parsed.hostname))
        error.providerUrlHostname=parsed.hostname;
      else error.providerUrlHostname='missing_or_invalid';
    }catch{error.providerUrlHostname='missing_or_invalid';}
    throw error;
  }
  return {checkoutUrl:result.url};
}
