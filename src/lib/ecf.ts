/**
 * Integración Oficial con EF2 (Facturación Electrónica DGII - República Dominicana)
 * Documentación oficial: https://doc.ef2.do/
 */

export const EF2_BASE_URL = "https://master.ef2.do/api2";
export const EF2_DEFAULT_TEST_USERNAME = "api_2buy_mliec4sb";
export const EF2_DEFAULT_TEST_TOKEN = "tok_e0f3065a8a7df34785d30b744bf4715b3c3b96759a1a7ca19f354817e4471e2e";
export const EF2_DEFAULT_TEST_RNC = "132596161";
export const EF2_DEFAULT_TEST_EMPRESA = "2BUY ELECTRONICS AND SERVICES SRL";

export type EF2Environment = "TesteCF" | "CerteCF" | "eCF";

export interface EF2TipoECF {
  id: number | string;
  codigo: string;
  nombre: string;
  prefijo: string;
  estado?: boolean;
}

export interface EF2SecuenciaRango {
  id: number;
  tipo_ecf_id?: number;
  prefijo: string;
  desde: number;
  hasta: number;
  secuencia_actual: number;
  total_secuencias?: number;
  secuencias_usadas?: number;
  secuencias_disponibles?: number;
  porcentaje_uso?: number;
  fecha_vencimiento?: string;
  estado: boolean | number;
  tipo_codigo?: string;
  tipo_nombre?: string;
  disponibles?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EF2DGIIInfo {
  track_id?: string;
  fecha_recepcion?: string;
  estado?: string;
  mensaje?: string;
  [key: string]: unknown;
}

export interface EF2ProcesarFacturaResponse {
  success: boolean;
  message?: string;
  error?: string;
  ncf?: string;
  estado?: string;
  qr_link?: string;
  pdf_cloud_url?: string;
  xml_cloud_url?: string;
  consulta_url?: string;
  id_factura?: number | string;
  fecha_emision?: string;
  fecha_firma?: string;
  codigo_seguridad?: string;
  monto_total?: number | string;
  dgii_info?: EF2DGIIInfo;
  raw?: Record<string, unknown>;
  contingencyMode?: boolean;
}

/** Resuelve la URL base adecuada según si corre en navegador (con proxy Vite) o directo */
export function getEf2ApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Si estamos en el navegador en entorno de desarrollo/producción con proxy
    return "/api/ef2";
  }
  return EF2_BASE_URL;
}

