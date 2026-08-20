import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ClipboardList,
  User,
  Phone,
  MapPin,
  Calendar,
  Shirt,
  FileText,
  ShieldCheck,
} from "lucide-react";

export function formatRD(amount: number) {
  return "RD$ " + Number(amount || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== Tipos mínimos para portabilidad =====
export interface TicketItem {
  id?: string;
  descripcion?: string;
  name?: string;
  cantidad?: number;
  quantity?: number;
  precio_unitario?: number;
  unitPrice?: number;
  salePrice?: number;
  es_libra?: boolean;
  is_exento?: boolean;
  notas?: string;
  servicio_origen?: string;
}

export interface TicketProps {
  // ── Nuevo Formato de Objeto Orden / Cliente / Tenant ──
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
    ubicacion_ropa?: string;
    notas?: string;
    motivo_anulacion?: string;
    motivo_anulacion_codigo?: string;
    items: TicketItem[];
    servicios?: string[];
    servicios_precios?: Record<string, number>;
    ncf?: string;
    ncf_vencimiento?: string;
    nota_credito_ncf?: string;
    ecf_qr?: string;
    ecf_security_code?: string;
    ecf_signature_date?: string;
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
  esProduccion?: boolean; // True para copia de taller/interno
  esCopiaCaja?: boolean;

  // ── Propiedades Directas / Legadas (POS y Facturación serviTracks) ──
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
}

// Funciones auxiliares de formato
function formatMoneda(val: number): string {
  return "RD$" + Number(val || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  return d.toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatPhone(phoneStr?: string): string {
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
  // Props legadas
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
}: TicketProps) {
  // Reconciliación de datos de Tenant
  const tenantObj = {
    nombre: tenant?.nombre || tenant?.name || "ServiTracks",
    rnc: tenant?.rnc || "",
    telefono: tenant?.telefono || tenant?.phone || "",
    direccion: tenant?.direccion || tenant?.address || "",
    logo_url: tenant?.logo_url || tenant?.logo || "",
    config: tenant?.config || {
      ticket_mostrar_empleado: true,
      ticket_mostrar_notas: true,
    },
  };

  // Reconciliación de datos de Cliente
  const clienteObj = {
    nombre: cliente?.nombre || customer?.name || customer?.nombre || "Consumidor Final",
    apellido: cliente?.apellido || "",
    cedula: cliente?.cedula || customer?.rnc || customer?.cedula || customer?.documentId || "",
    telefono: cliente?.telefono || customer?.phone || customer?.telefono || "",
    direccion: cliente?.direccion || customer?.address || customer?.direccion || "",
    tipo: cliente?.tipo || (customer?.rnc ? "Empresa" : "Persona"),
  };

  // Reconciliación de datos de Empleado / Técnico
  const empleadoObj = empleado || (mechanicName ? { nombre: mechanicName } : undefined);

  // Reconciliación de datos de Orden
  const rawItems = orden?.items || items || [];
  const normalizedItems: TicketItem[] = rawItems.map((it: any) => ({
    id: it.id,
    descripcion: it.descripcion || it.name || "Artículo / Servicio",
    cantidad: it.cantidad ?? it.quantity ?? 1,
    precio_unitario: it.precio_unitario ?? it.unitPrice ?? it.salePrice ?? 0,
    es_libra: it.es_libra,
    is_exento: it.is_exento,
    notas: it.notas,
    servicio_origen: it.servicio_origen,
  }));

  const ordenObj = {
    numero: orden?.numero ?? (invoiceId ? (invoiceId.length > 8 ? invoiceId.slice(-6).toUpperCase() : invoiceId) : `FAC-${Date.now().toString().slice(-6)}`),
    creado_en: orden?.creado_en || createdAt || new Date().toISOString(),
    fecha_entrega: orden?.fecha_entrega || orden?.creado_en || createdAt || new Date().toISOString(),
    subtotal: orden?.subtotal ?? subtotal ?? 0,
    itbis: orden?.itbis ?? itbis ?? 0,
    descuento: orden?.descuento ?? discount ?? 0,
    costo_envio: orden?.costo_envio ?? 0,
    total: orden?.total ?? total ?? 0,
    saldo: orden?.saldo ?? 0,
    pagado: orden?.pagado ?? (orden?.total ?? total ?? 0),
    metodo_pago: orden?.metodo_pago || (payMethod === "cash" ? "Efectivo" : payMethod === "card" ? "Tarjeta" : payMethod === "transfer" ? "Transferencia" : payMethod === "credit" ? "Crédito" : (payMethod || "Efectivo")),
    pago_referencia: orden?.pago_referencia,
    estado: orden?.estado || "PAGADA",
    es_urgente: orden?.es_urgente ?? false,
    ubicacion_ropa: orden?.ubicacion_ropa,
    notas: orden?.notas || notes,
    items: normalizedItems,
    ncf: orden?.ncf || ncf,
    nota_credito_ncf: orden?.nota_credito_ncf,
    ecf_qr: orden?.ecf_qr || qrUrl,
    ecf_security_code: orden?.ecf_security_code || securityCode,
    ecf_signature_date: orden?.ecf_signature_date || signatureDate,
  };

  const effectivePagoRecibido = pagoRecibido ?? cashReceived;

  // Formato de ancho
  const formatKey = formato === "57mm" ? "58mm" : formato;
  const w = formatKey === "58mm" ? "w-[58mm]" : formatKey === "A4" ? "w-[210mm] min-h-[297mm]" : "w-[80mm]";
  const cols = formatKey === "58mm" ? "max-w-[32ch]" : formatKey === "A4" ? "max-w-none" : "max-w-[44ch]";
  const vuelto = effectivePagoRecibido && effectivePagoRecibido > ordenObj.total ? effectivePagoRecibido - ordenObj.total : 0;

  const isECF = ordenObj.ncf?.startsWith("E");
  const qrData = ordenObj.ecf_qr || (isECF ? `https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=${tenantObj.rnc}&encf=${ordenObj.ncf}&montototal=${ordenObj.total}&codigoseguridad=${encodeURIComponent(ordenObj.ecf_security_code || '')}` : "");

  let tipoDocumento = "RECIBO";
  if (!esProduccion) {
    if (ordenObj.nota_credito_ncf) {
      tipoDocumento = isECF ? "NOTA DE CRÉDITO ELECTRÓNICA" : "NOTA DE CRÉDITO";
    } else if (ordenObj.ncf) {
      if (ordenObj.ncf.startsWith("E31") || ordenObj.ncf.startsWith("B01")) tipoDocumento = "FACTURA PARA CRÉDITO FISCAL";
      else if (ordenObj.ncf.startsWith("E32") || ordenObj.ncf.startsWith("B02")) tipoDocumento = "FACTURA PARA CONSUMIDOR FINAL";
      else tipoDocumento = "COMPROBANTE FISCAL";
    }
  }

  const totalPrendas = (ordenObj.items || [])
    .filter((it) => !(it.descripcion || "").toLowerCase().startsWith("servicio:"))
    .reduce((acc, it) => acc + (it.cantidad || 1), 0);

  // =========================================================================
  // ★ FORMATO A4 FISCAL / COMERCIAL ★
  // =========================================================================
  if (formatKey === "A4") {
    return (
      <div className={`thermal-ticket mx-auto ${w} bg-white p-12 font-sans text-neutral-800 text-sm`}>
        {/* Header A4 */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-neutral-100">
          <div className="flex gap-6 items-center">
            {tenantObj.logo_url ? (
              <img src={tenantObj.logo_url} alt="Logo" className="h-24 w-auto object-contain" />
            ) : (
              <div className="h-24 w-24 bg-neutral-100 rounded-xl flex items-center justify-center font-black text-2xl text-neutral-400">
                {tenantObj.nombre?.charAt(0) || "T"}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-black tracking-tight uppercase">{tenantObj.nombre}</h1>
              <div className="text-neutral-500 mt-1">
                {tenantObj.rnc && <div><span className="font-semibold text-neutral-700">RNC:</span> {tenantObj.rnc}</div>}
                {tenantObj.telefono && <div><span className="font-semibold text-neutral-700">Tel:</span> {formatPhone(tenantObj.telefono)}</div>}
                {tenantObj.direccion && <div>{tenantObj.direccion}</div>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-black uppercase">{tipoDocumento}</h2>
            <div className="mt-2 text-neutral-600">
              <div className="text-lg"><b>#{ordenObj.numero}</b></div>
              {ordenObj.ncf && <div className="mt-1"><span className="font-bold text-neutral-800">{isECF ? 'e-NCF' : 'NCF'}:</span> {ordenObj.ncf}</div>}
              <div className="mt-1"><span className="font-bold text-neutral-800">Fecha:</span> {new Date(ordenObj.creado_en).toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Info Cliente & Operación A4 */}
        <div className="flex justify-between mb-8 bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Facturado a</h3>
            {(!clienteObj.nombre || clienteObj.nombre === "Consumidor Final" || clienteObj.nombre === "Walk-in") ? (
              <div className="font-bold text-lg text-black">Consumidor Final</div>
            ) : (
              <div className="text-neutral-700">
                <div className="font-bold text-lg text-black">{clienteObj.nombre} {clienteObj.apellido}</div>
                {clienteObj.cedula && <div className="mt-1">{clienteObj.tipo === "Empresa" ? "RNC" : "Cédula"}: {clienteObj.cedula}</div>}
                {clienteObj.telefono && <div>Teléfono: {formatPhone(clienteObj.telefono)}</div>}
                {clienteObj.direccion && <div>Dirección: {clienteObj.direccion}</div>}
              </div>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Detalles de Operación</h3>
            <div className="text-neutral-700">
              {empleadoObj && <div><span className="font-semibold">Atendido por:</span> {empleadoObj.nombre}</div>}
              <div className="mt-1"><span className="font-semibold">Método de pago:</span> {ordenObj.metodo_pago}</div>
              {effectivePagoRecibido !== undefined && effectivePagoRecibido > 0 && (
                <div className="mt-1"><span className="font-semibold">Recibido:</span> {formatMoneda(effectivePagoRecibido)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla Items A4 */}
        <div className="mb-8 rounded-2xl overflow-hidden border border-neutral-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600 text-xs uppercase tracking-widest">
                <th className="py-4 px-6 font-bold">Descripción</th>
                <th className="py-4 px-6 font-bold text-center">Cant.</th>
                <th className="py-4 px-6 font-bold text-right">Precio Unit.</th>
                <th className="py-4 px-6 font-bold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ordenObj.items.map((it, i) => {
                let price = it.precio_unitario || 0;
                let qty = it.cantidad || 1;
                let valor = qty * price;
                return (
                  <tr key={i} className="bg-white">
                    <td className="py-4 px-6 font-medium text-black">
                      {it.descripcion}{it.es_libra ? ` (${qty} lb)` : ""}
                      {it.notas && <div className="text-xs italic text-neutral-500 mt-0.5">Nota: {it.notas}</div>}
                    </td>
                    <td className="py-4 px-6 text-center text-neutral-600">{qty}</td>
                    <td className="py-4 px-6 text-right text-neutral-600">{formatMoneda(price)}</td>
                    <td className="py-4 px-6 text-right font-bold text-black">{formatMoneda(valor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales y QR A4 */}
        <div className="flex justify-between items-start mt-8">
          <div className="w-1/2 pr-8 space-y-6">
            {ordenObj.notas && !ocultarNotas && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Notas</h3>
                <p className="text-sm text-neutral-600 italic bg-amber-50 p-4 rounded-xl border border-amber-100">{ordenObj.notas}</p>
              </div>
            )}
            
            {warrantyText && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Garantía</h3>
                <p className="text-sm text-emerald-800 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{warrantyText}</span>
                </p>
              </div>
            )}

            {isECF && qrData && (
              <div className="flex gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div className="p-2 bg-white rounded-lg border border-neutral-100 shadow-sm shrink-0">
                  <QRCodeSVG value={qrData} size={80} level="M" />
                </div>
                <div className="text-xs text-neutral-600">
                  <div className="font-black text-black uppercase mb-1">Factura de Consumo Electrónica</div>
                  {ordenObj.ecf_security_code && <div><span className="font-bold">Código de Seg:</span> {ordenObj.ecf_security_code}</div>}
                  <div><span className="font-bold">Firma:</span> {new Date(ordenObj.ecf_signature_date || ordenObj.creado_en).toLocaleString("es-DO")}</div>
                  <div className="mt-1">Consulte en: <span className="font-bold">dgii.gov.do</span></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-[400px] bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-medium text-black">{formatMoneda(ordenObj.subtotal)}</span>
              </div>
              {ordenObj.descuento > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Descuento</span>
                  <span>-{formatMoneda(ordenObj.descuento)}</span>
                </div>
              )}
              {ordenObj.itbis > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>ITBIS (18%)</span>
                  <span className="font-medium text-black">{formatMoneda(ordenObj.itbis)}</span>
                </div>
              )}
              {ordenObj.costo_envio ? (
                <div className="flex justify-between text-neutral-600">
                  <span>Envío</span>
                  <span className="font-medium text-black">{formatMoneda(ordenObj.costo_envio)}</span>
                </div>
              ) : null}
            </div>
            <div className="pt-4 border-t-2 border-neutral-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black uppercase">Total</span>
                <span className="text-2xl font-black text-black">{formatMoneda(ordenObj.total)}</span>
              </div>
            </div>
            {vuelto > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-neutral-300 flex justify-between text-emerald-600 font-bold">
                <span>Su Cambio</span>
                <span>{formatMoneda(vuelto)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-neutral-200 text-center text-neutral-400 text-sm font-medium">
          {tenantObj.config?.ticket_pie || "¡Gracias por su compra!"}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ★ 1. FORMATO COPIA DE PRODUCCIÓN / USO INTERNO (TALLER) ★
  // =========================================================================
  if (esProduccion) {
    return (
      <div
        className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-sans text-[11px] leading-snug text-black`}
        style={{ fontFamily: '"Segoe UI", Arial, sans-serif' }}
      >
        <div className="text-center space-y-0.5 mb-1.5">
          {tenantObj.logo_url ? (
            <div className="flex justify-center mb-0">
              <img src={tenantObj.logo_url} alt="Logo" className="h-16 w-auto max-w-[180px] object-contain filter grayscale" />
            </div>
          ) : (
            <div className="text-base font-bold uppercase leading-tight">{tenantObj.nombre}</div>
          )}
        </div>

        <div className="text-center font-black uppercase text-[11px] py-1 bg-black text-white my-1 rounded-xs tracking-wider">
          ★ COPIA DE USO INTERNO ★
        </div>

        {ordenObj.ubicacion_ropa && (
          <div className="my-1.5 p-1.5 border-2 border-black bg-black/5 text-center">
            <div className="text-[9px] font-bold uppercase tracking-wider text-black">UBICACIÓN:</div>
            <div className="text-[15px] font-black uppercase">{ordenObj.ubicacion_ropa}</div>
          </div>
        )}

        <div className="my-1.5 p-2 border-2 border-black bg-black/5 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-black">CANTIDAD TOTAL:</div>
          <div className="text-[18px] font-black tracking-tight leading-none mt-1">
            {totalPrendas} {totalPrendas === 1 ? "PIEZA / ARTÍCULO" : "PIEZAS / ARTÍCULOS"}
          </div>
        </div>

        {/* ORDEN N.° */}
        <div className="my-2 py-2 border-y-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-black shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-black/70">ORDEN N.°</div>
              <div className="text-xl font-mono font-black tracking-tight leading-none">{ordenObj.numero}</div>
            </div>
          </div>
          {ordenObj.es_urgente && (
            <span className="font-black text-white bg-black px-2 py-1 text-[9px] uppercase tracking-wider rounded-xs">
              ★ URGENTE ★
            </span>
          )}
        </div>

        {/* INFORMACIÓN DEL CLIENTE Y FECHA */}
        <div className="space-y-1 text-[11px]">
          <div className="flex items-start justify-between gap-2 py-1.5 border-b border-dotted border-black/40">
            <div className="flex items-center gap-1.5 font-bold uppercase shrink-0 text-black">
              <User className="h-3.5 w-3.5 text-black" />
              <span>CLIENTE:</span>
            </div>
            <span className="font-semibold text-right text-black">
              {clienteObj.nombre} {clienteObj.apellido || ""}
            </span>
          </div>

          {clienteObj.telefono && clienteObj.telefono !== "---" && (
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1.5 font-bold uppercase shrink-0 text-black">
                <Phone className="h-3.5 w-3.5 text-black" />
                <span>TELÉFONO:</span>
              </div>
              <span className="font-mono font-semibold text-right text-black">{formatPhone(clienteObj.telefono)}</span>
            </div>
          )}

          <div className="py-1.5 border-b border-dotted border-black/40 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-black flex items-center justify-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-black" />
              <span>FECHA DE ENTREGA:</span>
            </div>
            <div className="text-[16px] font-black text-black mt-0.5 tracking-tight">
              {humanizeDate(ordenObj.fecha_entrega, true)}
            </div>
          </div>

          {/* LISTA DE ÍTEMS */}
          <div className="py-1.5 border-b border-dotted border-black/40">
            <div className="flex items-center gap-1.5 font-bold uppercase text-black mb-1">
              <Shirt className="h-3.5 w-3.5 text-black" />
              <span>DETALLE DE ÍTEMS:</span>
            </div>
            <div className="pl-2 space-y-1">
              {(ordenObj.items || []).map((it, i) => (
                <div key={i} className="text-[10px]">
                  <span className="font-medium text-black">
                    • {it.cantidad} × {it.descripcion}{it.es_libra ? ` (${it.cantidad} lb)` : ""}
                  </span>
                  {it.notas && (
                    <div className="text-[9px] font-bold text-black italic pl-2">
                      ⚠️ Nota: {it.notas}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {ordenObj.notas && (
            <div className="py-1.5 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1.5 font-bold uppercase text-black mb-1">
                <FileText className="h-3.5 w-3.5 text-black" />
                <span>NOTAS GENERALES:</span>
              </div>
              <div className="font-bold text-left text-[11px] leading-snug text-black whitespace-pre-line pl-2">
                {ordenObj.notas}
              </div>
            </div>
          )}

          {empleadoObj && tenantObj.config?.ticket_mostrar_empleado !== false && (
            <div className="my-2 p-1.5 border border-black bg-black/5 text-center">
              <div className="text-[11.5px] font-bold text-black flex items-center justify-center gap-1">
                <User className="h-4 w-4 text-black" />
                <span>Atendido por:</span>
              </div>
              <div className="text-[14px] font-bold text-black mt-0.5">{empleadoObj.nombre}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ★ 2. FORMATO COMERCIAL / FISCAL / CLIENTE (TÉRMICO 58mm / 80mm) ★
  // =========================================================================
  return (
    <div
      className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-sans text-[11px] leading-snug text-black`}
      style={{ fontFamily: '"Segoe UI", Arial, sans-serif' }}
    >
      {/* Encabezado */}
      <div className="text-center space-y-0.5">
        {tenantObj.logo_url ? (
          <div className="flex justify-center mb-0">
            <img src={tenantObj.logo_url} alt="Logo" className="h-20 w-auto max-w-[200px] object-contain filter grayscale" />
          </div>
        ) : (
          <div className="text-base font-bold uppercase leading-tight">{tenantObj.nombre}</div>
        )}
        {tenantObj.rnc && <div><b>RNC:</b> <span className="font-semibold">{tenantObj.rnc}</span></div>}
        {tenantObj.telefono && <div><b>Tel:</b> <span className="font-semibold">{formatPhone(tenantObj.telefono)}</span></div>}
        {tenantObj.direccion && <div className="text-[10px] leading-tight font-semibold">{tenantObj.direccion}</div>}
      </div>

      <Sep />
      <div className="text-center font-bold uppercase text-[12px] py-0.5">{tipoDocumento}</div>
      {esCopiaCaja && (
        <div className="text-center font-bold uppercase text-[10px] py-0.5 bg-black text-white my-1 rounded-xs tracking-wider">
          ★ COPIA DE CAJA ★
        </div>
      )}
      <div className="text-center font-bold uppercase text-[11px] py-1 border border-black my-1">
        {ordenObj.saldo === 0 ? "★ FACTURA PAGADA ★" : `⚠️ PENDIENTE: ${formatMoneda(ordenObj.saldo)}`}
      </div>
      <Sep />

      {/* Meta de orden */}
      <div>
        <div className="flex justify-between items-center">
          <div><b>Orden No°:</b> <span className="font-semibold">{ordenObj.numero}</span></div>
          {ordenObj.es_urgente && (
            <span className="font-bold text-black border border-black px-1 py-0.5 text-[9px] uppercase">
              ★ URGENTE ★
            </span>
          )}
        </div>
        {ordenObj.ncf && (
          <div>
            <b>{isECF ? "e-NCF" : "NCF"}:</b> <span className="font-semibold">{ordenObj.ncf}</span>
          </div>
        )}
        <div><b>Fecha Emisión:</b> <span className="font-semibold">{new Date(ordenObj.creado_en).toLocaleString("es-DO")}</span></div>
        {ordenObj.notas && !ocultarNotas && (
          <div className="border border-black px-1.5 py-0.5 my-1 text-[10.5px] leading-tight bg-black/5">
            <b>NOTA:</b> {ordenObj.notas}
          </div>
        )}
      </div>

      {/* Datos del Cliente */}
      <Sep />
      <div className="text-center font-bold uppercase tracking-widest text-[10px]">Datos del Cliente</div>
      <Sep />
      <div>
        <div><b>Cliente:</b> <span className="font-semibold">{clienteObj.nombre} {clienteObj.apellido || ""}</span></div>
        {clienteObj.cedula && <div><b>{clienteObj.tipo === "Empresa" ? "RNC:" : "Cédula:"}</b> <span className="font-semibold">{clienteObj.cedula}</span></div>}
        {clienteObj.telefono && clienteObj.telefono !== "---" && <div><b>Teléfono:</b> <span className="font-semibold">{formatPhone(clienteObj.telefono)}</span></div>}
        {clienteObj.direccion && <div><b>Dirección:</b> <span className="font-semibold">{clienteObj.direccion}</span></div>}
      </div>
      <Sep />

      {/* Tabla de ítems */}
      <div className="flex justify-between font-bold uppercase text-[10px] mb-1">
        <div className="w-[60%]">DESCRIPCIÓN</div>
        <div className="w-[15%] text-right">ITBIS</div>
        <div className="w-[25%] text-right">VALOR</div>
      </div>
      <Sep />

      <div className="mt-1 mb-2 space-y-2">
        {(ordenObj.items || []).map((it, i) => {
          const qty = it.cantidad || 1;
          const price = it.precio_unitario || 0;
          const baseTotal = qty * price;
          return (
            <div key={i} className="flex justify-between items-start">
              <div className="w-[60%] pr-1">
                <div className="font-bold leading-snug text-[11px] text-black">
                  {it.descripcion}{it.es_libra ? ` (${qty}lb)` : ""}
                </div>
                <div className="text-[10px] text-black font-semibold leading-tight mt-0.5">
                  {qty} × {formatMoneda(price).replace("RD$", "").trim()}
                </div>
                {it.notas && <div className="text-[9px] italic leading-tight text-black mt-0.5">Nota: {it.notas}</div>}
              </div>
              <div className="w-[15%] text-right font-semibold pt-0.5 text-[10px]">
                {ordenObj.itbis > 0 ? formatMoneda(baseTotal * 0.18).replace("RD$", "").trim() : "0.00"}
              </div>
              <div className="w-[25%] text-right font-bold pt-0.5 text-[11px]">
                {formatMoneda(baseTotal).replace("RD$", "").trim()}
              </div>
            </div>
          );
        })}
      </div>

      <Sep />
      {/* Totales */}
      <div>
        <div className="text-center font-bold text-[12px] my-1">
          TOTAL DE PIEZAS / ARTÍCULOS: {totalPrendas}
        </div>
        <Row k="Subtotal" v={formatMoneda(ordenObj.subtotal)} />
        {ordenObj.itbis > 0 && <Row k="ITBIS" v={formatMoneda(ordenObj.itbis)} />}
        {ordenObj.descuento > 0 && <Row k="Descuento" v={`-${formatMoneda(ordenObj.descuento)}`} />}
        {ordenObj.costo_envio ? <Row k="🚚 Envío" v={formatMoneda(ordenObj.costo_envio)} /> : null}
        <div className="my-1 border-t border-dashed border-black" />
        <Row k="TOTAL" v={formatMoneda(ordenObj.total)} bold />
      </div>

      <Sep />
      {/* Información de Pago */}
      <div>
        <Row k="Método de pago" v={ordenObj.metodo_pago} />
        <Row k="Estado" v={ordenObj.saldo === 0 ? "PAGADA" : "PENDIENTE DE PAGO"} boldValue />
        {effectivePagoRecibido !== undefined && (
          <>
            <Row k="Recibido" v={formatMoneda(effectivePagoRecibido)} />
            {vuelto > 0 && <Row k="Cambio" v={formatMoneda(vuelto)} boldValue />}
          </>
        )}
      </div>

      <Sep />
      {/* Entrega y Pie */}
      <div>
        <Row k="Fecha de entrega" v={humanizeDate(ordenObj.fecha_entrega, false)} boldValue />
        <Row k="Estado de orden" v={(ordenObj.estado || "completada").replace("_", " ")} />
      </div>

      {warrantyText && (
        <div className="border-t border-dashed border-black pt-1.5 my-2 text-[10px] font-bold leading-snug text-center px-1 text-black">
          <span>🛡️ Garantía: {warrantyText}</span>
        </div>
      )}

      {empleadoObj && tenantObj.config?.ticket_mostrar_empleado !== false && (
        <>
          <Sep />
          <div className="text-center py-0.5">
            <div className="text-[12px] font-bold text-black">Atendido por:</div>
            <div className="text-[14.5px] font-bold text-black mt-0.5">{empleadoObj.nombre}</div>
          </div>
        </>
      )}

      <Sep />
      <div className="text-center py-1">
        <div>{tenantObj.config?.ticket_pie || "¡Gracias por su preferencia!"}</div>
        {tenantObj.config?.ticket_nota && (
          <div className="text-[10px] leading-tight whitespace-pre-line border-t border-dashed border-black/30 pt-1 mt-1 font-medium">
            {tenantObj.config.ticket_nota}
          </div>
        )}
      </div>

      {/* QR e-CF */}
      {isECF && qrData && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="p-1 bg-white border border-black">
            <QRCodeSVG value={qrData} size={95} level="M" />
          </div>
          <div className="text-[8px] text-center leading-tight">
            {ordenObj.ecf_security_code && <div>Cód. Seguridad: {ordenObj.ecf_security_code}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Separador con línea discontinua clásica de ticket
function Sep() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

// Fila clave-valor alineada
function Row({ k, v, bold, boldValue }: { k: string; v: string; bold?: boolean; boldValue?: boolean }) {
  return (
    <div className={`flex justify-between text-[11px] ${bold ? "font-bold text-[12px]" : "font-semibold"}`}>
      <span>{k}:</span>
      <span className={boldValue || bold ? "font-bold" : "font-semibold"}>{v}</span>
    </div>
  );
}
