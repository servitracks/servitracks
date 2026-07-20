import { Configuration, AuthenticationApi, TaxSequencesApi, ECFSubmissionApi } from '@pronesoft-rd/ecf-sdk';

const SANDBOX_BASE_PATH = 'https://api.ecf.sandbox.pronesoft.com/api/v1';
const PRODUCTION_BASE_PATH = 'https://api.ecf.pronesoft.com/api/v1';

export function getEcfBasePath(environment: 'sandbox' | 'production') {
  return environment === 'production' ? PRODUCTION_BASE_PATH : SANDBOX_BASE_PATH;
}

// ── Token Cache (válido 24h, renovamos a las 23h por seguridad) ──
let cachedToken: { token: string; expiresAt: number; key: string } | null = null;

export async function getEcfToken(clientId: string, clientSecret: string, environment: 'sandbox' | 'production'): Promise<string> {
  const cacheKey = `${clientId}:${environment}`;
  
  // Retornar token cacheado si aún es válido
  if (cachedToken && cachedToken.key === cacheKey && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

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
  
  // Cache por 23 horas (token dura 24h)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    key: cacheKey,
  };

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

// ── Consultar estado de un documento ya enviado ──
export async function getEcfStatus(token: string, environment: 'sandbox' | 'production', documentId: string) {
  const api = new ECFSubmissionApi(getEcfConfig(token, environment));
  return api.getEcfStatus({
    environment: environment === 'sandbox' ? 'TesteCF' : 'eCF' as any,
    id: documentId,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILDER: Construye el ElectronicDocument con la estructura exacta del SDK
// ══════════════════════════════════════════════════════════════════════════════

/** Mapea el método de pago del POS al código DGII */
function payMethodToEcf(method: string): string {
  switch (method) {
    case 'cash':     return '1'; // Efectivo
    case 'card':     return '3'; // Tarjeta de Crédito/Débito
    case 'transfer': return '5'; // Transferencia bancaria
    case 'credit':   return '4'; // Crédito (a plazos)
    default:         return '1';
  }
}

/** Determina paymentType DGII: 1=Contado, 2=Crédito, 3=Mixto */
function getPaymentType(method: string): string {
  return method === 'credit' ? '2' : '1';
}

export interface BuildEcfPayloadParams {
  /** "31" crédito fiscal, "32" consumo, "33" nota débito, "34" nota crédito */
  invoiceType: string;
  /** Items del carrito */
  items: {
    name: string;
    quantity: number;
    /** Precio de venta con ITBIS incluido */
    salePrice: number;
    /** Tasa de impuesto (ej: 0.18 para 18%) — 0 si exento */
    tax: number;
    /** "Servicios" para servicios, cualquier otro para bienes */
    category?: string;
  }[];
  /** Subtotal (sin ITBIS) */
  subtotal: number;
  /** ITBIS total */
  itbis: number;
  /** Total con ITBIS */
  total: number;
  /** Método de pago del POS: 'cash' | 'card' | 'transfer' | 'credit' */
  payMethod: string;
  /** Datos del emisor (taller) */
  issuer: {
    rnc?: string;
    businessName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  /** Datos del comprador (solo para crédito fiscal) */
  buyer?: {
    rnc?: string;
    name?: string;
  };
}

/**
 * Construye el objeto ElectronicDocument con la estructura exacta que espera
 * el SDK de Pronesoft / la DGII.
 * 
 * Referencia: @pronesoft-rd/ecf-sdk → models/ElectronicDocument.ts
 * Ejemplo oficial: docs/ECFSubmissionApi.md → submitEcf
 */
export function buildElectronicDocument(params: BuildEcfPayloadParams): any {
  const { invoiceType, items, subtotal, itbis, total, payMethod, issuer, buyer } = params;

  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  // ── Items con estructura correcta para el SDK ──
  const ecfItems = items.map((item, index) => {
    const taxRate = item.tax || 0;
    // Precio unitario SIN ITBIS (la DGII requiere precio base)
    const unitPriceBase = taxRate > 0
      ? item.salePrice / (1 + taxRate)
      : item.salePrice;

    return {
      lineNumber: index + 1,
      name: item.name,
      quantity: item.quantity,
      unitPrice: parseFloat(unitPriceBase.toFixed(2)),
      unitOfMeasure: 1, // 1 = Unidad
      // 1 = Bien, 2 = Servicio
      type: item.category === 'Servicios' ? '2' : '1',
      // 1 = Facturación normal
      billingIndicator: '1',
    };
  });

  // ── Totales con desglose fiscal que la DGII requiere ──
  const ecfTotals: any = {
    totalAmount: parseFloat(total.toFixed(2)),
  };

  if (itbis > 0) {
    ecfTotals.taxableAmount = parseFloat(subtotal.toFixed(2));
    ecfTotals.totalITBIS = parseFloat(itbis.toFixed(2));
    ecfTotals.exemptAmount = 0;
  } else {
    ecfTotals.taxableAmount = 0;
    ecfTotals.exemptAmount = parseFloat(subtotal.toFixed(2));
    ecfTotals.totalITBIS = 0;
  }

  // ── Documento principal ──
  const doc: any = {
    invoiceType,
    issueDate: today,
    paymentType: getPaymentType(payMethod),
    incomeType: '01', // 01 = Ingresos por operaciones (el estándar para talleres)
    taxedAmountIndicator: '0', // 0 = Montos no incluyen ITBIS (precio base)

    // Datos del emisor (taller)
    ...(issuer.rnc && { issuerRNC: issuer.rnc.replace(/\D/g, '') }),
    ...(issuer.businessName && { issuerBusinessName: issuer.businessName }),
    ...(issuer.address && { issuerAddress: issuer.address }),
    ...(issuer.phone && { issuerPhones: [issuer.phone] }),
    ...(issuer.email && { issuerEmail: issuer.email }),

    // Items y totales
    items: ecfItems,
    totals: ecfTotals,

    // Forma de pago
    paymentForms: [{
      method: payMethodToEcf(payMethod),
      amount: parseFloat(total.toFixed(2)),
    }],
  };

  // ── Buyer (solo para crédito fiscal — tipo 31) ──
  if (invoiceType === '31' && buyer?.rnc) {
    doc.buyer = {
      taxId: buyer.rnc.replace(/\D/g, ''),
      name: buyer.name || 'Contribuyente',
    };
  }

  return doc;
}
