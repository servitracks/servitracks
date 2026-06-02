import { Configuration, AuthenticationApi, TaxSequencesApi, ECFSubmissionApi } from '@pronesoft-rd/ecf-sdk';

const SANDBOX_BASE_PATH = 'https://api.ecf.sandbox.pronesoft.com/api/v1';
const PRODUCTION_BASE_PATH = 'https://api.ecf.pronesoft.com/api/v1';

export function getEcfBasePath(environment: 'sandbox' | 'production') {
  return environment === 'production' ? PRODUCTION_BASE_PATH : SANDBOX_BASE_PATH;
}

export async function getEcfToken(clientId: string, clientSecret: string, environment: 'sandbox' | 'production'): Promise<string> {
  // Using native fetch to get the token because the SDK OAuth flow requires setting token manually
  const basePath = getEcfBasePath(environment);
  
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('client_id', clientId);
  body.append('client_secret', clientSecret);

  const response = await fetch(`${basePath}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || 'Error al obtener token de Pronesoft');
  }

  const data = await response.json();
  return data.access_token;
}

export function getEcfConfig(token: string, environment: 'sandbox' | 'production') {
  return new Configuration({
    basePath: getEcfBasePath(environment),
    accessToken: token,
  });
}

export async function fetchTaxSequences(token: string, environment: 'sandbox' | 'production') {
  const api = new TaxSequencesApi(getEcfConfig(token, environment));
  return api.listTaxSequences();
}

export async function createTaxSequence(token: string, environment: 'sandbox' | 'production', payload: any) {
  const api = new TaxSequencesApi(getEcfConfig(token, environment));
  return api.createTaxSequence({ createTaxSequenceRequest: payload });
}

export async function submitInvoiceToDGII(token: string, environment: 'sandbox' | 'production', document: any) {
  const api = new ECFSubmissionApi(getEcfConfig(token, environment));
  return api.submitEcf({
    environment: environment === 'sandbox' ? 'TesteCF' : 'eCF' as any,
    electronicDocument: document
  });
}
