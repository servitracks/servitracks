import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ClipboardList,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  Wrench,
  Tag,
  Calculator,
  Percent,
  CircleDollarSign,
  CreditCard,
  BadgePercent,
  Landmark,
  Coins,
  Hourglass,
  ArrowRightLeft,
  Cog,
  Car,
} from "lucide-react";

export function formatRD(amount: number) {
  return (
    "RD$ " +
    Number(amount || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatNumber(amount: number) {
  return Number(amount || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function translatePaymentMethod(method?: string): string {
  if (!method) return "EFECTIVO";
  const m = method.toLowerCase().trim();
  if (m === "cash" || m === "efectivo") return "EFECTIVO";
  if (m === "card" || m === "tarjeta") return "TARJETA";
  if (m === "transfer" || m === "transferencia") return "TRANSFERENCIA";
  if (m === "credit" || m === "credito" || m === "crédito") return "CRÉDITO";
  if (m === "pago_al_retirar" || m === "retirar") return "PAGO AL RETIRAR";
  if (m === "mixed" || m === "mixto") return "MIXTO";
  return method.toUpperCase();
}

export interface TicketItem {
  id?: string;
  descripcion?: string;
  name?: string;
  cantidad?: number;
  quantity?: number;
  precio_unitario?: number;
  unitPrice?: number;
  salePrice?: number;
  is_exento?: boolean;
  tax?: number;
  notas?: string;
  servicio_origen?: string;
}

export interface TicketProps {
  orden?: {
    numero: string | number;
    creado_en: string;
    fecha_entrega?: string;
    subtotal: number;
    itbis: number;
    descuento: number;
    costo_envio?: number;
    total: number;
    saldo?: number;
    pagado?: number;
    metodo_pago: string;
    pago_referencia?: string;
    estado?: string;
    es_urgente?: boolean;
    notas?: string;
    items: TicketItem[];
    ncf?: string;
    ncf_vencimiento?: string;
    nota_credito_ncf?: string;
    ecf_qr?: string;
    ecf_security_code?: string;
    ecf_signature_date?: string;
    vehicle?: {
      brand?: string;
      model?: string;
      year?: number | string;
      plate?: string;
      km?: number | string;
      color?: string;
    };
  };
  tenant?: {
    nombre?: string;
    name?: string;
    rnc?: string;
    telefono?: string;
    phone?: string;
    direccion?: string;
    address?: string;
    logo_url?: string;
    logo?: string;
    config?: Record<string, any>;
  };
  empleado?: {
    nombre: string;
  };
  cliente?: {
    nombre: string;
    apellido?: string;
    cedula?: string;
    rnc?: string;
    documentId?: string;
    telefono?: string;
    phone?: string;
    direccion?: string;
    address?: string;
    tipo?: "Persona" | "Empresa";
  };
  formato?: "57mm" | "58mm" | "80mm" | "A4";
  pagoRecibido?: number;
  ocultarNotas?: boolean;
  esProduccion?: boolean;
  esCopiaCaja?: boolean;

  // Propiedades Directas / Legadas (POS ServiTracks)
  invoiceId?: string;
  ncf?: string;
  createdAt?: string;
  customer?: any;
  items?: any[];
  subtotal?: number;
  itbis?: number;
  total?: number;
  payMethod?: string;
  cashReceived?: number;
  mechanicName?: string;
  notes?: string;
  warrantyText?: string;
  qrUrl?: string;
  securityCode?: string;
  signatureDate?: string;
  discount?: number;
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number | string;
    plate?: string;
    km?: number | string;
    color?: string;
  };
  tipoDocumento?: string;
  esCotizacion?: boolean;
  validUntil?: string;
  observation?: string;
}

const NCF_NOMBRES: Record<string, string> = {
  E31: "Factura de Crédito Fiscal Electrónica",
  E32: "Factura de Consumo Electrónica",
  E33: "Nota de Débito Electrónica",
  E34: "Nota de Crédito Electrónica",
  E41: "Compras Electrónico",
  E43: "Gastos Menores Electrónico",
  E44: "Regímenes Especiales Electrónico",
  E45: "Gubernamental Electrónico",
  E46: "Exportaciones Electrónico",
  E47: "Pagos al Exterior Electrónico",
  B01: "Factura de Crédito Fiscal",
  B02: "Factura para Consumidor Final",
  B14: "Regímenes Especiales",
  B15: "Gubernamental",
};

function humanizeDate(dateStr?: string, showTime = true): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = dDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (!showTime) {
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const timeStr = d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (diffDays === 0) return `Hoy a las ${timeStr}`;
  if (diffDays === 1) return `Mañana a las ${timeStr}`;
  return d.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatPhoneDO(phoneStr?: string): string {
  if (!phoneStr || phoneStr === "---") return "";
  const digits = phoneStr.replace(/\D/g, "");
  const cleanDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (cleanDigits.length === 10) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }
  return phoneStr;
}

export function Ticket({
  orden,
  tenant,
  empleado,
  cliente,
  formato = "80mm",
  pagoRecibido,
  ocultarNotas = false,
  esProduccion = false,
  esCopiaCaja = false,
  invoiceId,
  ncf,
  createdAt,
  customer,
  items,
  subtotal,
  itbis,
  total,
  payMethod,
  cashReceived,
  mechanicName,
  notes,
  warrantyText,
  qrUrl,
  securityCode,
  signatureDate,
  discount,
  vehicle,
  tipoDocumento: propTipoDocumento,
  esCotizacion = false,
  validUntil,
  observation,
}: TicketProps) {
  // Reconciliación de Tenant
  const tenantObj = {
    nombre: tenant?.nombre || tenant?.name || "ServiTracks Taller Automotriz",
    rnc: tenant?.rnc || "",
    telefono: tenant?.telefono || tenant?.phone || "",
    direccion: tenant?.direccion || tenant?.address || "",
    logo_url: tenant?.logo_url || tenant?.logo || "",
    config: tenant?.config || {},
  };

  // Reconciliación de Cliente
  const clienteObj = {
    nombre: cliente?.nombre || customer?.name || customer?.nombre || "Consumidor Final",
    apellido: cliente?.apellido || "",
    cedula: cliente?.cedula || cliente?.rnc || customer?.rnc || customer?.cedula || customer?.documentId || "",
    telefono: cliente?.telefono || customer?.phone || customer?.telefono || "",
    direccion: cliente?.direccion || customer?.address || customer?.direccion || "",
    tipo: cliente?.tipo || (customer?.rnc ? "Empresa" : "Persona"),
  };

  // Reconciliación de Empleado / Mecánico
  const empleadoObj = empleado || (mechanicName ? { nombre: mechanicName } : undefined);

  // Reconciliación de Ítems
  const rawItems = orden?.items || items || [];
  const normalizedItems: TicketItem[] = rawItems.map((it: any) => {
    const isExento = Boolean(
      it.is_exento ||
      it.tax === 0 ||
      it.id?.startsWith?.("labor-") ||
      it.sku === "MANO-OBRA" ||
      it.name?.toLowerCase().includes("mano de obra") ||
      it.descripcion?.toLowerCase().includes("mano de obra") ||
      (it.tax !== undefined && Number(it.tax) === 0)
    );

    let explicitTax: number | undefined = undefined;
    if (typeof it.tax === 'number') {
      explicitTax = it.tax;
    }

    return {
      id: it.id,
      descripcion: it.descripcion || it.name || "Servicio / Repuesto",
      cantidad: it.cantidad ?? it.quantity ?? 1,
      precio_unitario: it.precio_unitario ?? it.unitPrice ?? it.salePrice ?? 0,
      is_exento: isExento,
      tax: isExento ? 0 : explicitTax,
      notas: it.notas,
      servicio_origen: it.servicio_origen,
    };
  });

  const rawNotesStr = orden?.notas || notes;
  let parsedCheckoutMeta: {
    condicionCobro?: string;
    instrumentoPago?: string;
    referencia?: string;
    desgloseMixto?: {
      efectivo?: number;
      efectivoRecibido?: number;
      cambioEfectivo?: number;
      tarjeta?: number;
      transferencia?: number;
      tarjetaRef?: string;
      transferenciaRef?: string;
    };
  } | null = null;
  let displayNotes: string | undefined = rawNotesStr;

  if (rawNotesStr && rawNotesStr.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawNotesStr);
      if (parsed && typeof parsed === "object" && ("condicionCobro" in parsed || "instrumentoPago" in parsed)) {
        parsedCheckoutMeta = parsed;
        displayNotes = undefined;
      }
    } catch {
      // Si no es JSON válido, conservar el texto original
    }
  }

  const effectivePaymentMethodLabel =
    parsedCheckoutMeta?.instrumentoPago === "MIXTO"
      ? "PAGO MIXTO"
      : translatePaymentMethod(parsedCheckoutMeta?.instrumentoPago || orden?.metodo_pago || payMethod);

  const ordenObj = {
    numero:
      orden?.numero ??
      (invoiceId
        ? invoiceId.length > 8
          ? invoiceId.slice(-6).toUpperCase()
          : invoiceId
        : `FAC-${Date.now().toString().slice(-6)}`),
    creado_en: orden?.creado_en || createdAt || new Date().toISOString(),
    fecha_entrega: orden?.fecha_entrega || orden?.creado_en || createdAt || new Date().toISOString(),
    subtotal: orden?.subtotal ?? subtotal ?? 0,
    itbis: orden?.itbis ?? itbis ?? 0,
    descuento: orden?.descuento ?? discount ?? 0,
    costo_envio: orden?.costo_envio ?? 0,
    total: orden?.total ?? total ?? 0,
    saldo: orden?.saldo ?? 0,
    pagado: orden?.pagado ?? (orden?.total ?? total ?? 0),
    metodo_pago: effectivePaymentMethodLabel,
    pago_referencia: orden?.pago_referencia || parsedCheckoutMeta?.referencia,
    estado: orden?.estado || "PAGADA",
    es_urgente: orden?.es_urgente ?? false,
    notas: displayNotes,
    items: normalizedItems,
    ncf: orden?.ncf || ncf,
    nota_credito_ncf: orden?.nota_credito_ncf,
    ecf_qr: orden?.ecf_qr || qrUrl,
    ecf_security_code: orden?.ecf_security_code || securityCode,
    ecf_signature_date: orden?.ecf_signature_date || signatureDate,
    vehicle: orden?.vehicle || vehicle,
  };

  const effectivePagoRecibido = pagoRecibido ?? cashReceived;
  const vuelto =
    effectivePagoRecibido && effectivePagoRecibido > ordenObj.total
      ? effectivePagoRecibido - ordenObj.total
      : 0;

  // Detección e-CF
  const isECF = !!(ordenObj.ncf?.startsWith("E") || ordenObj.nota_credito_ncf?.startsWith("E"));
  const fiscalNCF = ordenObj.nota_credito_ncf || ordenObj.ncf;
  const qrData =
    ordenObj.ecf_qr ||
    (isECF && tenantObj.rnc && fiscalNCF
      ? `https://fc.dgii.gov.do/ecf/consulta?rncemisor=${tenantObj.rnc.replace(/\D/g, "")}&encf=${fiscalNCF}&codigoSeguridad=${ordenObj.ecf_security_code || ""}&montoTotal=${ordenObj.total}`
      : "");

  let tipoDocumento = propTipoDocumento || "RECIBO DE VENTA";
  if (esCotizacion) {
    tipoDocumento = propTipoDocumento || "COTIZACIÓN / PRESUPUESTO";
  } else if (!esProduccion && fiscalNCF) {
    const prefix = fiscalNCF.substring(0, 3);
    const nombreOficial = NCF_NOMBRES[prefix];
    if (nombreOficial) {
      tipoDocumento = nombreOficial.toUpperCase();
    } else if (isECF) {
      tipoDocumento = "FACTURA ELECTRÓNICA DGII";
    } else {
      tipoDocumento = "COMPROBANTE FISCAL";
    }
  }

  const cleanWarranty = warrantyText
    ? warrantyText
        .replace(/^[🛡️\s]+/gu, "")
        .replace(/^garant[ií]a:\s*/gi, "")
        .replace(/^garant[ií]a\s*/gi, "")
        .trim()
    : "";

  const formatKey = formato === "57mm" ? "58mm" : formato;
  const w = formatKey === "58mm" ? "w-[58mm]" : formatKey === "A4" ? "w-[210mm] min-h-[297mm]" : "w-[80mm]";
  const cols = formatKey === "58mm" ? "max-w-[32ch]" : formatKey === "A4" ? "max-w-none" : "max-w-[44ch]";

  // =========================================================================
  // ★ FORMATO A4 COMERCIAL / TALLER / FISCAL ★
  // =========================================================================
  if (formatKey === "A4") {
    return (
      <div
        className={`thermal-ticket mx-auto ${w} bg-white p-12 font-sans text-neutral-800 text-sm`}
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
      >
        {/* Header A4 */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-neutral-100">
          <div className="flex gap-6 items-center">
            {tenantObj.logo_url ? (
              <img src={tenantObj.logo_url} alt="Logo" className="h-20 w-auto object-contain" />
            ) : (
              <div className="h-16 w-16 bg-[#001D3D] text-white rounded-xl flex items-center justify-center font-black text-2xl">
                <Wrench className="h-8 w-8 text-sky-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight uppercase">{tenantObj.nombre}</h1>
              <div className="text-xs text-neutral-500 mt-1 space-y-0.5">
                {tenantObj.rnc && <div><b className="text-neutral-700">RNC:</b> {tenantObj.rnc}</div>}
                {tenantObj.telefono && <div><b className="text-neutral-700">Tel:</b> {formatPhoneDO(tenantObj.telefono)}</div>}
                {tenantObj.direccion && <div>{tenantObj.direccion}</div>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-[#0051A8] uppercase tracking-wide">{tipoDocumento}</h2>
            {fiscalNCF && (
              <div className="text-sm font-bold text-neutral-900 mt-1">
                {isECF ? "e-NCF:" : "NCF:"} <span className="font-mono text-base font-black">{fiscalNCF}</span>
              </div>
            )}
            <div className="text-xs text-neutral-500 mt-1">
              {esCotizacion ? "Cotización Nº: " : "Orden Nº: "}<b className="text-neutral-900">{ordenObj.numero}</b> • Fecha: {humanizeDate(ordenObj.creado_en, true)}
            </div>
            {esCotizacion && validUntil && (
              <div className="text-xs text-neutral-600 mt-0.5">
                Válido hasta: <b className="text-neutral-900">{humanizeDate(validUntil, false)}</b>
              </div>
            )}
          </div>
        </div>

        {/* Cliente y Vehículo A4 */}
        <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200 mb-6">
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#0051A8]" /> Datos del Cliente
            </div>
            <div className="text-sm font-black text-neutral-900">
              {clienteObj.nombre} {clienteObj.apellido || ""}
            </div>
            {clienteObj.cedula && (
              <div className="text-xs text-neutral-600 mt-0.5">
                <b>{clienteObj.tipo === "Empresa" ? "RNC:" : "Cédula:"}</b> {clienteObj.cedula}
              </div>
            )}
            {clienteObj.telefono && <div className="text-xs text-neutral-600">Tel: {formatPhoneDO(clienteObj.telefono)}</div>}
            {clienteObj.direccion && <div className="text-xs text-neutral-600 truncate">{clienteObj.direccion}</div>}
          </div>

          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-[#0051A8]" /> Datos del Vehículo
            </div>
            {ordenObj.vehicle?.plate ? (
              <div className="space-y-0.5 text-xs text-neutral-700">
                <div className="text-sm font-black text-neutral-900">
                  {ordenObj.vehicle.brand} {ordenObj.vehicle.model} {ordenObj.vehicle.year ? `(${ordenObj.vehicle.year})` : ""}
                </div>
                <div>Placa: <b className="font-mono">{ordenObj.vehicle.plate}</b></div>
                {ordenObj.vehicle.km && <div>Kilometraje: <b>{Number(ordenObj.vehicle.km).toLocaleString()} km</b></div>}
              </div>
            ) : (
              <div className="text-xs text-neutral-400 italic">Sin datos de vehículo asociados</div>
            )}
          </div>
        </div>

        {/* Tabla Ítems A4 */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left">
            <thead className="bg-[#001D3D] text-white text-xs uppercase font-bold">
              <tr>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4 text-center">Cant.</th>
                <th className="py-3 px-4 text-right">Precio Unitario</th>
                <th className="py-3 px-4 text-right">ITBIS</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {ordenObj.items.map((it, idx) => {
                const qty = it.cantidad || 1;
                const price = it.precio_unitario || 0;
                const totalItem = qty * price;
                let itbisItem = 0;
                if (!it.is_exento && ordenObj.itbis > 0) {
                  if (typeof it.tax === 'number' && it.tax > 0 && it.tax <= 1) {
                    itbisItem = totalItem * it.tax;
                  } else if (typeof it.tax === 'number' && it.tax > 1) {
                    itbisItem = totalItem * (it.tax / 100);
                  } else if (typeof it.tax === 'number' && it.tax === 0) {
                    itbisItem = 0;
                  } else {
                    itbisItem = totalItem * 0.18;
                  }
                }
                return (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {it.descripcion}
                      {it.notas && <div className="text-[10px] text-neutral-500 italic mt-0.5">Nota: {it.notas}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-neutral-700">{qty}</td>
                    <td className="py-3 px-4 text-right text-neutral-700">{formatRD(price)}</td>
                    <td className="py-3 px-4 text-right text-neutral-700">{itbisItem > 0 ? formatRD(itbisItem) : "-"}</td>
                    <td className="py-3 px-4 text-right font-black text-neutral-900">{formatRD(totalItem)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales y QR A4 */}
        <div className="flex justify-between items-start pt-2">
          <div className="w-1/2 pr-6 space-y-4">
            {isECF && qrData && (
              <div className="flex gap-4 items-center bg-[#EBF5FC] p-4 rounded-xl border border-[#BDE0FE]">
                <div className="p-2 bg-white rounded-lg border border-neutral-200 shrink-0">
                  <QRCodeSVG value={qrData} size={90} level="M" />
                </div>
                <div className="text-xs text-[#003D7A] space-y-1">
                  <div className="font-black text-[#0051A8] uppercase tracking-wide">Comprobante Fiscal Electrónico</div>
                  {ordenObj.ecf_security_code && <div><b>Código de Seguridad:</b> {ordenObj.ecf_security_code}</div>}
                  {ordenObj.ecf_signature_date && (
                    <div><b>Fecha Firma:</b> {humanizeDate(ordenObj.ecf_signature_date, true)}</div>
                  )}
                  <div className="text-[11px] font-bold text-neutral-600">Consulte en: <b>dgii.gov.do</b></div>
                </div>
              </div>
            )}
            {esCotizacion && (
              <div className="text-xs text-neutral-500 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-800 uppercase tracking-wide text-[10px]">Condiciones del Presupuesto:</div>
                <p className="leading-relaxed text-[11px] italic text-neutral-600">
                  * Este documento es un presupuesto estimativo de servicios y/o repuestos. No constituye una factura fiscal ni comprobante de pago definitivo. Precios y disponibilidad sujetos a confirmación.
                </p>
                {observation && (
                  <div className="pt-1 text-neutral-800 not-italic font-medium text-[11px] border-t border-neutral-200">
                    <b>Observación:</b> {observation}
                  </div>
                )}
              </div>
            )}
            {cleanWarranty && (
              <div className="text-xs text-neutral-800 bg-neutral-50 p-3 rounded-xl border border-neutral-200 flex items-center gap-2">
                <span><b>Garantía del Taller:</b> {cleanWarranty}</span>
              </div>
            )}
          </div>

          <div className="w-[360px] bg-neutral-50 p-5 rounded-xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-neutral-900">{formatRD(ordenObj.subtotal)}</span>
            </div>
            {ordenObj.itbis > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>ITBIS (18%):</span>
                <span className="font-semibold text-neutral-900">{formatRD(ordenObj.itbis)}</span>
              </div>
            )}
            {ordenObj.descuento > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Descuento:</span>
                <span>-{formatRD(ordenObj.descuento)}</span>
              </div>
            )}
            <div className="pt-2 border-t-2 border-neutral-200 flex justify-between items-center text-sm font-black text-neutral-900">
              <span>{esCotizacion ? "TOTAL ESTIMADO:" : "TOTAL A PAGAR:"}</span>
              <span className="text-xl text-[#0051A8]">{formatRD(ordenObj.total)}</span>
            </div>
            {!esCotizacion && (
              <div className="pt-2 border-t border-dashed border-neutral-300 space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Método de Pago:</span>
                  <span className="font-bold text-neutral-900 uppercase">{ordenObj.metodo_pago}</span>
                </div>
                {ordenObj.pago_referencia && (
                  <div className="flex justify-between text-neutral-600">
                    <span>No. Referencia:</span>
                    <span className="font-mono font-bold text-neutral-900">{ordenObj.pago_referencia}</span>
                  </div>
                )}
                {parsedCheckoutMeta?.instrumentoPago === "MIXTO" && parsedCheckoutMeta.desgloseMixto && (
                  <div className="text-[11px] bg-white p-2 rounded border border-neutral-200 space-y-0.5 mt-1">
                    {Number(parsedCheckoutMeta.desgloseMixto.efectivo || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>• Efectivo:</span>
                        <span className="font-bold">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.efectivo))}</span>
                      </div>
                    )}
                    {Number(parsedCheckoutMeta.desgloseMixto.tarjeta || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>• Tarjeta {parsedCheckoutMeta.desgloseMixto.tarjetaRef ? `(${parsedCheckoutMeta.desgloseMixto.tarjetaRef})` : ""}:</span>
                        <span className="font-bold">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.tarjeta))}</span>
                      </div>
                    )}
                    {Number(parsedCheckoutMeta.desgloseMixto.transferencia || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>• Transf. {parsedCheckoutMeta.desgloseMixto.transferenciaRef ? `(${parsedCheckoutMeta.desgloseMixto.transferenciaRef})` : ""}:</span>
                        <span className="font-bold">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.transferencia))}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!esCotizacion && vuelto > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-dashed border-neutral-300">
                <span>Cambio:</span>
                <span>{formatRD(vuelto)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ★ FORMATO TÉRMICO COMERCIAL / FISCAL (58mm / 80mm) ★
  // =========================================================================
  return (
    <div
      className={`thermal-ticket mx-auto ${w} ${cols} bg-white px-2.5 py-1 text-[11px] leading-snug text-black`}
      style={{
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* 1. ENCABEZADO / LOGO */}
      <div className="text-center space-y-0.5">
        {tenantObj.logo_url ? (
          <div className="flex justify-center mb-1">
            <img
              src={tenantObj.logo_url}
              alt="Logo"
              className="h-14 w-auto max-w-[180px] object-contain filter grayscale"
            />
          </div>
        ) : (
          <div className="text-base font-black uppercase tracking-tight text-black">
            {tenantObj.nombre}
          </div>
        )}
        {tenantObj.rnc && (
          <div className="text-[10px]">
            <b>RNC:</b> <span className="font-semibold tabular-nums">{tenantObj.rnc}</span>
          </div>
        )}
        {tenantObj.telefono && (
          <div className="text-[10px]">
            <b>Tel:</b> <span className="font-semibold tabular-nums">{formatPhoneDO(tenantObj.telefono)}</span>
          </div>
        )}
        {tenantObj.direccion && (
          <div className="text-[9.5px] leading-tight font-semibold text-black/80">{tenantObj.direccion}</div>
        )}
      </div>

      <Sep />

      {/* 2. TIPO DE DOCUMENTO */}
      <div className="text-center font-extrabold uppercase text-[12px] py-0.5 tracking-wider">
        {tipoDocumento}
      </div>
      {esCopiaCaja && (
        <div className="text-center font-extrabold uppercase text-[10px] py-0.5 bg-black text-white my-1 rounded-xs tracking-wider">
          ★ COPIA DE CAJA ★
        </div>
      )}

      <Sep />

      {/* 3. METADATOS DE LA ORDEN */}
      <div className="space-y-1 text-[11px] pr-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>
              <b>{esCotizacion ? "Cotización No°:" : "Orden No°:"}</b> <span className="font-bold tabular-nums ml-0.5">{ordenObj.numero}</span>
            </span>
          </div>
          {ordenObj.es_urgente && (
            <span className="font-bold text-[9px] bg-black text-white px-1.5 py-0.5 rounded-xs uppercase shrink-0">
              ★ URGENTE ★
            </span>
          )}
        </div>

        {fiscalNCF && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>
              <b>{isECF ? "e-NCF:" : "NCF:"}</b>{" "}
              <span className="font-bold tabular-nums ml-0.5 font-mono text-[12px]">{fiscalNCF}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-black" />
          <span>
            <b>Fecha Emisión:</b>{" "}
            <span className="font-semibold tabular-nums ml-0.5">
              {humanizeDate(ordenObj.creado_en, true)}
            </span>
          </span>
        </div>

        {esCotizacion && validUntil && (
          <div className="flex items-center gap-1.5 text-[10.5px]">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>
              <b>Válido hasta:</b>{" "}
              <span className="font-semibold tabular-nums ml-0.5">
                {humanizeDate(validUntil, false)}
              </span>
            </span>
          </div>
        )}

        {ordenObj.notas && !ocultarNotas && (
          <div className="border border-black px-1.5 py-0.5 my-1 text-[10px] leading-tight bg-black/5">
            <b>NOTA:</b> {ordenObj.notas}
          </div>
        )}
      </div>

      {/* 4. DATOS DEL VEHÍCULO */}
      {ordenObj.vehicle?.plate && (
        <>
          <Sep />
          <div className="text-center font-bold tracking-widest text-[10.5px] uppercase py-0.5">
            DATOS DEL VEHÍCULO
          </div>
          <Sep />
          <div className="space-y-0.5 text-[10.5px] pr-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Car className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>
                {ordenObj.vehicle.brand} {ordenObj.vehicle.model}{" "}
                {ordenObj.vehicle.year ? `(${ordenObj.vehicle.year})` : ""}
              </span>
            </div>
            <div className="flex justify-between pl-5 text-[10px]">
              <span><b>Placa:</b> <span className="font-mono font-bold">{ordenObj.vehicle.plate}</span></span>
              {ordenObj.vehicle.km && (
                <span><b>Km:</b> <span className="tabular-nums font-semibold">{Number(ordenObj.vehicle.km).toLocaleString()}</span></span>
              )}
            </div>
          </div>
        </>
      )}

      {/* 5. DATOS DEL CLIENTE */}
      {clienteObj && clienteObj.nombre !== "Consumidor" && (
        <>
          <Sep />
          <div className="text-center font-bold tracking-widest text-[10.5px] uppercase py-0.5">
            DATOS DEL CLIENTE
          </div>
          <Sep />
          <div className="space-y-1 text-[11px] pr-2">
            <div className="flex items-start gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
              <div>
                <b>Cliente:</b>{" "}
                <span className="font-semibold ml-0.5">
                  {clienteObj.nombre} {clienteObj.apellido || ""}
                </span>
              </div>
            </div>

            {clienteObj.cedula && (
              <div className="flex items-start gap-1.5 text-[10px]">
                <CreditCard className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div>
                  <b>{clienteObj.tipo === "Empresa" ? "RNC:" : "Cédula:"}</b>{" "}
                  <span className="font-semibold tabular-nums ml-0.5 font-mono">{clienteObj.cedula}</span>
                </div>
              </div>
            )}

            {clienteObj.telefono && clienteObj.telefono !== "---" && (
              <div className="flex items-start gap-1.5 text-[10px]">
                <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div>
                  <b>Teléfono:</b>{" "}
                  <span className="font-semibold tabular-nums ml-0.5">{formatPhoneDO(clienteObj.telefono)}</span>
                </div>
              </div>
            )}

            {clienteObj.direccion && (
              <div className="flex items-start gap-1.5 text-[10px] leading-tight">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div className="break-words">
                  <b>Dirección:</b> <span className="font-normal ml-0.5">{clienteObj.direccion}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Sep />

      {/* 6. TABLA DE ÍTEMS Y SERVICIOS */}
      <div>
        <div className="flex justify-between items-center font-bold uppercase text-[9.5px] pb-1 border-b border-black text-black">
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <Cog className="h-3.5 w-3.5 shrink-0" />
            <span>DESCRIPCIÓN</span>
          </div>
          {ordenObj.itbis > 0 && (
            <div className="w-[20%] text-right flex items-center justify-end gap-0.5">
              <BadgePercent className="h-3 w-3 shrink-0" />
              <span>ITBIS</span>
            </div>
          )}
          <div className="w-[26%] text-right pr-2 flex items-center justify-end gap-0.5">
            <Tag className="h-3 w-3 shrink-0" />
            <span>VALOR</span>
          </div>
        </div>

        <div className="divide-y divide-dotted divide-black/30">
          {ordenObj.items.map((it, idx) => {
            const qty = it.cantidad || 1;
            const price = it.precio_unitario || 0;
            const baseTotal = qty * price;
            
            // ITBIS del ítem: si es exento o mano de obra, es estrictamente 0
            let itbisVal = 0;
            if (!it.is_exento && ordenObj.itbis > 0) {
              if (typeof it.tax === 'number' && it.tax > 0 && it.tax <= 1) {
                itbisVal = baseTotal * it.tax;
              } else if (typeof it.tax === 'number' && it.tax > 1) {
                itbisVal = baseTotal * (it.tax / 100);
              } else if (typeof it.tax === 'number' && it.tax === 0) {
                itbisVal = 0;
              } else {
                itbisVal = baseTotal * 0.18;
              }
            }

            return (
              <div key={idx} className="flex justify-between items-start py-1">
                <div className="flex-1 min-w-0 pr-1">
                  <div className="font-semibold leading-tight text-[10.5px] break-words">
                    {it.descripcion}
                  </div>
                  {price > 0 && (
                    <div className="text-[9.5px] text-black/80 font-semibold tabular-nums">
                      {qty} × {formatNumber(price)}
                    </div>
                  )}
                  {it.notas && (
                    <div className="text-[9px] italic leading-tight text-black/80 font-normal">
                      Nota: {it.notas}
                    </div>
                  )}
                </div>

                {ordenObj.itbis > 0 && (
                  <div className="w-[20%] text-right font-semibold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10px]">
                    {itbisVal > 0 ? formatNumber(itbisVal) : "-"}
                  </div>
                )}

                <div className="w-[26%] text-right pr-2 font-bold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">
                  {formatNumber(baseTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Sep />

      {/* 7. DESGLOSE FINANCIERO */}
      <div className="space-y-1 text-[11px] pt-1 pr-3">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Calculator className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Subtotal</span>
          </div>
          <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">
            {formatRD(ordenObj.subtotal)}
          </span>
        </div>

        {ordenObj.itbis > 0 && (
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Landmark className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>ITBIS 18%</span>
            </div>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">
              {formatRD(ordenObj.itbis)}
            </span>
          </div>
        )}

        {ordenObj.descuento > 0 && (
          <div className="flex justify-between items-center gap-2 text-black">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Percent className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>Descuento</span>
            </div>
            <span className="font-bold tabular-nums tracking-tight whitespace-nowrap">
              -{formatRD(ordenObj.descuento)}
            </span>
          </div>
        )}

        <div className="my-1 border-t-[1.5px] border-dashed border-black" />

        <div className="flex justify-between items-center py-0.5 gap-2">
          <div className="flex items-center gap-1.5 text-[12.5px] font-black tracking-tight shrink-0">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-black" />
            <span>{esCotizacion ? "TOTAL ESTIMADO" : "TOTAL"}</span>
          </div>
          <span className="font-black text-[14.5px] tabular-nums tracking-tight whitespace-nowrap">
            {formatRD(ordenObj.total)}
          </span>
        </div>

        {ordenObj.descuento > 0 && (
          <div className="mt-1 py-1 px-2 border border-dashed border-black rounded text-center text-[10.5px] font-bold leading-tight">
            ¡Te ahorraste {formatRD(ordenObj.descuento)} en este servicio!
          </div>
        )}
      </div>

      <Sep />

      {/* 9. DETALLES DE PAGO / CONDICIONES */}
      {!esCotizacion ? (
        <div className="space-y-1 text-[11px] pr-3">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>Método de pago:</span>
            </div>
            <span className="font-bold uppercase truncate">{ordenObj.metodo_pago}</span>
          </div>

          {ordenObj.pago_referencia && (
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 font-semibold shrink-0">
                <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
                <span>No. Referencia:</span>
              </div>
              <span className="font-bold font-mono uppercase truncate">{ordenObj.pago_referencia}</span>
            </div>
          )}

          {parsedCheckoutMeta?.instrumentoPago === "MIXTO" && parsedCheckoutMeta.desgloseMixto && (
            <div className="pl-5 space-y-0.5 text-[10px] border-l border-dashed border-black/40 my-0.5">
              {Number(parsedCheckoutMeta.desgloseMixto.efectivo || 0) > 0 && (
                <div className="flex justify-between">
                  <span>• Efectivo:</span>
                  <span className="font-bold tabular-nums">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.efectivo))}</span>
                </div>
              )}
              {Number(parsedCheckoutMeta.desgloseMixto.tarjeta || 0) > 0 && (
                <div className="flex justify-between">
                  <span>
                    • Tarjeta{parsedCheckoutMeta.desgloseMixto.tarjetaRef ? ` (${parsedCheckoutMeta.desgloseMixto.tarjetaRef})` : ""}:
                  </span>
                  <span className="font-bold tabular-nums">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.tarjeta))}</span>
                </div>
              )}
              {Number(parsedCheckoutMeta.desgloseMixto.transferencia || 0) > 0 && (
                <div className="flex justify-between">
                  <span>
                    • Transferencia{parsedCheckoutMeta.desgloseMixto.transferenciaRef ? ` (${parsedCheckoutMeta.desgloseMixto.transferenciaRef})` : ""}:
                  </span>
                  <span className="font-bold tabular-nums">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.transferencia))}</span>
                </div>
              )}
              {Number(parsedCheckoutMeta.desgloseMixto.cambioEfectivo || 0) > 0 && (
                <div className="flex justify-between font-bold border-t border-dotted border-black/30 pt-0.5 mt-0.5">
                  <span>• Cambio Efectivo:</span>
                  <span className="tabular-nums">{formatRD(Number(parsedCheckoutMeta.desgloseMixto.cambioEfectivo))}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>Estado de factura:</span>
            </div>
            <span className="font-black uppercase tracking-wide shrink-0">
              {ordenObj.saldo === 0 ? "PAGADA" : "PENDIENTE DE PAGO"}
            </span>
          </div>

          {effectivePagoRecibido !== undefined && (
            <>
              <Row k="Recibido" v={formatRD(effectivePagoRecibido)} icon={Coins} />
              {vuelto > 0 && <Row k="Su Cambio" v={formatRD(vuelto)} icon={ArrowRightLeft} boldValue />}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1 text-[10.5px] pr-3">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>Condición:</span>
            </div>
            <span className="font-bold uppercase text-[10px]">PRESUPUESTO ESTIMADO</span>
          </div>
          {observation && (
            <div className="border border-black px-1.5 py-0.5 my-1 text-[10px] leading-tight bg-black/5">
              <b>OBSERVACIÓN:</b> {observation}
            </div>
          )}
        </div>
      )}

      {cleanWarranty && (
        <>
          <Sep />
          <div className="text-[10px] leading-snug font-bold border border-black py-1 px-1.5 text-center">
            <span>GARANTÍA:</span> <span className="font-semibold">{cleanWarranty}</span>
          </div>
        </>
      )}

      {/* 10. ATENDIDO POR & PIE DE PÁGINA */}
      {empleadoObj && (
        <>
          <Sep />
          <div className="text-center py-0.5">
            <div className="text-[10.5px] font-bold text-black uppercase tracking-wide">Técnico / Mecánico:</div>
            <div className="text-[13px] font-black text-black mt-0.5">{empleadoObj.nombre}</div>
          </div>
        </>
      )}

      <Sep />
      <div className="text-center py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-black">
        {esCotizacion 
          ? "¡GRACIAS POR PREFERIRNOS! PRECIOS SUJETOS A CONFIRMACIÓN."
          : (tenantObj.config?.ticket_pie || "¡GRACIAS POR SU PREFERENCIA!")}
      </div>

      {/* 11. SECCIÓN FISCAL DGII E-CF / QR CODE */}
      {!esCotizacion && isECF && (
        <div className="mt-2.5 flex flex-col items-center gap-1 pt-1 border-t-[1.5px] border-dashed border-black">
          <div className="text-[9.5px] font-black uppercase text-center tracking-wide">
            {tipoDocumento}
          </div>

          {qrData ? (
            <div className="p-1 bg-white border border-black my-1">
              <QRCodeSVG value={qrData} size={95} level="M" />
            </div>
          ) : null}

          <div className="text-[9px] text-center leading-snug font-bold text-black space-y-0.5">
            {ordenObj.ecf_security_code && (
              <div>
                Código de Seguridad: <span className="font-black font-mono">{ordenObj.ecf_security_code}</span>
              </div>
            )}
            {ordenObj.ecf_signature_date && (
              <div>
                Fecha Firma: <span className="font-semibold">{humanizeDate(ordenObj.ecf_signature_date, true)}</span>
              </div>
            )}
            <div>Estado DGII: <span className="font-black">ACCEPTED</span></div>
          </div>

          <div className="text-[9px] text-center leading-tight font-bold text-black mt-0.5">
            Consulte su factura en:<br />
            <span className="font-black">dgii.gov.do</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Sep() {
  return <div className="my-1.5 border-t-[1.5px] border-dashed border-black" />;
}

function Row({
  k,
  v,
  bold,
  boldValue,
  icon: Icon,
}: {
  k: string;
  v: string;
  bold?: boolean;
  boldValue?: boolean;
  icon?: any;
}) {
  return (
    <div
      className={`flex justify-between items-center gap-2 text-[11px] ${
        bold ? "font-bold" : "font-semibold"
      }`}
    >
      <div className="flex items-center gap-1.5 font-semibold shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-black" />}
        <span>{k}:</span>
      </div>
      <span className={boldValue || bold ? "font-bold tabular-nums" : "font-semibold tabular-nums"}>
        {v}
      </span>
    </div>
  );
}
