import {CatalogError} from './catalog.js';

const VAVI_BASE = 'https://api.printbee.com.br';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMBER = n => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function normalizeZip(zip) {
  if (typeof zip !== 'string' || !/^\d{5}-?\d{3}$/.test(zip.trim())) {
    throw new CatalogError('invalid_zip', 'Informe um CEP válido de oito dígitos.', 422);
  }
  return zip.replace('-', '');
}

// Este cadastro técnico é uma configuração privada do Worker, nunca enviada pelo navegador.
// Sem as dimensões reais e custo de fornecimento, a cotação deve permanecer bloqueada.
export function shippingPayload(zipCode, lines, rawConfig) {
  let config;
  try { config = JSON.parse(rawConfig); } catch {
    throw new CatalogError('shipping_not_configured', 'Logística ainda não configurada.', 503);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new CatalogError('shipping_not_configured', 'Logística ainda não configurada.', 503);
  }
  let amount = 0, weight = 0, height = 0, width = 0, length = 0;
  const compositions = [];
  for (const line of lines) {
    const item = config[line.sku];
    if (!item || !UUID.test(item.id || '') || typeof item.sku !== 'string' ||
        !NUMBER(item.amount) || !NUMBER(item.weight) || !NUMBER(item.height) ||
        !NUMBER(item.width) || !NUMBER(item.length)) {
      throw new CatalogError('shipping_product_unverified', 'Produto ainda sem dados de frete conferidos.', 409);
    }
    const units = line.quantity;
    // Valores em BRL e medidas em kg/mm, conforme contrato da VAVI.
    compositions.push({id:item.id,sku:item.sku,amount:item.amount,quantity:units,
      weight:item.weight,height:item.height,width:item.width,length:item.length});
    amount += item.amount * units;
    weight += item.weight * units;
    height = Math.max(height,item.height);
    width = Math.max(width,item.width);
    length += item.length * units; // estimativa conservadora: exige conferência de embalagem real
  }
  return {zipCode,amount:Number(amount.toFixed(2)),weight:Number(weight.toFixed(3)),
    height,width,length,compositions};
}

async function postVavi(path, payload, token, timeoutMs=8000) {
  const res = await fetch(VAVI_BASE+path,{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json',
      ...(token?{'Authorization':'Bearer '+token}:{})},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new CatalogError('shipping_provider_unavailable',
    'Não foi possível consultar a transportadora.',503);
  return res.json();
}

function safeQuote(option) {
  if (!option || typeof option !== 'object' ||
      typeof option.id !== 'string' || typeof option.name !== 'string' ||
      !Number.isFinite(option.shippingCost) || option.shippingCost < 0 ||
      !Number.isInteger(option.deliveryTime) || option.deliveryTime < 0) return null;
  return {id:option.id,name:option.name,companyName:option.companyName || '',
    shippingCost:option.shippingCost,deliveryTime:option.deliveryTime,
    estimatedDeliveryDate:option.estimatedDeliveryDate || null,
    message:option.message || '',isActive:option.isActive===true};
}

export async function simulateVaviShipping(env,zipCode,lines) {
  if (!env.VAVI_CLIENT_ID || !env.VAVI_CLIENT_SECRET ||
      !env.VAVI_SHIPPING_PRODUCTS_JSON) {
    throw new CatalogError('shipping_not_configured','Cotação VAVI ainda não configurada.',503);
  }
  const payload = shippingPayload(zipCode,lines,env.VAVI_SHIPPING_PRODUCTS_JSON);
  let auth;
  try {
    auth=await postVavi('/api/Auth/Token',{grantType:'client_credentials',
      clientId:env.VAVI_CLIENT_ID,clientSecret:env.VAVI_CLIENT_SECRET,expires:1},null);
  } catch(e) {
    if(e instanceof CatalogError) throw e;
    throw new CatalogError('shipping_provider_unavailable','Cotação temporariamente indisponível.',503);
  }
  const token=auth?.data?.access_token;
  if (typeof token !== 'string' || !token) {
    throw new CatalogError('shipping_provider_unavailable','Autenticação de frete indisponível.',503);
  }
  let response;
  try { response=await postVavi('/api/Customers/Simulate',payload,token); }
  catch(e) {
    if(e instanceof CatalogError) throw e;
    throw new CatalogError('shipping_provider_unavailable','Cotação temporariamente indisponível.',503);
  }
  if (!Array.isArray(response?.data)) throw new CatalogError('shipping_provider_unavailable',
    'Resposta de frete inesperada.',503);
  return response.data.map(safeQuote).filter(Boolean).filter(x=>x.isActive);
}