/** Realiza peticiones a la API de EF2 con manejo de errores y fallbacks */
export async function callEf2Api<T = any>(
  path: string,
  token: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const cleanToken = token?.trim() || EF2_DEFAULT_TEST_TOKEN;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getEf2ApiBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cleanToken}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (method !== "GET" && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${normalizedPath}`, options);
  } catch (err: any) {
    // Si falla el proxy relativo en browser, intentar directo contra EF2 master
    if (baseUrl !== EF2_BASE_URL) {
      try {
        response = await fetch(`${EF2_BASE_URL}${normalizedPath}`, options);
      } catch (directErr: any) {
        throw new Error(
          `No se pudo conectar con el servidor de EF2: ${directErr.message || err.message}`
        );
      }
    } else {
      throw new Error(`Error de conexión con EF2: ${err.message}`);
    }
  }

  const text = await response.text();
  let data: any;

  try {
    // EF2 puede responder texto o JSON con warnings de PHP
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      data = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } else {
      data = text ? JSON.parse(text) : {};
    }
  } catch {
    data = { success: response.ok, message: text || `HTTP ${response.status}` };
  }

  if (!response.ok || data.success === false) {
    const errorMsg =
      data.message || data.error || data.detail || `Error en EF2 (HTTP ${response.status})`;
    const error = new Error(errorMsg) as Error & { status?: number; data?: any };
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// ─── Secuencias e-NCF directas desde EF2 ─────────────────────────────────────

/** 1. Consultar Tipos de e-CF disponibles en EF2 */
export async function fetchEf2Tipos(
  token: string,
  soloEmpresa = false
): Promise<{ success: boolean; data: EF2TipoECF[] }> {
  const query = soloEmpresa ? "?resource=tipos_ecf&filter=empresa" : "?resource=tipos_ecf";
  return callEf2Api(`/ecf_secuencia_api.php${query}`, token, "GET");
}

/** 2. Listar todas las secuencias registradas para la empresa en EF2 */
export async function fetchEf2Sequences(
  token: string
): Promise<{ success: boolean; data: EF2SecuenciaRango[] }> {
  return callEf2Api("/ecf_secuencia_api.php", token, "GET");
}

/** 3. Consultar continuidad y max_hasta para un prefijo (ej: E31) */
export async function fetchEf2PrefixContinuity(
  token: string,
  prefijo: string
): Promise<{ success: boolean; data: { max_hasta: number; rango_activo?: any } }> {
  return callEf2Api(
    `/ecf_secuencia_api.php?prefijo=${encodeURIComponent(prefijo)}`,
    token,
    "GET"
  );
}

/** 4. Consultar disponibilidad total y advertencias de secuencias para un prefijo */
export async function fetchEf2PrefixAvailability(
  token: string,
  prefijo: string
): Promise<{ success: boolean; data: { disponibilidad_total: number; rangos_activos: number; advertencia?: string } }> {
  return callEf2Api(
    `/ecf_secuencia_api.php?disponibilidad_prefijo=${encodeURIComponent(prefijo)}`,
    token,
    "GET"
  );
}

/** 5. Crear un nuevo rango de secuencias en EF2 */
export async function createEf2Sequence(
  token: string,
  data: {
    tipo_ecf_id: number;
    prefijo: string;
    desde: number;
    hasta: number;
    secuencia_actual?: number;
    fecha_vencimiento?: string;
    estado?: boolean;
  }
): Promise<{ success: boolean; message?: string; data?: EF2SecuenciaRango }> {
  const payload = {
    tipo_ecf_id: Number(data.tipo_ecf_id),
    prefijo: data.prefijo.toUpperCase(),
    desde: Number(data.desde),
    hasta: Number(data.hasta),
    secuencia_actual: Number(data.secuencia_actual || 0),
    fecha_vencimiento: data.prefijo === "E32" ? undefined : data.fecha_vencimiento,
    estado: data.estado !== false,
  };
  return callEf2Api("/ecf_secuencia_api.php", token, "POST", payload);
}

/** 6. Actualizar un rango existente en EF2 (activar/desactivar o ajustar secuencia) */
export async function updateEf2Sequence(
  token: string,
  data: {
    id: number;
    estado?: boolean;
    secuencia_actual?: number;
    hasta?: number;
    fecha_vencimiento?: string;
  }
): Promise<{ success: boolean; message?: string; data?: any }> {
  return callEf2Api("/ecf_secuencia_api.php", token, "PUT", data);
}

/** 7. Eliminar un rango en EF2 (requiere estar inactivo primero) */
export async function deleteEf2Sequence(
  token: string,
  id: number
): Promise<{ success: boolean; message?: string }> {
  // Aseguramos primero desactivarlo por regla de EF2
  try {
    await updateEf2Sequence(token, { id, estado: false });
  } catch {}
  return callEf2Api("/ecf_secuencia_api.php", token, "DELETE", { id });
}

/** 8. Verificar validez de credenciales de EF2 */
export async function verifyEf2Token(
  token: string
): Promise<{ success: boolean; message?: string; tiposCount?: number }> {
  try {
    const res = await fetchEf2Tipos(token);
    return {
      success: res.success !== false && Array.isArray(res.data),
      message: "Credenciales de EF2 verificadas correctamente",
      tiposCount: res.data?.length || 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Error al verificar credenciales con EF2",
    };
  }
}

// ─── Emisión de Facturas y e-CF ──────────────────────────────────────────────

/** Formato de fecha exigido por DGII: DD-MM-YYYY */
export function formatDgiiDate(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatMoneyDgii(amount: number): string {
  return Math.max(0, Number(amount || 0)).toFixed(2);
}

/** Parsea metadata del timbre QR (código de seguridad, fecha de firma) */
export function parseQrMetadata(qrLink?: string): { fecha_firma?: string; codigo_seguridad?: string } {
  if (!qrLink) return {};
  try {
    const url = new URL(qrLink);
    const p = url.searchParams;
    const entries = new Map<string, string>();
    p.forEach((v, k) => entries.set(k.toLowerCase(), v));
    return {
      fecha_firma:
        entries.get("fechafirmadigital") ||
        entries.get("fecha_firma_digital") ||
        entries.get("fechafirma"),
      codigo_seguridad:
        entries.get("codigoseguridad") ||
        entries.get("codigo_seguridad") ||
        entries.get("codseguridad"),
    };
  } catch {
    return {};
  }
}

/** Normaliza la respuesta que entrega EF2 */
export function normalizeEf2Response(rawRes: any): EF2ProcesarFacturaResponse {
  const raw = (rawRes?.data && !Array.isArray(rawRes.data) ? rawRes.data : rawRes) || {};
  const dgii = raw.dgii_info || raw.dgii || raw.DGII || {};
  const docs = raw.documentos || {};

  const qrLink =
    raw.qr_link ||
    raw.qrLink ||
    raw.qr ||
    raw.timbre_qr ||
    docs.qr ||
    docs.qr_link ||
    docs.timbre_qr ||
    docs.timbre;

  const qrMeta = parseQrMetadata(qrLink);

  const estado = String(
    raw.estado ||
      raw.Estado ||
      raw.legal_status ||
      raw.status ||
      raw.estado_factura ||
      raw.estado_dgii ||
      dgii.estado ||
      ""
  );

  const ncf = raw.ncf || raw.eNCF || raw.encf || raw.documentNumber || raw.numero_documento;
  const isRejected = /rechaz|error|inv[aá]lid/i.test(estado);
  const success = typeof raw.success === "boolean" ? raw.success : !isRejected && Boolean(ncf);

  return {
    success,
    message: raw.message || raw.mensaje,
    error: raw.error || (isRejected ? estado : undefined),
    ncf,
    estado,
    qr_link: qrLink,
    pdf_cloud_url: raw.pdf_cloud_url || raw.pdf_url || raw.pdf || docs.pdf || docs.pdf_url,
    xml_cloud_url: raw.xml_cloud_url || raw.xml_url || raw.xml || docs.xml || docs.xml_url,
    consulta_url: raw.UrlENCF || raw.url_encf || raw.consulta_url,
    id_factura: raw.id_factura || raw.idFactura || raw.id,
    fecha_emision: raw.FechaEmision || raw.fecha_emision,
    fecha_firma: raw.fecha_firma || raw.fecha_firma_digital || dgii.fecha_firma || qrMeta.fecha_firma,
    codigo_seguridad: raw.codigo_seguridad || dgii.codigo_seguridad || qrMeta.codigo_seguridad,
    monto_total: raw.MontoTotal || raw.monto_total,
    dgii_info: {
      ...dgii,
      track_id: dgii.track_id || raw.track_id,
      fecha_recepcion: dgii.fecha_recepcion || raw.fecha_recepcion,
    },
    raw,
  };
}

/** Construye el payload completo ECF según la documentación oficial de EF2 */
export function buildEf2InvoicePayload(params: {
  invoiceType?: "31" | "32" | "34" | "44" | "45" | string;
  items: Array<{
    name: string;
    quantity: number;
    salePrice: number;
    tax?: number;
    category?: string;
    is_exento?: boolean;
  }>;
  subtotal: number;
  itbis: number;
  total: number;
  discount?: number;
  payMethod?: string;
  issuer: {
    rnc?: string;
    businessName?: string;
    commercialName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  buyer?: {
    rnc?: string;
    name?: string;
    address?: string;
    email?: string;
  };
  expirationDate?: string;
}) {
  const typeCode = (params.invoiceType || "32").replace(/\D/g, "") || "32";
  const isCreditFiscal = typeCode === "31";
  const isFinalConsumer = typeCode === "32";

  // Emisor
  const cleanIssuerRnc = String(params.issuer.rnc || EF2_DEFAULT_TEST_RNC).replace(/\D/g, "") || EF2_DEFAULT_TEST_RNC;
  const issuerName = params.issuer.businessName || EF2_DEFAULT_TEST_EMPRESA;

  // Fecha de emisión
  const issueDate = formatDgiiDate(new Date());

  // IdDoc
  const idDoc: Record<string, string> = {
    TipoeCF: typeCode,
    TipoPago: params.payMethod === "credit" ? "2" : "1",
    TipoIngresos: "01",
    IndicadorMontoGravado: "0",
  };

  if (isFinalConsumer) {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 30);
    idDoc.FechaLimitePago = formatDgiiDate(limitDate);
  } else if (params.expirationDate) {
    idDoc.FechaVencimientoSecuencia = formatDgiiDate(params.expirationDate);
  }

  // Encabezado
  const encabezado: Record<string, any> = {
    Version: "1.0",
    IdDoc: idDoc,
    Emisor: {
      RNCEmisor: cleanIssuerRnc,
      RazonSocialEmisor: issuerName,
      NombreComercial: params.issuer.commercialName || issuerName,
      DireccionEmisor: params.issuer.address || "Santo Domingo, República Dominicana",
      Municipio: "010100",
      Provincia: "010000",
      CorreoEmisor: params.issuer.email || "facturacion@servitracks.do",
      FechaEmision: issueDate,
    },
  };

  // Comprador (obligatorio para Crédito Fiscal E31, Gubernamental E45, o ventas >= 250k)
  const cleanBuyerRnc = params.buyer?.rnc ? String(params.buyer.rnc).replace(/\D/g, "") : "";
  if (isCreditFiscal || cleanBuyerRnc || Number(params.total || 0) >= 250000) {
    encabezado.Comprador = {
      RNCComprador: cleanBuyerRnc || "131703836",
      RazonSocialComprador: params.buyer?.name || "CLIENTE REGISTRADO",
      CorreoComprador: params.buyer?.email || undefined,
      DireccionComprador: params.buyer?.address || "Santo Domingo, República Dominicana",
      MunicipioComprador: "010100",
      ProvinciaComprador: "010000",
    };
  }

  // Desglose de totales
  const totalGross = Number(params.total || 0);
  const itbisVal = Number(params.itbis || 0);
  const subtotalVal = Number(params.subtotal || (totalGross - itbisVal));

  const totales: Record<string, string> = {
    MontoTotal: formatMoneyDgii(totalGross),
  };

  if (itbisVal > 0) {
    totales.MontoGravadoTotal = formatMoneyDgii(subtotalVal);
    totales.MontoGravadoI1 = formatMoneyDgii(subtotalVal);
    totales.ITBIS1 = "18";
    totales.TotalITBIS = formatMoneyDgii(itbisVal);
    totales.TotalITBIS1 = formatMoneyDgii(itbisVal);
  } else {
    totales.MontoExento = formatMoneyDgii(totalGross);
  }

  encabezado.Totales = totales;

  // Detalles de Items
  const items = params.items && params.items.length > 0 ? params.items : [
    { name: "Servicios generales de taller", quantity: 1, salePrice: subtotalVal, tax: itbisVal > 0 ? 0.18 : 0 }
  ];

  const itemsList = items.map((it, idx) => {
    const qty = Math.max(0.01, Number(it.quantity || 1));
    const price = Math.max(0, Number(it.salePrice || 0));
    const totalLine = qty * price;
    const isExempt = it.is_exento || (it.tax === 0 && itbisVal === 0);

    return {
      NumeroLinea: String(idx + 1),
      IndicadorFacturacion: isExempt ? "4" : "1",
      NombreItem: (it.name || "Servicio / Repuesto").slice(0, 80),
      IndicadorBienoServicio: it.category === "Servicios" || it.name.toLowerCase().includes("mano de obra") ? "2" : "1",
      CantidadItem: String(qty),
      UnidadMedida: "43",
      PrecioUnitarioItem: formatMoneyDgii(price),
      MontoItem: formatMoneyDgii(totalLine),
    };
  });

  return {
    ECF: {
      Encabezado: encabezado,
      DetallesItems: {
        Item: itemsList,
      },
    },
  };
}

/** Enviar la factura electrónica directamente a EF2 */
export async function submitInvoiceToEf2(
  token: string,
  ecfPayload: any
): Promise<EF2ProcesarFacturaResponse> {
  const result = await callEf2Api("/procesar_factura.php", token, "POST", ecfPayload);
  return normalizeEf2Response(result);
}

// ─── Funciones de compatibilidad hacia atrás ──────────────────────────────────

export function resolveEcfEnvironment(tenantEnv?: string): EF2Environment {
  if (tenantEnv === "eCF" || tenantEnv === "production") return "eCF";
  if (tenantEnv === "CerteCF" || tenantEnv === "homologacion") return "CerteCF";
  return "TesteCF";
}

export async function getEcfToken(
  clientId?: string,
  clientSecret?: string,
  environment?: string
): Promise<string> {
  return clientId?.startsWith("tok_") ? clientId : EF2_DEFAULT_TEST_TOKEN;
}

export async function fetchTaxSequences(token: string, _env?: any) {
  return fetchEf2Sequences(token);
}

export async function createTaxSequence(token: string, _env?: any, payload?: any) {
  return createEf2Sequence(token, {
    tipo_ecf_id: payload?.tipo_ecf_id || (payload?.sequenceType === "E31" ? 1 : 2),
    prefijo: payload?.prefijo || payload?.sequenceType || "E32",
    desde: payload?.from || payload?.desde || 1,
    hasta: payload?.to || payload?.hasta || 100,
    secuencia_actual: payload?.currentNumber || payload?.secuencia_actual || 0,
    fecha_vencimiento: payload?.expirationDate || payload?.fecha_vencimiento,
    estado: true,
  });
}

export async function submitInvoiceToDGII(token: string, _env: any, document: any) {
  return submitInvoiceToEf2(token, document);
}

export const buildElectronicDocument = buildEf2InvoicePayload;
