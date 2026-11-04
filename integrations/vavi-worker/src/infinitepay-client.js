import {CatalogError} from './catalog.js';

const API='https://api.checkout.infinitepay.io/links';
const CHECKOUT_HOST='checkout.infinitepay.com.br';
const ORDER_ID=/^ord_[a-f0-9]{32}$/;

export function isInfinitePayCheckoutUrl(value) {
  try {
    const u=new URL(value);
    return u.protocol==='https:' && u.hostname===CHECKOUT_HOST && !u.username && !u.password;
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
    throw new CatalogError('payment_provider_unavailable','InfinitePay indisponível.',503);
  }
  if(!response?.ok)throw new CatalogError('payment_provider_unavailable',
    'InfinitePay não iniciou o pagamento.',503);
  let result;
  try{result=await response.json()}catch{
    throw new CatalogError('payment_provider_unavailable','Resposta inválida do checkout.',503);
  }
  if(!isInfinitePayCheckoutUrl(result?.url))
    throw new CatalogError('payment_provider_unavailable','URL de checkout inválida.',503);
  return {checkoutUrl:result.url};
}
