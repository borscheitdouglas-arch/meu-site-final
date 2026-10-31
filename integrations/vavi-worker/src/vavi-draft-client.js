import {CatalogError} from './catalog.js';

const ROOT='https://api.printbee.com.br';
/**
 * VAVI integration order API receives a DRAFT (HTTP 202).
 * This client must only be invoked by a verified, idempotent paid-order
 * backend flow; there is intentionally no public route calling it.
 */
export async function createVaviDraft({payload,accessToken,approvedPayment,
  fetchImpl=fetch}) {
  if (!approvedPayment || approvedPayment.status!=='paid' ||
      !/^[A-Za-z0-9_-]{8,90}$/.test(approvedPayment.orderId||'') ||
      typeof accessToken!=='string' || !accessToken ||
      !payload || typeof payload!=='object' || Array.isArray(payload) ||
      typeof payload.code!=='string' || payload.code!==approvedPayment.orderId ||
      !Array.isArray(payload.items) || payload.items.length===0 ||
      !payload.items.every(x=>x && typeof x.name==='string' && x.name.trim() &&
        Number.isInteger(x.quantity) && x.quantity>=1)) {
    throw new CatalogError('vavi_draft_not_ready',
      'Rascunho VAVI bloqueado: pedido ainda não foi validado.',409);
  }
  let response;
  try {
    response=await fetchImpl(ROOT+'/api/Customers/Integrations/Orders',{
      method:'POST',
      headers:{Authorization:'Bearer '+accessToken,
        'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(10000)
    });
  } catch {
    throw new CatalogError('vavi_unavailable','VAVI temporariamente indisponível.',503);
  }
  if (response.status!==202) {
    throw new CatalogError('vavi_draft_rejected',
      'A VAVI não confirmou a criação do rascunho.',503);
  }
  let data;
  try { data=await response.json(); } catch {
    throw new CatalogError('vavi_invalid_response',
      'Não foi possível confirmar o rascunho.',503);
  }
  // HTTP 202 também pode indicar falha de normalização (status Failed).
  // Somente um rascunho identificável e não reprovado é considerado recebido.
  const result=data?.data;
  const allowed=new Set(['Pending','Reviewing','Ready','Converted']);
  if(data?.code!==202 || !result ||
      typeof result.draftId!=='string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.draftId) ||
      !allowed.has(result.status)){
    throw new CatalogError('vavi_draft_requires_review',
      'Rascunho não foi confirmado como utilizável na VAVI.',503);
  }
  return {status:'vavi_draft',response:data};
}
