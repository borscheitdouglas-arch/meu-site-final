/**
 * Cliente VAVI isolado e SEM rota HTTP pública.
 * Só deverá ser invocado futuramente após pagamento aprovado e pedido persistido.
 * Campos do corpo do pedido baseados no contrato da documentação v1.1.2.
 */
const API = 'https://api.printbee.com.br';
class VaviError extends Error {
  constructor(message, status) { super(message); this.name = 'VaviError'; this.status = status; }
}
function hasText(value) { return typeof value === 'string' && value.trim().length > 0; }
function checkCredentials(env) {
  if (!hasText(env?.VAVI_CLIENT_ID) || !hasText(env?.VAVI_CLIENT_SECRET)) {
    throw new VaviError('Credenciais VAVI ausentes.');
  }
}
export async function getToken(env, fetcher = fetch) {
  checkCredentials(env);
  const res = await fetcher(API + '/api/Auth/Token', {
    method:'POST',
    headers:{'Accept':'application/json','Content-Type':'application/json'},
    body:JSON.stringify({
      grantType:'client_credentials',
      clientId:env.VAVI_CLIENT_ID,
      clientSecret:env.VAVI_CLIENT_SECRET,
      expires:1
    })
  });
  if (!res.ok) throw new VaviError('Falha na autenticação VAVI.', res.status);
  const result = await res.json();
  const token = result?.data?.access_token;
  if (!hasText(token)) throw new VaviError('Token VAVI ausente na resposta.');
  return token;
}
export function buildDraft(order) {
  if (!order || order.payment_status !== 'approved' || order.amount_verified !== true) {
    throw new VaviError('Pedido não possui pagamento verificado.');
  }
  if (!hasText(order.code) || !Array.isArray(order.items) || order.items.length < 1) {
    throw new VaviError('Pedido sem código ou itens.');
  }
  if (!order.buyer || !hasText(order.buyer.name) ||
      !hasText(order.buyer.phone) || !hasText(order.buyer.taxId) ||
      !hasText(order.buyer.zipCode) || !hasText(order.buyer.street) ||
      !hasText(order.buyer.number) || !hasText(order.buyer.city) ||
      !hasText(order.buyer.state)) {
    throw new VaviError('Dados do destinatário incompletos.');
  }
  const items = order.items.map(item => {
    if (!hasText(item.name) || !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 1) {
      throw new VaviError('Item do pedido inválido.');
    }
    return {
      name:item.name,
      sku:hasText(item.sku) ? item.sku : undefined,
      quantity:item.quantity,
      unitPrice:item.unitPriceCents / 100,
      properties:Array.isArray(item.properties) ? item.properties : []
    };
  });
  return {
    code:order.code,
    requestClientId:hasText(order.internalId) ? order.internalId : undefined,
    buyer:{
      name:order.buyer.name,email:order.buyer.email || undefined,
      phone:order.buyer.phone,taxId:order.buyer.taxId,
      zipCode:order.buyer.zipCode,street:order.buyer.street,
      number:order.buyer.number,complement:order.buyer.complement || '',
      neighborhood:order.buyer.neighborhood || '',
      city:order.buyer.city,state:order.buyer.state,country:'BR'
    },
    status:'paid',
    freightAmount:order.shippingCents / 100,
    paidAmount:order.paidCents / 100,
    items
  };
}
export async function sendDraft({env,order,fetcher = fetch}) {
  if (!Number.isSafeInteger(order?.shippingCents) || order.shippingCents < 0 ||
      !Number.isSafeInteger(order?.paidCents) || order.paidCents < 1) {
    throw new VaviError('Pedido sem valores conciliados.');
  }
  const body = buildDraft(order);
  const token = await getToken(env,fetcher);
  const res = await fetcher(API + '/api/Customers/Integrations/Orders', {
    method:'POST',
    headers:{'Accept':'application/json','Content-Type':'application/json','Authorization':'Bearer ' + token},
    body:JSON.stringify(body)
  });
  if (res.status !== 202) {
    throw new VaviError('A VAVI não confirmou o recebimento do rascunho.',res.status);
  }
  const payload = await res.json();
  if (!hasText(payload?.data?.draftId)) throw new VaviError('ID do rascunho ausente.');
  return {draftId:payload.data.draftId,status:payload.data.status || 'Pending'};
}
