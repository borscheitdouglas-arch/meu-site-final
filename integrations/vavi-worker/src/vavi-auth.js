import {CatalogError} from './catalog.js';

const TOKEN_URL='https://api.printbee.com.br/api/Auth/Token';

/**
 * API VAVI: clientId pb_... + clientSecret -> access_token temporário.
 * Nunca armazenar JWT nem refresh token em banco, log ou frontend.
 * Para cada rascunho, solicitar um token novo usando client_credentials,
 * evitando problemas de refresh token de uso único.
 */
export async function obtainVaviAccessToken(env,fetchImpl=fetch) {
  const clientId=env?.VAVI_CLIENT_ID;
  const clientSecret=env?.VAVI_CLIENT_SECRET;
  if(typeof clientId!=='string' || !clientId ||
     typeof clientSecret!=='string' || !clientSecret)
    throw new CatalogError('vavi_credentials_missing','Credenciais VAVI indisponíveis.',503);

  let response;
  try {
    response=await fetchImpl(TOKEN_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({grantType:'client_credentials',
        clientId,clientSecret,expires:1}),
      signal:AbortSignal.timeout(8000)
    });
  }catch{
    throw new CatalogError('vavi_auth_unavailable','Autenticação VAVI indisponível.',503);
  }
  if(!response?.ok)
    throw new CatalogError('vavi_auth_failed','Credenciais VAVI não autorizadas.',503);
  let data;
  try{data=await response.json()}catch{
    throw new CatalogError('vavi_auth_invalid','Resposta de autenticação inválida.',503);
  }
  const accessToken=data?.data?.access_token;
  if(typeof accessToken!=='string' || !accessToken.trim() ||
     accessToken.length>8192)
    throw new CatalogError('vavi_auth_invalid','Token VAVI inválido.',503);
  return accessToken;
}
