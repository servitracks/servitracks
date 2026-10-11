"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Wallet, Lock, ArrowDownLeft, ArrowUpRight, AlertTriangle, Plus, 
  CheckCircle2, Printer, Search, FileText, PiggyBank, Coins, 
  History, Settings, Eye, Info, RefreshCw, X, Receipt, Check, FileCheck, Users, User,
  CreditCard, Smartphone, Unlock, Banknote, Landmark, ShieldCheck,
  Clock, Tag, Calendar, Percent, Wrench, DollarSign, Scale,
  ChevronLeft, ChevronRight, ArrowLeft, ArrowLeftRight, Loader2, KeyRound
} from "lucide-react";
import { useStore, Caja, MovimientoCaja, Empleado, Tenant, Invoice } from "@/store/useStore";
import { useParams, useRouter } from "@/lib/next-compat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn, isServiceItem, formatRD, parseAmount, formatAmountInput } from "@/lib/utils";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";

const formatDateTimeRD = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const CATEGORIAS_GASTOS = [
  "Combustible",
  "Almuerzo",
  "Suministros de Taller",
  "Limpieza",
  "Papelería",
  "Servicios Públicos",
  "Otros"
];

function MorningShiftIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="morningSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
        <linearGradient id="morningSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="morningHills" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#morningSky)" />
      <path d="M24 8V5M13 14L10 11M35 14L38 11" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      <circle cx="24" cy="27" r="11" fill="url(#morningSun)" />
      <path d="M4 33C11 31 17 34 24 32C31 30 37 33 44 31V44H4V33Z" fill="url(#morningHills)" opacity="0.9" />
      <path d="M4 37C11 36 18 38 25 36.5C32 35 38 37 44 36V44H4V37Z" fill="#9A3412" />
    </svg>
  );
}

function AfternoonShiftIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="afternoonSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0F9FF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id="afternoonSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#afternoonSky)" />
      <circle cx="24" cy="23" r="15" fill="#FEF3C7" opacity="0.7" />
      <g stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
        <line x1="24" y1="5" x2="24" y2="8" />
        <line x1="24" y1="38" x2="24" y2="41" />
        <line x1="6" y1="23" x2="9" y2="23" />
        <line x1="39" y1="23" x2="42" y2="23" />
        <line x1="11" y1="10" x2="13.5" y2="12.5" />
        <line x1="34.5" y1="33.5" x2="37" y2="36" />
        <line x1="11" y1="36" x2="13.5" y2="33.5" />
        <line x1="34.5" y1="12.5" x2="37" y2="10" />
      </g>
      <circle cx="24" cy="23" r="9.5" fill="url(#afternoonSun)" />
      <path d="M31 35C34 35 36.5 32.8 36.5 30C36.5 27.5 34.5 25.4 32 25.1C31.5 22 28.8 19.5 25.5 19.5C21.8 19.5 18.8 22.5 18.8 26.2C18.8 26.5 18.8 26.8 18.9 27.1C17.3 27.7 16.2 29.2 16.2 31C16.2 33.2 18.2 35 20.5 35H31Z" fill="#FFFFFF" fillOpacity="0.95" />
    </svg>
  );
}

function NightShiftIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="nightSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
        <linearGradient id="moonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#nightSky)" />
      <circle cx="11" cy="13" r="1.4" fill="#FDE047" opacity="0.9" />
      <circle cx="37" cy="11" r="1.2" fill="#FFFFFF" opacity="0.8" />
      <circle cx="35" cy="35" r="1.3" fill="#FDE047" opacity="0.8" />
      <circle cx="13" cy="37" r="1" fill="#FFFFFF" opacity="0.7" />
      <path d="M37 19L38 21L40 22L38 23L37 25L36 23L34 22L36 21L37 19Z" fill="#FDE047" opacity="0.85" />
      <path
        d="M26.5 12C20.1 12 15 17.1 15 23.5C15 29.9 20.1 35 26.5 35C29.4 35 32.1 33.9 34.2 32.1C30.2 31.6 27 28.2 27 24.1C27 20 30.2 16.6 34.2 16.1C32.1 14.3 29.4 13.2 26.5 12Z"
        fill="url(#moonGlow)"
      />
    </svg>
  );
}

function AmountField({
  label,
  icon: Icon,
  badgeText,
  badgeClassName,
  buttonClassName,
  expectedVal,
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeClassName?: string;
  buttonClassName?: string;
  expectedVal?: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50/70 to-white p-3 shadow-2xs focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-400/10 transition-all flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-tight text-neutral-700 flex items-center gap-1.5 whitespace-nowrap">
          <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
          {label}
        </span>
        {badgeText && (
          <span
            className={
              badgeClassName ||
              "text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-neutral-100 text-neutral-600 border border-neutral-200"
            }
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 py-1">
        <span className="text-sm font-bold text-neutral-400 select-none">
          RD$
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(formatAmountInput(e.target.value))}
          placeholder="0.00"
          disabled={disabled}
          className="w-full max-w-[140px] bg-transparent text-center text-lg sm:text-xl font-black text-neutral-900 outline-none placeholder:text-neutral-200 tracking-tight"
        />
      </div>

      {expectedVal !== undefined && (
        <div className="flex items-center justify-center pt-1 border-t border-neutral-100">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() =>
              onChange(
                expectedVal > 0
                  ? expectedVal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""
              )
            }
            className={
              buttonClassName ||
              "text-[10px] font-semibold px-2 py-0.5 rounded-lg border shadow-2xs transition-all active:scale-95 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200 cursor-pointer"
            }
          >
            Copiar esperado
          </button>
        </div>
      )}
    </div>
  );
}

function ReporteCuadreThermal({
  caja,
  invoices = [],
  movimientos = [],
  tenant,
  empleadoName,
  rango,
  formato = "80mm",
  mostrarRango = true,
  onBack,
  onFormatChange,
}: {
  caja: Caja;
  invoices?: Invoice[];
  movimientos?: MovimientoCaja[];
  tenant: Tenant | null;
  empleadoName: string;
  rango: string;
  formato: "57mm" | "80mm";
  mostrarRango?: boolean;
  onBack: () => void;
  onFormatChange?: (f: "57mm" | "80mm") => void;
}) {
  const montoInicial = caja.monto_inicial || 0;

  // Filtrar facturas y movimientos del turno con precisión de timestamps
  const startTime = new Date(caja.abierta_en).getTime();
  const endTime = caja.cerrada_en ? new Date(caja.cerrada_en).getTime() : Date.now();

  const shiftInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const t = new Date(inv.createdAt).getTime();
      return !isNaN(t) && t >= startTime && t <= endTime && inv.status !== "cancelled";
    });
  }, [invoices, startTime, endTime]);

  const shiftMovs = useMemo(() => {
    return movimientos.filter((m) => {
      if (m.caja_id === caja.id) return true;
      const t = new Date(m.creado_en).getTime();
      return !isNaN(t) && t >= startTime && t <= endTime;
    });
  }, [movimientos, caja.id, startTime, endTime]);

  // Resumen de Ventas
  const cashSales = shiftInvoices
    .filter((inv) => inv.paymentMethod === "cash")
    .reduce((s, inv) => s + (inv.total || 0), 0);
  const cardSales = shiftInvoices
    .filter((inv) => inv.paymentMethod === "card")
    .reduce((s, inv) => s + (inv.total || 0), 0);
  const transferSales = shiftInvoices
    .filter((inv) => inv.paymentMethod === "transfer")
    .reduce((s, inv) => s + (inv.total || 0), 0);
  const creditSales = shiftInvoices
    .filter((inv) => inv.paymentMethod === "credit")
    .reduce((s, inv) => s + (inv.total || 0), 0);

  const ventasContado = cashSales + cardSales + transferSales;
  const ventasCredito = creditSales;
  const totalFacturadoInvoices = shiftInvoices.reduce((s, inv) => s + (inv.total || 0), 0);

  // Movimientos de Caja (como en TallerCloud: siempre usa los movimientos reales de caja registrados)
  const movCash = shiftMovs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "EFECTIVO" && !m.concepto.startsWith("Cobro de saldo"))
    .reduce((s, m) => s + m.monto, 0);
  const movCard = shiftMovs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "TARJETA" && !m.concepto.startsWith("Cobro de saldo"))
    .reduce((s, m) => s + m.monto, 0);
  const movTransfer = shiftMovs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "TRANSFERENCIA" && !m.concepto.startsWith("Cobro de saldo"))
    .reduce((s, m) => s + m.monto, 0);

  const cash = movCash > 0 ? movCash : cashSales;
  const card = movCard > 0 ? movCard : cardSales;
  const transfer = movTransfer > 0 ? movTransfer : transferSales;

  const abonosEfectivo = shiftMovs
    .filter((m) => (m.tipo === "ABONO" || m.concepto.includes("Cobro de Factura Crédito") || m.concepto.includes("Abono")) && m.metodo === "EFECTIVO")
    .reduce((s, m) => s + m.monto, 0);
  const abonosTarjeta = shiftMovs
    .filter((m) => (m.tipo === "ABONO" || m.concepto.includes("Cobro de Factura Crédito") || m.concepto.includes("Abono")) && m.metodo === "TARJETA")
    .reduce((s, m) => s + m.monto, 0);
  const abonosTransferencia = shiftMovs
    .filter((m) => (m.tipo === "ABONO" || m.concepto.includes("Cobro de Factura Crédito") || m.concepto.includes("Abono")) && m.metodo === "TRANSFERENCIA")
    .reduce((s, m) => s + m.monto, 0);
  const abonosTotal = abonosEfectivo + abonosTarjeta + abonosTransferencia;

  const manualIngresos = shiftMovs
    .filter((m) => m.tipo === "INGRESO" && !m.concepto.toLowerCase().includes("apertura") && !m.concepto.includes("Cobro de Factura"))
    .reduce((s, m) => s + m.monto, 0);
  const manualEgresos = shiftMovs
    .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo) && !m.concepto.toLowerCase().includes("reembolso"))
    .reduce((s, m) => s + m.monto, 0);
  const anulado = shiftMovs
    .filter((m) => m.concepto.toLowerCase().includes("reembolso") || m.concepto.toLowerCase().includes("anulaci"))
    .reduce((s, m) => s + m.monto, 0);

  const computedEfectivo = montoInicial + cash + abonosEfectivo + manualIngresos - manualEgresos - anulado;
  const realTotalEfectivo = (caja.estado === "CERRADA" && caja.monto_esperado_efectivo != null && caja.monto_esperado_efectivo > 0)
    ? caja.monto_esperado_efectivo
    : computedEfectivo;

  const totalTarjetas = card + abonosTarjeta;
  const totalTransferencias = transfer + abonosTransferencia;
  const totalDigital = totalTarjetas + totalTransferencias;
  const totalDineroRecaudado = cash + card + transfer + abonosTotal + manualIngresos;
  const totalFacturado = totalFacturadoInvoices > 0 ? totalFacturadoInvoices : (ventasContado + ventasCredito || totalDineroRecaudado);

  const displayMovs = shiftMovs.filter((m) => {
    return (
      m.tipo !== "VENTA" &&
      !m.concepto.toLowerCase().includes("apertura")
    );
  });

  const facturasProcesadas = shiftInvoices.length || shiftMovs.filter((m) => m.tipo === "VENTA").length;
  const montoDescontado = shiftInvoices.reduce((s, i) => s + (i.discount || 0), 0);
  const itbisRecaudado = shiftInvoices.reduce((s, i) => s + (i.tax || 0), 0);

  const w = formato === "57mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target flex flex-col items-center py-6 print:p-0">
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0 flex flex-col items-center">
        {/* Top Control Bar */}
        <div className="w-full flex justify-between items-center border-b border-neutral-200 pb-3 mb-5 print:hidden px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="rounded-xl border-neutral-200 hover:bg-neutral-100 text-neutral-800 font-bold gap-1.5 h-8.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              {(["57mm", "80mm"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onFormatChange?.(sz)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    formato === sz ? "bg-neutral-950 text-white shadow-2xs" : "text-neutral-600 hover:bg-white"
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-neutral-950 hover:bg-neutral-800 text-white gap-2 font-bold shadow-sm h-8.5 rounded-xl cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        {/* Ticket Térmico */}
        <div
          className={`thermal-ticket mx-auto ${w} bg-white px-3 py-3 text-[11px] leading-snug text-black border border-dashed border-black/20 print:border-none`}
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Encabezado */}
          <div className="text-center space-y-0.5">
            {tenant?.logo ? (
              <div className="flex justify-center mb-1">
                <img
                  src={tenant.logo}
                  alt="Logo"
                  className="h-14 w-auto max-w-[160px] object-contain filter grayscale mx-auto"
                />
              </div>
            ) : (
              <div className="text-lg font-black uppercase tracking-tight text-center leading-tight">
                {tenant?.name || "SERVITRACKS"}
              </div>
            )}
            {tenant?.address && (
              <div className="text-[10px] uppercase font-semibold text-black/80">{tenant.address}</div>
            )}
            {tenant?.rnc && (
              <div className="text-[10px] font-medium">RNC: {tenant.rnc}</div>
            )}
            {tenant?.phone && (
              <div className="text-[10px] font-medium">Tel: {tenant.phone}</div>
            )}
            <div className="my-2 border-t-[1.5px] border-dashed border-black" />
            <div className="text-center font-black uppercase text-[12px] py-1 tracking-wider text-black border border-black rounded-xs">
              ★ CUADRE DE CAJA ★
            </div>
            {mostrarRango && (
              <div className="text-[10px] text-center uppercase font-bold text-black mt-1">{rango}</div>
            )}
          </div>

          <div className="my-2 border-t-[1.5px] border-dashed border-black" />

          {/* Metadatos */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Turno ID:</span>
              <span className="font-bold text-black font-mono">#{caja.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Estado:</span>
              <span className="font-bold uppercase text-black">{caja.estado}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Empleado:</span>
              <span className="font-bold text-black">{empleadoName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Apertura:</span>
              <span className="font-semibold tabular-nums text-black">{formatDateTimeRD(caja.abierta_en)}</span>
            </div>
            {caja.cerrada_en && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">Cierre:</span>
                <span className="font-semibold tabular-nums text-black">{formatDateTimeRD(caja.cerrada_en)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Fecha de Emisión:</span>
              <span className="font-semibold tabular-nums text-black">
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>

          {/* [1] RESUMEN DE VENTAS */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [1] RESUMEN DE VENTAS
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Ventas al Contado:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasContado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Ventas a Crédito:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasCredito)}</span>
            </div>
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL FACTURADO:</span>
              <span className="tabular-nums">{formatRD(totalFacturado)}</span>
            </div>
          </div>

          {/* [2] MOVIMIENTOS DE CAJA */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [2] MOVIMIENTOS DE CAJA
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Sub-bloque: MOVIMIENTOS EN EFECTIVO */}
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- MOVIMIENTOS EN EFECTIVO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Fondo Inicial (Apertura):</span>
              <span className="font-bold tabular-nums">{formatRD(montoInicial)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Ventas en Efectivo:</span>
              <span className="font-bold tabular-nums">{formatRD(cash)}</span>
            </div>
            {abonosEfectivo > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Abonos / Cobros (Efectivo):</span>
                <span className="font-bold tabular-nums">{formatRD(abonosEfectivo)}</span>
              </div>
            )}
            {manualIngresos > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Otros Ingresos (Efectivo):</span>
                <span className="font-bold tabular-nums">{formatRD(manualIngresos)}</span>
              </div>
            )}
            {manualEgresos > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(-) Egresos / Retiros / Gastos:</span>
                <span className="font-bold tabular-nums">{formatRD(manualEgresos)}</span>
              </div>
            )}
            {anulado > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(-) Anulaciones / Reembolsos:</span>
                <span className="font-bold tabular-nums">{formatRD(anulado)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL EFECTIVO EN CAJA:</span>
              <span className="tabular-nums">{formatRD(realTotalEfectivo)}</span>
            </div>

            {caja.estado === "CERRADA" && caja.monto_contado_efectivo != null && (
              <>
                <div className="border-t border-dashed border-black/40 my-1" />
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-black/80">Efectivo Contado (Físico):</span>
                  <span className="tabular-nums font-black">{formatRD(caja.monto_contado_efectivo)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-black">
                  <span>Diferencia:</span>
                  <span className="tabular-nums">
                    {(caja.diferencia || 0) > 0 ? "+" : ""}{formatRD(caja.diferencia || 0)}
                  </span>
                </div>
                <div className="text-center pt-0.5">
                  <span className="text-[10px] font-black px-2 py-0.5 border border-black rounded-xs inline-block uppercase">
                    {(caja.diferencia || 0) === 0 ? "★ CUADRE EXACTO SIN DIFERENCIA ★" :
                     (caja.diferencia || 0) > 0 ? "★ SOBRANTE EN CAJA ★" : "⚠ FALTANTE EN CAJA ⚠"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Sub-bloque: COBROS DIGITALES / BANCO */}
          <div className="mt-2.5 border-t border-dotted border-black/50" />
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- COBROS DIGITALES / BANCO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Tarjetas (Verifone):</span>
              <span className="font-bold tabular-nums">{formatRD(card)}</span>
            </div>
            {abonosTarjeta > 0 && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-black/70 pl-2">↳ Abonos con Tarjeta:</span>
                <span className="font-bold tabular-nums">{formatRD(abonosTarjeta)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Transferencias (Banco):</span>
              <span className="font-bold tabular-nums">{formatRD(transfer)}</span>
            </div>
            {abonosTransferencia > 0 && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-black/70 pl-2">↳ Abonos por Transferencia:</span>
                <span className="font-bold tabular-nums">{formatRD(abonosTransferencia)}</span>
              </div>
            )}
            <div className="border-t border-black my-1" />
            <div className="flex justify-between items-center text-[11.5px] font-bold">
              <span>TOTAL DIGITAL / BANCO:</span>
              <span className="tabular-nums">{formatRD(totalDigital)}</span>
            </div>
          </div>

          {/* Gran Total */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black pt-1" />
          <div className="flex justify-between items-center text-[13px] font-black py-0.5">
            <span className="tracking-tight">TOTAL GENERAL:</span>
            <span className="tabular-nums font-black text-[13.5px]">{formatRD(totalDineroRecaudado)}</span>
          </div>

          {/* [3] DETALLE DE FACTURAS */}
          {shiftInvoices.length > 0 && (
            <>
              <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
              <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
                [3] DETALLE DE FACTURAS ({shiftInvoices.length})
              </div>
              <div className="border-t border-dashed border-black my-1" />
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold border-b border-black/20 pb-1">
                  <span># FACTURA (MÉTODO)</span>
                  <span>MONTO</span>
                </div>
                {shiftInvoices.map((inv) => {
                  const label =
                    inv.paymentMethod === "credit"
                      ? "CRÉDITO"
                      : inv.paymentMethod === "card"
                        ? "TARJETA"
                        : inv.paymentMethod === "transfer"
                          ? "TRANSFERENCIA"
                          : "EFECTIVO";
                  const invNum = inv.ncf || `#${inv.id.slice(-6).toUpperCase()}`;

                  return (
                    <div key={inv.id} className="flex justify-between items-center text-[11px] border-b border-dotted border-black/20 pb-0.5">
                      <span className="font-semibold text-black truncate max-w-[70%]">
                        {invNum} <span className="font-bold text-black uppercase text-[10px]">({label})</span>
                      </span>
                      <span className="font-bold tabular-nums text-black shrink-0">{formatRD(inv.total)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* [4] OTROS MOVIMIENTOS DE CAJA */}
          {displayMovs.length > 0 && (
            <>
              <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
              <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
                [4] OTROS MOVIMIENTOS DE CAJA
              </div>
              <div className="border-t border-dashed border-black my-1" />
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-[10px] font-bold border-b border-black/20 pb-1">
                  <span>CONCEPTO</span>
                  <span>MONTO</span>
                </div>
                {displayMovs.map((m) => {
                  const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo);
                  return (
                    <div key={m.id} className="flex justify-between items-start gap-1 border-b border-dotted border-black/20 pb-0.5">
                      <span className="text-left font-medium leading-tight max-w-[70%]">
                        {(m.concepto || "Sin concepto")
                          .replace(/\s*\[(EFECTIVO|TARJETA|TRANSFERENCIA|CREDITO|PAGO_AL_RETIRAR|.*?)]/gi, "")
                          .trim()}
                      </span>
                      <span className="font-bold tabular-nums shrink-0">
                        {isNegative ? "-" : "+"}
                        {formatRD(m.monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* [5] ESTADÍSTICAS DEL TURNO */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [5] ESTADÍSTICAS DEL TURNO
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Facturas / Órdenes:</span>
              <span className="font-bold tabular-nums">{facturasProcesadas}</span>
            </div>
            {montoDescontado > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">Descuentos Aplicados:</span>
                <span className="font-bold tabular-nums">{formatRD(montoDescontado)}</span>
              </div>
            )}
            {itbisRecaudado > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">ITBIS Recaudado (18%):</span>
                <span className="font-bold tabular-nums">{formatRD(itbisRecaudado)}</span>
              </div>
            )}
            {caja.notas_cierre && (
              <div className="pt-1 border-t border-dotted border-black/40 mt-1">
                <span className="font-semibold text-black/80 block text-[10px]">Notas de Cierre:</span>
                <p className="italic text-[10px] text-black">{caja.notas_cierre}</p>
              </div>
            )}
          </div>

          {/* Firma Cajero */}
          <div className="mt-12 text-center">
            <div className="border-t border-black w-44 mx-auto" />
            <div className="font-bold text-[11px] mt-1 uppercase">Cajero(a) en Turno</div>
            <div className="text-[10px] text-black/70 font-medium">{empleadoName}</div>
          </div>

          {/* Pie de ticket */}
          <div className="mt-5 border-t-[1.5px] border-dashed border-black pt-2 text-center text-[10px] text-black/70 font-medium">
            Documento emitido por el sistema.
            <div className="font-bold text-black mt-0.5">ServiTracks Cloud • {new Date().toLocaleString("es-DO")}</div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${formato === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0 auto !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }
          body > *:not(.atomic-print-target) { display: none !important; }
          .atomic-print-target {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            box-sizing: border-box !important;
          }
          .thermal-ticket {
            display: block !important;
            width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            max-width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }
          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body
  );
}

function ReporteMovimientosTurnoThermal({
  caja,
  movimientos = [],
  tenant,
  empleadoName,
  ventasEf = 0,
  ventasTar = 0,
  ventasTrans = 0,
  otrosIng = 0,
  egresos = 0,
  efectivoEsperado = 0,
  formato = "80mm",
  onBack,
  onFormatChange,
}: {
  caja: Caja;
  movimientos: MovimientoCaja[];
  tenant: Tenant | null;
  empleadoName: string;
  ventasEf: number;
  ventasTar: number;
  ventasTrans: number;
  otrosIng: number;
  egresos: number;
  efectivoEsperado: number;
  formato?: "57mm" | "80mm";
  onBack: () => void;
  onFormatChange?: (f: "57mm" | "80mm") => void;
}) {
  const cronoSortedMovs = useMemo(() => {
    return [...movimientos].sort(
      (a, b) => +new Date(a.creado_en) - +new Date(b.creado_en)
    );
  }, [movimientos]);

  const w = formato === "57mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target flex flex-col items-center py-6 print:p-0">
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0 flex flex-col items-center">
        <div className="w-full flex justify-between items-center border-b border-neutral-200 pb-3 mb-5 print:hidden px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="rounded-xl border-neutral-200 hover:bg-neutral-100 text-neutral-800 font-bold gap-1.5 h-8.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              {(["57mm", "80mm"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onFormatChange?.(sz)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    formato === sz ? "bg-neutral-950 text-white shadow-2xs" : "text-neutral-600 hover:bg-white"
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-neutral-950 hover:bg-neutral-800 text-white gap-2 font-bold shadow-sm h-8.5 rounded-xl cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div
          className={`thermal-ticket mx-auto ${w} bg-white px-3 py-3 text-[11px] leading-snug text-black border border-dashed border-black/20 print:border-none`}
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Encabezado */}
          <div className="text-center space-y-0.5">
            {tenant?.logo ? (
              <div className="flex justify-center mb-1">
                <img
                  src={tenant.logo}
                  alt="Logo"
                  className="h-14 w-auto max-w-[160px] object-contain filter grayscale mx-auto"
                />
              </div>
            ) : (
              <div className="text-lg font-black uppercase tracking-tight text-center leading-tight">
                {tenant?.name || "SERVITRACKS"}
              </div>
            )}
            {tenant?.address && (
              <div className="text-[10px] uppercase font-semibold text-black/80">{tenant.address}</div>
            )}
            {tenant?.rnc && (
              <div className="text-[10px] font-medium">RNC: {tenant.rnc}</div>
            )}
            {tenant?.phone && (
              <div className="text-[10px] font-medium">Tel: {tenant.phone}</div>
            )}
            <div className="my-2 border-t-[1.5px] border-dashed border-black" />
            <div className="text-center font-black uppercase text-[12px] py-1 tracking-wider text-black border border-black rounded-xs">
              ★ AUDITORÍA DE MOVIMIENTOS ★
            </div>
            <div className="text-[10px] text-center uppercase font-bold text-black mt-1">
              TURNO #{caja.id.slice(-6).toUpperCase()} {caja.estado === "ABIERTA" ? "(EN CURSO)" : "(CERRADA)"}
            </div>
          </div>

          <div className="my-2 border-t-[1.5px] border-dashed border-black" />

          {/* Datos del Turno */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Cajero / Responsable:</span>
              <span className="font-bold text-black">{empleadoName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Apertura de Caja:</span>
              <span className="font-semibold tabular-nums text-black">{formatDateTimeRD(caja.abierta_en)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Fecha Auditoría:</span>
              <span className="font-semibold tabular-nums text-black">
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Total Movimientos:</span>
              <span className="font-bold tabular-nums text-black">{movimientos.length}</span>
            </div>
          </div>

          {/* [1] Resumen Financiero */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [1] RESUMEN FINANCIERO
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Sub-bloque: MOVIMIENTOS EN EFECTIVO */}
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- MOVIMIENTOS EN EFECTIVO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Fondo Inicial (Apertura):</span>
              <span className="font-bold tabular-nums">{formatRD(caja.monto_inicial || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Ventas en Efectivo:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasEf)}</span>
            </div>
            {otrosIng > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Otros Ingresos / Abonos:</span>
                <span className="font-bold tabular-nums">{formatRD(otrosIng)}</span>
              </div>
            )}
            {egresos > 0 && (
              <div className="flex justify-between items-center text-black">
                <span className="font-semibold text-black/80">(-) Egresos / Gastos / Retiros:</span>
                <span className="font-bold tabular-nums">{formatRD(egresos)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL EFECTIVO EN CAJA:</span>
              <span className="tabular-nums">{formatRD(efectivoEsperado)}</span>
            </div>
          </div>

          {/* Sub-bloque: COBROS DIGITALES / BANCO */}
          <div className="mt-2.5 border-t border-dotted border-black/50" />
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- COBROS DIGITALES / BANCO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Tarjetas (POS/Verifone):</span>
              <span className="font-bold tabular-nums">{formatRD(ventasTar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Transferencias (Banco):</span>
              <span className="font-bold tabular-nums">{formatRD(ventasTrans)}</span>
            </div>
            <div className="border-t border-black my-1" />
            <div className="flex justify-between items-center text-[11.5px] font-bold">
              <span>TOTAL DIGITAL / BANCO:</span>
              <span className="tabular-nums">{formatRD(ventasTar + ventasTrans)}</span>
            </div>
          </div>

          {/* Gran Total */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black pt-1" />
          <div className="flex justify-between items-center text-[13px] font-black py-0.5">
            <span className="tracking-tight">TOTAL GENERAL:</span>
            <span className="tabular-nums font-black text-[13.5px]">{formatRD(ventasEf + ventasTar + ventasTrans + otrosIng)}</span>
          </div>

          {/* [2] Detalle Cronológico */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [2] REGISTRO DETALLADO ({cronoSortedMovs.length})
          </div>
          <div className="border-t border-dashed border-black my-1" />

          <div className="space-y-1.5">
            {cronoSortedMovs.map((m, idx) => {
              const isEgreso = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo);
              const sign = isEgreso ? "-" : "+";
              const timeStr = new Date(m.creado_en).toLocaleTimeString("es-DO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <div key={m.id || idx} className="border-b border-dotted border-black/30 pb-1.5 text-[11px]">
                  <div className="flex justify-between items-center font-bold">
                    <span>
                      #{idx + 1} {timeStr} <span className="uppercase text-[9.5px] px-1 py-0.2 border border-black rounded-xs">{m.tipo}</span>
                    </span>
                    <span className="tabular-nums font-black">
                      {sign}{formatRD(m.monto)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-black/80 mt-0.5">
                    <span className="truncate max-w-[32ch] font-medium">{m.concepto}</span>
                    <span className="font-bold uppercase text-[10px] text-black">{m.metodo || "N/A"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* [3] Cuadre de Auditoría y Firmas */}
          <div className="mt-4 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [3] VERIFICACIÓN Y AUDITORÍA
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Firma Cajero */}
          <div className="mt-12 text-center">
            <div className="border-t border-black w-44 mx-auto" />
            <div className="font-bold text-[11px] mt-1 uppercase">Cajero(a) en Turno</div>
            <div className="text-[10px] text-black/70 font-medium">{empleadoName}</div>
          </div>

          {/* Pie de ticket */}
          <div className="mt-5 border-t-[1.5px] border-dashed border-black pt-2 text-center text-[10px] text-black/70 font-medium">
            Documento emitido por el sistema.
            <div className="font-bold text-black mt-0.5">ServiTracks Cloud • {new Date().toLocaleString("es-DO")}</div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${formato === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0 auto !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }
          body > *:not(.atomic-print-target) { display: none !important; }
          .atomic-print-target {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            box-sizing: border-box !important;
          }
          .thermal-ticket {
            display: block !important;
            width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            max-width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }
          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body
  );
}

function HistoricoCierresDialog({
  open,
  onOpenChange,
  cajas,
  tenantUsers,
  onSelectPrint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cajas: Caja[];
  tenantUsers: any[];
  onSelectPrint: (caja: Caja) => void;
}) {
  const [empId, setEmpId] = useState("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const closedShifts = useMemo(() => {
    return cajas
      .filter((c) => c.estado === "CERRADA")
      .sort((a, b) => new Date(b.cerrada_en || b.abierta_en).getTime() - new Date(a.cerrada_en || a.abierta_en).getTime());
  }, [cajas]);

  const filteredCierres = useMemo(() => {
    return closedShifts.filter((c) => {
      if (empId !== "all" && c.empleado_id !== empId && c.empleado_cierre_id !== empId) {
        return false;
      }
      if (desde) {
        const dStart = new Date(desde + "T00:00:00").getTime();
        const cDate = new Date(c.abierta_en).getTime();
        if (cDate < dStart) return false;
      }
      if (hasta) {
        const dEnd = new Date(hasta + "T23:59:59").getTime();
        const cDate = new Date(c.cerrada_en || c.abierta_en).getTime();
        if (cDate > dEnd) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const empAbre = tenantUsers.find((u) => u.id === c.empleado_id)?.name?.toLowerCase() || "";
        const empCierra = tenantUsers.find((u) => u.id === c.empleado_cierre_id)?.name?.toLowerCase() || "";
        const notes = (c.notas_cierre || "").toLowerCase();
        if (!empAbre.includes(q) && !empCierra.includes(q) && !notes.includes(q) && !c.id.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [closedShifts, empId, desde, hasta, search, tenantUsers]);

  const totalPages = Math.ceil(filteredCierres.length / 5) || 1;
  const currentCierres = filteredCierres.slice((page - 1) * 5, page * 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
        <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
              <History className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Historial de Cierres de Caja
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                Auditoría histórica de arqueos, verificación de diferencias y reimpresión de comprobantes.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Empleado / Cajero
              </Label>
              <Select value={empId} onValueChange={(val) => { setEmpId(val || "all"); setPage(1); }}>
                <SelectTrigger className="bg-white border-neutral-200 h-8.5 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Todos los empleados">
                    {empId === "all" || !empId
                      ? "Todos los empleados"
                      : tenantUsers.find((u) => u.id === empId)?.name || "Todos los empleados"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {tenantUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Desde
              </Label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => { setDesde(e.target.value); setPage(1); }}
                className="bg-white border-neutral-200 h-8.5 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Hasta
              </Label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => { setHasta(e.target.value); setPage(1); }}
                className="bg-white border-neutral-200 h-8.5 rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  placeholder="Buscar notas/ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 bg-white border-neutral-200 h-8.5 rounded-xl text-xs"
                />
              </div>
              {(desde || hasta || search || empId !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDesde(""); setHasta(""); setSearch(""); setEmpId("all"); setPage(1); }}
                  className="h-8.5 px-2.5 text-xs rounded-xl border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                  title="Limpiar filtros"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-neutral-500" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="border border-neutral-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5"><Unlock className="h-3.5 w-3.5 text-emerald-600" /> Apertura</span>
                  </th>
                  <th className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-rose-600" /> Cierre</span>
                  </th>
                  <th className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-neutral-400" /> Encargado</span>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <span className="flex items-center justify-end gap-1.5"><Banknote className="h-3.5 w-3.5 text-neutral-400" /> Inicial</span>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <span className="flex items-center justify-end gap-1.5"><Coins className="h-3.5 w-3.5 text-blue-600" /> Esperado</span>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <span className="flex items-center justify-end gap-1.5"><Wallet className="h-3.5 w-3.5 text-emerald-600" /> Contado</span>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <span className="flex items-center justify-end gap-1.5"><Scale className="h-3.5 w-3.5 text-amber-500" /> Diferencia</span>
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    <span className="flex items-center justify-center gap-1.5"><Printer className="h-3.5 w-3.5 text-neutral-400" /> Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredCierres.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center">
                      <Search className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                      <div className="text-xs font-bold text-neutral-800">No se encontraron cierres</div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Prueba ajustando los filtros de fecha o cajero.</p>
                    </td>
                  </tr>
                ) : (
                  currentCierres.map((shift) => (
                    <tr key={shift.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-600 font-medium whitespace-nowrap text-[11px]">
                        {formatDateTimeRD(shift.abierta_en)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 font-medium whitespace-nowrap text-[11px]">
                        {formatDateTimeRD(shift.cerrada_en || "")}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">
                        <div className="flex flex-col">
                          <span className="text-xs">Abre: {tenantUsers.find((u) => u.id === shift.empleado_id)?.name || "Cajero"}</span>
                          {shift.empleado_cierre_id && (
                            <span className="text-[10px] text-neutral-400">Cierra: {tenantUsers.find((u) => u.id === shift.empleado_cierre_id)?.name || "N/A"}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-neutral-700">
                        {formatRD(shift.monto_inicial)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-800">
                        {formatRD(shift.monto_esperado_efectivo || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                        {formatRD(shift.monto_contado_efectivo || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <Badge className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] border shadow-2xs font-extrabold",
                          (shift.diferencia || 0) === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          (shift.diferencia || 0) > 0 ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {(shift.diferencia || 0) > 0 ? "+" : ""}{formatRD(shift.diferencia || 0)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            onSelectPrint(shift);
                            onOpenChange(false);
                          }}
                          className="h-7.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 inline-flex items-center"
                        >
                          <Printer className="h-3.5 w-3.5 text-neutral-300" /> Reimprimir
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-neutral-500">
                Mostrando {(page - 1) * 5 + 1} al {Math.min(page * 5, filteredCierres.length)} de {filteredCierres.length} cierres
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 rounded-xl text-xs font-bold border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 rounded-xl text-xs font-bold border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                >
                  Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50/80 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer font-medium hover:bg-neutral-100"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CajaPage() {
  const router = useRouter();
  const { tenant } = useParams();
  
  const { 
    tenants, 
    cajas = [], 
    cajaMovements = [], 
    addCaja, 
    updateCaja,
    addCajaMovement, 
    updateTenant,
    technicians = [],
    invoices = [],
    services = [],
    updateInvoice,
    users = [],
    currentUserId
  } = useStore();

  const currentTenant = tenants.find(t => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const currentUser = useMemo(() => {
    if (currentUserId === 'admin') {
      return { id: 'admin', name: 'Super Administrador', email: 'admin@servitracks.com', role: 'owner' as const, pin: undefined };
    }
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = localStorage.getItem("servitracks-session");
        if (sessionStr) {
          const sess = JSON.parse(sessionStr);
          if (sess.role === 'superadmin') return { id: 'admin', name: 'Super Administrador', email: 'admin@servitracks.com', role: 'owner' as const, pin: undefined };
          if (sess.user) return sess.user;
        }
      } catch (e) {}
    }
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === tenantId) || { id: currentUserId || 'usr_cajero', name: 'Usuario Actual', role: 'cashier' as const, pin: undefined };
  }, [users, currentUserId, tenantId]);

  const tenantUsers = useMemo(() => {
    const list = users.filter(u => u.tenantId === tenantId);
    const uniqueMap = new Map();
    if (currentUser) uniqueMap.set(currentUser.id, currentUser);
    list.forEach(u => uniqueMap.set(u.id, u));
    return Array.from(uniqueMap.values());
  }, [users, tenantId, currentUser]);

  // Active caja shift
  const activeCaja = useMemo(() => {
    return cajas.find(c => c.tenant_id === tenantId && c.estado === 'ABIERTA');
  }, [cajas, tenantId]);

  // Current session movements
  const activeMovements = useMemo(() => {
    if (!activeCaja) return [];
    return cajaMovements.filter(m => m.caja_id === activeCaja.id && m.tenant_id === tenantId);
  }, [cajaMovements, activeCaja, tenantId]);

  // Calculated totals for the current open cash shift
  const metrics = useMemo(() => {
    if (!activeCaja) {
      return {
        montoInicial: 0,
        ingresosEfectivo: 0,
        egresosEfectivo: 0,
        tarjetaTotal: 0,
        transferenciaTotal: 0,
        efectivoEsperado: 0,
        totalGeneral: 0,
        totalManoObra: 0
      };
    }

    const montoInicial = activeCaja.monto_inicial;
    let ingresosEfectivo = 0;
    let egresosEfectivo = 0;
    let tarjetaTotal = 0;
    let transferenciaTotal = 0;
    let totalManoObra = 0;

    activeMovements.forEach(m => {
      const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(m.tipo);
      
      // Accumulate labor if present
      if (m.monto_mano_obra) {
        totalManoObra += m.monto_mano_obra;
      }

      if (m.metodo === 'EFECTIVO') {
        if (isIngreso) {
          ingresosEfectivo += m.monto;
        } else {
          egresosEfectivo += m.monto;
        }
      } else if (m.metodo === 'TARJETA') {
        tarjetaTotal += m.monto;
      } else if (m.metodo === 'TRANSFERENCIA') {
        transferenciaTotal += m.monto;
      }
    });

    const efectivoEsperado = montoInicial + ingresosEfectivo - egresosEfectivo;
    const totalGeneral = efectivoEsperado + tarjetaTotal + transferenciaTotal;

    return {
      montoInicial,
      ingresosEfectivo,
      egresosEfectivo,
      tarjetaTotal,
      transferenciaTotal,
      efectivoEsperado,
      totalGeneral,
      totalManoObra
    };
  }, [activeCaja, activeMovements]);

  // Calculate global pending commission for ALL technicians (past and present shifts)
  const totalGlobalPending = useMemo(() => {
    let globalTotal = 0;
    const pendingInvoices = invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      !inv.isCommissionPaid && 
      inv.mechanicId && 
      inv.mechanicId !== 'none'
    );
    
    pendingInvoices.forEach(inv => {
      const tech = technicians.find(t => t.id === inv.mechanicId);
      (inv.items || []).forEach(item => {
        if (!item) return;
        const isService = isServiceItem(item, services);
        if (isService) {
          const isManoObraDirecta = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
          if (isManoObraDirecta) {
            globalTotal += ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
          } else {
            let safeLabor = item.laborPrice || 0;
            if (item.unitPrice && safeLabor > item.unitPrice) {
              safeLabor = safeLabor / 100;
            }
            if (safeLabor === 0 && tech?.pagoNomina && tech?.tipoPago === "porcentaje") {
              safeLabor = ((item.unitPrice || 0) * tech.pagoNomina) / 100;
            }
            globalTotal += safeLabor * (item.quantity || 1);
          }
        }
      });
    });
    return globalTotal;
  }, [invoices, tenantId, services, technicians]);

  // Helper to calculate pending labor sum for a technician
  const calculateTechCommission = (techId: string) => {
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return { total: 0, pendingIds: [] };

    const pending = invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      inv.mechanicId === techId && 
      !inv.isCommissionPaid
    );

    let total = 0;
    pending.forEach(inv => {
      let invTotal = 0;
      (inv.items || []).forEach(item => {
        if (!item) return;
        const isService = isServiceItem(item, services);
        if (isService) {
          const isManoObraDirecta = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
          if (isManoObraDirecta) {
            invTotal += ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
          } else {
            let safeLabor = item.laborPrice || 0;
            if (item.unitPrice && safeLabor > item.unitPrice) {
              safeLabor = safeLabor / 100;
            }
            if (safeLabor === 0 && tech.pagoNomina && tech.tipoPago === "porcentaje") {
              safeLabor = ((item.unitPrice || 0) * tech.pagoNomina) / 100;
            }
            invTotal += safeLabor * (item.quantity || 1);
          }
        }
      });

      // Fallback si la factura no tiene laborPrice individual por item (calculamos solo sobre los servicios de la factura)
      if (invTotal === 0 && tech.pagoNomina) {
        const servicesSubtotal = (inv.items || [])
          .filter(item => isServiceItem(item, services))
          .reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0);

        if (servicesSubtotal > 0) {
          if (tech.tipoPago === "fijo") {
            invTotal = tech.pagoNomina;
          } else {
            invTotal = (servicesSubtotal * tech.pagoNomina) / 100;
          }
        }
      }

      total += invTotal;
    });
    return { total, pendingIds: pending.map(i => i.id) };
  };

  // Dialog open states
  const [isAperturaOpen, setIsAperturaOpen] = useState(false);
  const [isCierreOpen, setIsCierreOpen] = useState(false);
  const [showCierreSuccess, setShowCierreSuccess] = useState(false);
  const [closedCajaRef, setClosedCajaRef] = useState<Caja | null>(null);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isCajaChicaOpen, setIsCajaChicaOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [showMovimientosPrint, setShowMovimientosPrint] = useState(false);
  const [selectedPrintCaja, setSelectedPrintCaja] = useState<Caja | null>(null);
  const [printFormat, setPrintFormat] = useState<'57mm' | '80mm'>(() => {
    return (currentTenant?.config?.formato_ticket as '57mm' | '80mm') || '80mm';
  });
  const [isCxcOpen, setIsCxcOpen] = useState(false);
  const [cxcSearch, setCxcSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceEdit, setSelectedInvoiceEdit] = useState(false);
  const [movsPage, setMovsPage] = useState(1);
  const [histPage, setHistPage] = useState(1);

  const findInvoiceForMovement = (mov: MovimientoCaja) => {
    // 1. Try to find any sequence of B or E followed by 10-12 digits (NCF/e-CF)
    const ncfMatch = mov.concepto.match(/([BE]\d{10,12})/i);
    if (ncfMatch) {
      const code = ncfMatch[1].toLowerCase();
      const found = invoices.find(inv => inv.ncf && inv.ncf.toLowerCase() === code);
      if (found) return found;
    }

    // 2. Try to find the word "Factura" followed by some code
    const facturaMatch = mov.concepto.match(/Factura\s+([A-Za-z0-9\-]+)/i);
    if (facturaMatch) {
      const code = facturaMatch[1].toLowerCase();
      const found = invoices.find(inv => 
        (inv.ncf && inv.ncf.toLowerCase() === code) ||
        inv.id.toLowerCase().endsWith(code) ||
        inv.id.toLowerCase() === code
      );
      if (found) return found;
    }

    // 3. Try to find hash prefix e.g. #abcdef
    const idMatch = mov.concepto.match(/#([a-z0-9]+)/i);
    if (idMatch) {
      const suffix = idMatch[1].toLowerCase();
      const found = invoices.find(inv => inv.id.toLowerCase().endsWith(suffix));
      if (found) return found;
    }

    // 4. Try fallback matching by exact amount
    const matches = invoices.filter(inv => Math.abs(inv.total - mov.monto) < 0.01);
    if (matches.length === 1) return matches[0];

    return null;
  };
  
  // -- PAGO TECNICO LIQUIDACION --
  const [isPagoTecnicoOpen, setIsPagoTecnicoOpen] = useState(false);
  const [selectedTechToPay, setSelectedTechToPay] = useState("");
  const [pagoTecnicoTab, setPagoTecnicoTab] = useState<'pending' | 'history'>('pending');

  const pendingTechInvoices = useMemo(() => {
    if (!selectedTechToPay) return [];
    return invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      inv.mechanicId === selectedTechToPay && 
      !inv.isCommissionPaid
    );
  }, [invoices, tenantId, selectedTechToPay]);

  const techCommissionInfo = useMemo(() => {
    const tech = technicians.find(t => t.id === selectedTechToPay);
    if (!tech) return { total: 0, items: [] };

    let totalGlobal = 0;
    const rawItems = pendingTechInvoices.map(inv => {
      let comisionTotal = 0;
      let manoObraTotal = 0;
      const nombresAplicables: string[] = [];

      (inv.items || []).forEach(item => {
        if (!item) return;
        const isService = isServiceItem(item, services);
        if (isService) {
          const isManoObra = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
          if (isManoObra) {
            const mTotal = ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
            manoObraTotal += mTotal;
            if (mTotal > 0) nombresAplicables.push(item.name);
          } else {
            let safeLabor = item.laborPrice || 0;
            if (item.unitPrice && safeLabor > item.unitPrice) {
              safeLabor = safeLabor / 100;
            }
            if (safeLabor === 0 && tech.pagoNomina && tech.tipoPago === "porcentaje") {
              safeLabor = ((item.unitPrice || 0) * tech.pagoNomina) / 100;
            }
            const cTotal = safeLabor * (item.quantity || 1);
            comisionTotal += cTotal;
            if (cTotal > 0) nombresAplicables.push(item.name);
          }
        }
      });
      
      // Fallback si no hubo comisión por item directo pero hay subtotal de servicios
      if (comisionTotal === 0 && manoObraTotal === 0 && tech.pagoNomina) {
        const servicesSubtotal = (inv.items || [])
          .filter(item => isServiceItem(item, services))
          .reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0);

        if (servicesSubtotal > 0) {
          if (tech.tipoPago === "fijo") {
            comisionTotal = tech.pagoNomina;
          } else {
            comisionTotal = (servicesSubtotal * tech.pagoNomina) / 100;
          }
          nombresAplicables.push("Comisión por servicios de la factura");
        }
      }

      const totalFila = comisionTotal + manoObraTotal;

      return {
        inv,
        comisionTotal,
        manoObraTotal,
        totalFila,
        nombresAplicables
      };
    });

    const filteredItems = rawItems.filter(item => item.totalFila > 0);
    filteredItems.forEach(item => {
      totalGlobal += item.totalFila;
    });

    return { total: totalGlobal, items: filteredItems };
  }, [pendingTechInvoices, technicians, selectedTechToPay, services]);

  // Histórico de liquidaciones de caja
  const historicalLiquidaciones = useMemo(() => {
    return cajaMovements.filter(m => 
      m.tenant_id === tenantId && 
      (m.tipo === 'PAGO_NOMINA' || (m.concepto && m.concepto.includes('[Pago Técnico]')))
    ).sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }, [cajaMovements, tenantId]);

  const filteredHistoricalLiquidaciones = useMemo(() => {
    if (!selectedTechToPay || selectedTechToPay === 'all') return historicalLiquidaciones;
    return historicalLiquidaciones.filter(m => m.tecnico_id === selectedTechToPay);
  }, [historicalLiquidaciones, selectedTechToPay]);

  const handlePrintLiquidacion = (
    customTechId?: string,
    customItems?: any[],
    customTotal?: number,
    isHistorical: boolean = false,
    historicalDate?: string
  ) => {
    const techId = customTechId || selectedTechToPay;
    const tech = technicians.find(t => t.id === techId);
    
    const items = customItems || techCommissionInfo.items;
    const total = customTotal !== undefined ? customTotal : techCommissionInfo.total;

    const techName = tech ? tech.name : (customTechId ? "Técnico" : "Todos los Técnicos");

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tallerName = currentTenant?.name || "SERVITRACKS";
    const tallerRnc = currentTenant?.rnc || "";
    const dateStr = historicalDate || new Date().toLocaleString("es-DO");
    const statusText = isHistorical ? "RECIBO HISTÓRICO DE LIQUIDACIÓN" : "DESGLOSE DE LIQUIDACIÓN PENDIENTE";

    const rowsHtml = items.length > 0 ? items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          <b style="font-size: 12px; color: #111;">#${(item.inv?.id || item.id || '').slice(-6).toUpperCase()}</b><br/>
          <span style="font-size: 10px; color: #666;">${item.inv?.createdAt ? new Date(item.inv.createdAt).toLocaleDateString("es-DO") : ''}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;">
          ${(item.nombresAplicables || []).join(', ') || 'Comisión por servicios'}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px; font-weight: bold; color: #6b21a8;">
          RD$ ${(item.comisionTotal || item.comision || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px; font-weight: bold; color: #1d4ed8;">
          RD$ ${(item.manoObraTotal || item.manoObra || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px; font-weight: 900;">
          RD$ ${(item.totalFila || item.total || ((item.comisionTotal || 0) + (item.manoObraTotal || 0)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="5" style="padding: 16px; text-align: center; color: #444; font-size: 12px;">
          Liquidación de técnico procesada en caja por un total de <b>RD$ ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
        </td>
      </tr>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Liquidación - ${techName}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 15px; color: #111; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 15px; }
            .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; }
            .header p { margin: 2px 0; color: #555; font-size: 11px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #2563eb; color: white; font-weight: bold; font-size: 10px; margin-top: 6px; text-transform: uppercase; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #e2e8f0; }
            .info-item label { font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px; }
            .info-item span { font-size: 13px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; color: #475569; }
            .totals-box { text-align: right; background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 14px 18px; border-radius: 12px; margin-bottom: 40px; }
            .totals-box .label { font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase; }
            .totals-box .value { font-size: 22px; font-weight: 900; color: #1e3a8a; margin-top: 2px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-line { width: 40%; text-align: center; border-top: 1px dashed #64748b; padding-top: 8px; font-size: 11px; font-weight: bold; color: #334155; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tallerName}</h1>
            ${tallerRnc ? `<p>RNC: ${tallerRnc}</p>` : ''}
            <p style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">COMPROBANTE DE LIQUIDACIÓN DE TÉCNICO</p>
            <div class="badge">${statusText}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>Técnico</label>
              <span>${techName}</span>
            </div>
            <div class="info-item">
              <label>Especialidad</label>
              <span>${(tech as any)?.specialty || 'Servicios Generales'}</span>
            </div>
            <div class="info-item" style="text-align: right;">
              <label>Fecha & Hora</label>
              <span>${dateStr}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Factura / Fecha</th>
                <th>Concepto / Mano de Obra</th>
                <th style="text-align: right;">Comisión</th>
                <th style="text-align: right;">Mano de Obra</th>
                <th style="text-align: right;">Total Fila</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals-box">
            <span class="label">TOTAL ${isHistorical ? 'LIQUIDADO' : 'A LIQUIDAR'}:</span>
            <div class="value">RD$ ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <div class="signatures">
            <div class="sig-line">
              Firma del Técnico (${techName})
            </div>
            <div class="sig-line">
              Recibido / Entregado en Caja
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleLiquidarTecnico = () => {
    if (!activeCaja) return;
    if (!selectedTechToPay || techCommissionInfo.total <= 0) return;

    const tech = technicians.find(t => t.id === selectedTechToPay);
    const monto = techCommissionInfo.total;

    const nuevoMov: MovimientoCaja = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      caja_id: activeCaja.id,
      empleado_id: activeCaja.empleado_id,
      tecnico_id: selectedTechToPay,
      tipo: 'PAGO_NOMINA',
      concepto: `[Pago Técnico] Liquidación a ${tech?.name} por ${pendingTechInvoices.length} facturas`,
      monto,
      metodo: 'EFECTIVO',
      creado_en: new Date().toISOString()
    };

    addCajaMovement(nuevoMov);
    
    // Marcar facturas como pagadas
    pendingTechInvoices.forEach(inv => {
      updateInvoice(inv.id, { isCommissionPaid: true });
    });

    // Imprimir comprobante de liquidación inmediatamente
    handlePrintLiquidacion(selectedTechToPay, techCommissionInfo.items, techCommissionInfo.total, true);

    setIsPagoTecnicoOpen(false);
    setSelectedTechToPay("");
    toast.success("Liquidación a técnico registrada con éxito e impresa");
  };
  
  const cxcInvoices = useMemo(() => {
    return invoices.filter(inv => inv.tenantId === tenantId && inv.status === 'pending' && inv.paymentMethod === 'credit');
  }, [invoices, tenantId]);

  const processedCxcInvoices = useMemo(() => {
    if (!cxcSearch) return cxcInvoices;
    return cxcInvoices.filter(inv => 
      (inv.customerName || '').toLowerCase().includes(cxcSearch.toLowerCase()) ||
      inv.id.toLowerCase().includes(cxcSearch.toLowerCase())
    );
  }, [cxcInvoices, cxcSearch]);
  // Apertura Form States
  const [aperturaMonto, setAperturaMonto] = useState("");
  const [aperturaTurno, setAperturaTurno] = useState<"Mañana" | "Tarde" | "Noche">(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Mañana";
    if (hour < 18) return "Tarde";
    return "Noche";
  });
  const [aperturaNotas, setAperturaNotas] = useState("");

  // Movimiento Form States
  const [movTipo, setMovTipo] = useState<'INGRESO' | 'EGRESO' | 'RETIRO' | 'GASTO_CAJA_CHICA' | 'PAGO_NOMINA'>('INGRESO');
  const [movMonto, setMovMonto] = useState("");
  const [movConcepto, setMovConcepto] = useState("");
  const [movMetodo, setMovMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [movGastoCategoria, setMovGastoCategoria] = useState(CATEGORIAS_GASTOS[0]);
  const [movTecnicoId, setMovTecnicoId] = useState("");

  // Cierre Form States
  const [contadoEfectivo, setContadoEfectivo] = useState("");
  const [contadoTarjeta, setContadoTarjeta] = useState("");
  const [contadoTransferencia, setContadoTransferencia] = useState("");
  const [cierrePin, setCierrePin] = useState("");
  const [cierreNotas, setCierreNotas] = useState("");

  // Caja Chica Setup Form
  const [ccMontoFijo, setCcMontoFijo] = useState(
    currentTenant?.monto_caja_chica ? formatAmountInput(currentTenant.monto_caja_chica.toString()) : "10,000.00"
  );

  useEffect(() => {
    if (isCierreOpen) {
      setContadoEfectivo("");
      setContadoTarjeta(
        metrics.tarjetaTotal > 0
          ? metrics.tarjetaTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ""
      );
      setContadoTransferencia(
        metrics.transferenciaTotal > 0
          ? metrics.transferenciaTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ""
      );
      setCierrePin("");
      setCierreNotas("");
    }
  }, [isCierreOpen, metrics.tarjetaTotal, metrics.transferenciaTotal]);

  // Filters for History
  const [histFiltroCajero, setHistFiltroCajero] = useState("all");
  const [histSearch, setHistSearch] = useState("");

  // Search movements
  const [movSearch, setMovSearch] = useState("");

  // Sort configuration for movements table
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Clickable Cards State
  const [detailsModalType, setDetailsModalType] = useState<'CASH_IN_BOX' | 'SALES_CASH' | 'SALES_CARD' | 'SALES_TRANSFER' | null>(null);
  const [detailsSearch, setDetailsSearch] = useState("");

  const detailsData = useMemo(() => {
    if (!detailsModalType) return { title: '', total: 0, items: [] as MovimientoCaja[] };
    
    let items: MovimientoCaja[] = [];
    let title = '';
    let total = 0;

    switch (detailsModalType) {
      case 'CASH_IN_BOX':
        title = 'Detalle: Efectivo en Caja';
        total = metrics.efectivoEsperado;
        const initialMov = activeCaja ? {
          id: 'apertura',
          tenant_id: tenantId,
          caja_id: activeCaja.id,
          empleado_id: activeCaja.empleado_id,
          tipo: 'INGRESO' as const,
          concepto: 'Apertura de Caja',
          monto: activeCaja.monto_inicial,
          metodo: 'EFECTIVO' as const,
          creado_en: activeCaja.abierta_en
        } : null;
        
        items = activeMovements.filter(m => m.metodo === 'EFECTIVO');
        if (initialMov) items = [initialMov, ...items];
        items.sort((a,b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        break;
      case 'SALES_CASH':
        title = 'Detalle: Ventas en Efectivo';
        total = metrics.ingresosEfectivo;
        items = activeMovements.filter(m => (m.tipo === 'VENTA' || m.tipo === 'INGRESO' || m.tipo === 'ABONO') && m.metodo === 'EFECTIVO');
        break;
      case 'SALES_CARD':
        title = 'Detalle: Ventas con Tarjeta';
        total = metrics.tarjetaTotal;
        items = activeMovements.filter(m => (m.tipo === 'VENTA' || m.tipo === 'INGRESO' || m.tipo === 'ABONO') && m.metodo === 'TARJETA');
        break;
      case 'SALES_TRANSFER':
        title = 'Detalle: Ventas por Transferencia';
        total = metrics.transferenciaTotal;
        items = activeMovements.filter(m => (m.tipo === 'VENTA' || m.tipo === 'INGRESO' || m.tipo === 'ABONO') && m.metodo === 'TRANSFERENCIA');
        break;
    }
    return { title, total, items };
  }, [detailsModalType, activeMovements, activeCaja, metrics]);

  const filteredDetailsItems = useMemo(() => {
    if (!detailsSearch.trim()) return detailsData.items;
    const query = detailsSearch.toLowerCase().trim();
    return detailsData.items.filter(item => 
      (item.concepto || '').toLowerCase().includes(query) ||
      (item.tipo || '').toLowerCase().includes(query) ||
      (item.metodo || '').toLowerCase().includes(query) ||
      item.monto.toString().includes(query)
    );
  }, [detailsData.items, detailsSearch]);

  const filteredDetailsTotal = useMemo(() => {
    if (!detailsSearch.trim()) return detailsData.total;
    if (detailsModalType === 'CASH_IN_BOX') {
      return filteredDetailsItems.reduce((acc, m) => {
        const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(m.tipo);
        return acc + (isIngreso ? m.monto : -m.monto);
      }, 0);
    }
    return filteredDetailsItems.reduce((acc, m) => acc + m.monto, 0);
  }, [filteredDetailsItems, detailsSearch, detailsData.total, detailsModalType]);

  // Open Caja Shift
  const handleAperturaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseAmount(aperturaMonto);
    if (isNaN(monto) || monto < 0) {
      toast.error("Por favor, ingrese un monto inicial válido");
      return;
    }

    const nuevaCaja: Caja = {
      id: `caja-${Date.now()}`,
      tenant_id: tenantId,
      empleado_id: currentUser?.id || "usr_cajero",
      monto_inicial: monto,
      estado: 'ABIERTA',
      abierta_en: new Date().toISOString(),
      notas_apertura: aperturaNotas ? `Turno: ${aperturaTurno} | ${aperturaNotas}` : `Turno: ${aperturaTurno}`
    };

    addCaja(nuevaCaja);
    setIsAperturaOpen(false);
    setAperturaMonto("");
    setAperturaNotas("");
    toast.success("¡Caja abierta exitosamente!", {
      action: {
        label: "Ir a Facturación",
        onClick: () => router.push(`/${tenant}/pos`),
      },
      duration: 8000,
    });
  };

  // Submit quick cash movement
  const handleMovSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseAmount(movMonto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Por favor, ingrese un monto válido");
      return;
    }
    if (!movConcepto.trim()) {
      toast.error("Por favor, ingrese un concepto o motivo del movimiento");
      return;
    }

    if (!activeCaja) {
      toast.error("Debe abrir la caja primero");
      return;
    }

    // Gasto Caja Chica verification
    if (movTipo === 'GASTO_CAJA_CHICA') {
      const actualCChica = currentTenant?.monto_actual_caja_chica ?? 10000;
      if (monto > actualCChica) {
        toast.error(`Fondos insuficientes en Caja Chica. Saldo actual: ${formatRD(actualCChica)}`);
        return;
      }

      // Deduct from tenant's caja chica
      updateTenant(tenantId, {
        monto_actual_caja_chica: actualCChica - monto
      });
    }

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      caja_id: activeCaja.id,
      empleado_id: currentUser?.id || activeCaja.empleado_id,
      tecnico_id: movTipo === 'PAGO_NOMINA' ? movTecnicoId : undefined,
      tipo: movTipo === 'GASTO_CAJA_CHICA' || movTipo === 'PAGO_NOMINA' ? 'EGRESO' : movTipo,
      concepto: movTipo === 'GASTO_CAJA_CHICA' ? `[Caja Chica - ${movGastoCategoria}] ${movConcepto}` : 
                movTipo === 'PAGO_NOMINA' ? `[Pago Nómina] ${movConcepto}` : movConcepto,
      monto,
      metodo: movTipo === 'GASTO_CAJA_CHICA' || movTipo === 'PAGO_NOMINA' ? 'EFECTIVO' : movMetodo,
      creado_en: new Date().toISOString()
    };

    addCajaMovement(nuevoMov);
    
    // Si es pago de nómina, marcamos las facturas pendientes como pagadas
    if (movTipo === 'PAGO_NOMINA' && movTecnicoId) {
      const { pendingIds } = calculateTechCommission(movTecnicoId);
      pendingIds.forEach(id => {
        updateInvoice(id, { isCommissionPaid: true });
      });
    }

    setIsMovOpen(false);
    setMovMonto("");
    setMovConcepto("");
    setMovTecnicoId("");
    toast.success("Movimiento registrado con éxito");
  };

  // Close shift submission
  const handleCierreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaja) return;

    // Validate PIN if configured on currentUser
    if (currentUser?.pin && cierrePin !== currentUser.pin) {
      toast.error("PIN incorrecto. Inténtelo de nuevo.");
      return;
    }

    const valEfectivo = parseAmount(contadoEfectivo);
    const valTarjeta = parseAmount(contadoTarjeta);
    const valTransferencia = parseAmount(contadoTransferencia);

    const totalEsperado = metrics.efectivoEsperado + metrics.tarjetaTotal + metrics.transferenciaTotal;
    const totalContado = valEfectivo + valTarjeta + valTransferencia;
    const diferencia = +(totalContado - totalEsperado).toFixed(2);

    // Warning about large discrepancies
    const umbral = currentTenant?.config?.umbral_diferencia_caja || 500;
    if (Math.abs(diferencia) > umbral) {
      toast.warning(`La diferencia detectada (${formatRD(diferencia)}) supera el umbral límite establecido de ${formatRD(umbral)}.`);
    }

    // Update active caja to closed
    updateCaja(activeCaja.id, {
      estado: 'CERRADA',
      cerrada_en: new Date().toISOString(),
      empleado_cierre_id: currentUser?.id || "usr_cajero",
      monto_esperado_efectivo: metrics.efectivoEsperado,
      monto_contado_efectivo: valEfectivo,
      monto_contado_tarjeta: valTarjeta,
      monto_contado_transferencia: valTransferencia,
      diferencia: diferencia,
      notas_cierre: cierreNotas
    });

    const closedSession = {
      ...activeCaja,
      estado: 'CERRADA' as const,
      cerrada_en: new Date().toISOString(),
      empleado_cierre_id: currentUser?.id || "usr_cajero",
      monto_esperado_efectivo: metrics.efectivoEsperado,
      monto_contado_efectivo: valEfectivo,
      monto_contado_tarjeta: valTarjeta,
      monto_contado_transferencia: valTransferencia,
      diferencia: diferencia,
      notas_cierre: cierreNotas
    };
    
    setClosedCajaRef(closedSession);
    setShowCierreSuccess(true);
    toast.success("¡Caja cerrada correctamente!");
  };

  // Configure Caja Chica limits
  const handleCcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseAmount(ccMontoFijo);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Monto inválido");
      return;
    }

    updateTenant(tenantId, {
      monto_caja_chica: monto,
      monto_actual_caja_chica: monto
    });

    setIsCajaChicaOpen(false);
    toast.success("Fondo de Caja Chica reiniciado y configurado correctamente");
  };

  // Filtered and Sorted movements
  const processedActiveMovements = useMemo(() => {
    let result = activeMovements.filter(m => 
      m.concepto.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.tipo.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.metodo.toLowerCase().includes(movSearch.toLowerCase())
    );

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        // Especial para HORA
        if (sortConfig.key === 'creado_en') {
           aValue = new Date(a.creado_en).getTime();
           bValue = new Date(b.creado_en).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: más recientes primero
      result.sort((a,b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
    }

    return result;
  }, [activeMovements, movSearch, sortConfig]);

  // Request sort
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePayCxc = (invoice: Invoice, metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' = 'EFECTIVO') => {
    if (!activeCaja) {
      toast.error("Debe abrir la caja primero para recibir un pago.");
      return;
    }

    // Mark as paid
    updateInvoice(invoice.id, {
      status: 'paid'
    });

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      caja_id: activeCaja.id,
      empleado_id: activeCaja.empleado_id,
      tipo: 'INGRESO',
      concepto: `Cobro de Factura Crédito #${invoice.id.slice(-6).toUpperCase()} - ${invoice.customerName || 'Cliente'}`,
      monto: invoice.total,
      metodo,
      creado_en: new Date().toISOString()
    };
    addCajaMovement(nuevoMov);
    
    toast.success("Pago registrado con éxito");
  };

  // Closed shifts for history
  const closedShifts = useMemo(() => {
    return cajas
      .filter(c => c.tenant_id === tenantId && c.estado === 'CERRADA')
      .sort((a, b) => new Date(b.cerrada_en || 0).getTime() - new Date(a.cerrada_en || 0).getTime());
  }, [cajas, tenantId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Caja & Cuadre
            </h1>
            {activeCaja ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 gap-1.5 px-2.5 py-0.5 font-bold text-[11px] rounded-full shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Turno Abierto · {activeCaja.notas_apertura?.includes("Turno:") ? activeCaja.notas_apertura.split("Turno:")[1].split("|")[0].trim() : (new Date(activeCaja.abierta_en).getHours() < 12 ? 'Mañana' : 'Tarde')}
              </Badge>
            ) : (
              <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200 gap-1.5 px-2.5 py-0.5 font-semibold text-[11px] rounded-full shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-neutral-400" />
                Caja Cerrada
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">Control de arqueo, cobros del taller, egresos y cuadre operativo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline"
            className="h-9 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold gap-1.5 text-xs shadow-2xs cursor-pointer"
            onClick={() => router.push(`/${tenant}/pos`)}
          >
            <Receipt className="h-3.5 w-3.5 text-neutral-500" /> Facturación / POS
          </Button>

          <Button 
            variant="outline"
            className="h-9 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold gap-1.5 text-xs shadow-2xs cursor-pointer"
            onClick={() => setIsCxcOpen(true)}
          >
            <FileText className="h-3.5 w-3.5 text-blue-600" /> Cuentas x Cobrar
            {cxcInvoices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {cxcInvoices.length}
              </span>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={() => setIsCajaChicaOpen(true)}
            className="h-9 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold gap-1.5 text-xs shadow-2xs cursor-pointer"
          >
            <PiggyBank className="h-3.5 w-3.5 text-emerald-600" /> Caja Chica
          </Button>

          {activeCaja ? (
            <Button 
              onClick={() => setIsCierreOpen(true)}
              className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5 text-xs shadow-sm cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" /> Cerrar Turno
            </Button>
          ) : (
            <Button 
              onClick={() => setIsAperturaOpen(true)}
              className="h-9 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold gap-1.5 text-xs shadow-sm cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5" /> Abrir Caja
            </Button>
          )}
        </div>
      </div>

      {/* ── TOP METRICS ROW (Hero Cards matching Apertura Modal style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Efectivo en Caja */}
        <div 
          className="rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50/70 to-white p-3.5 shadow-2xs cursor-pointer transition-all hover:border-neutral-300 hover:shadow-xs active:scale-[0.995] flex flex-col justify-between"
          onClick={() => setDetailsModalType('CASH_IN_BOX')}
        >
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <Coins className="h-3.5 w-3.5" />
              </div>
              Efectivo en Caja
            </span>
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
              Gaveta
            </span>
          </div>
          <div className="my-0.5">
            <span className="font-heading text-2xl sm:text-[26px] font-extrabold text-neutral-950 tracking-tight block">
              {formatRD(metrics.efectivoEsperado)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 font-medium pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Fondo esperado en caja</span>
            <Eye className="h-3 w-3 text-neutral-300" />
          </div>
        </div>

        {/* Card 2: Ventas Efectivo */}
        <div 
          className="rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50/70 to-white p-3.5 shadow-2xs cursor-pointer transition-all hover:border-neutral-300 hover:shadow-xs active:scale-[0.995] flex flex-col justify-between"
          onClick={() => setDetailsModalType('SALES_CASH')}
        >
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <Banknote className="h-3.5 w-3.5" />
              </div>
              Ventas Efectivo
            </span>
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
              Cash
            </span>
          </div>
          <div className="my-0.5">
            <span className="font-heading text-2xl sm:text-[26px] font-extrabold text-neutral-900 tracking-tight block">
              {formatRD(metrics.ingresosEfectivo)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 font-medium pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Cobrado en efectivo hoy</span>
            <Eye className="h-3 w-3 text-neutral-300" />
          </div>
        </div>

        {/* Card 3: Ventas Tarjeta */}
        <div 
          className="rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50/70 to-white p-3.5 shadow-2xs cursor-pointer transition-all hover:border-neutral-300 hover:shadow-xs active:scale-[0.995] flex flex-col justify-between"
          onClick={() => setDetailsModalType('SALES_CARD')}
        >
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-md bg-sky-50 text-sky-600 border border-sky-200/70 flex items-center justify-center shrink-0">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              Ventas Tarjeta
            </span>
            <span className="text-[9px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded-full">
              POS
            </span>
          </div>
          <div className="my-0.5">
            <span className="font-heading text-2xl sm:text-[26px] font-extrabold text-neutral-900 tracking-tight block">
              {formatRD(metrics.tarjetaTotal)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 font-medium pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Terminal bancaria / Voucher</span>
            <Eye className="h-3 w-3 text-neutral-300" />
          </div>
        </div>

        {/* Card 4: Ventas Transferencia */}
        <div 
          className="rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50/70 to-white p-3.5 shadow-2xs cursor-pointer transition-all hover:border-neutral-300 hover:shadow-xs active:scale-[0.995] flex flex-col justify-between"
          onClick={() => setDetailsModalType('SALES_TRANSFER')}
        >
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/70 flex items-center justify-center shrink-0">
                <Landmark className="h-3.5 w-3.5" />
              </div>
              Transferencias
            </span>
            <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">
              Banco
            </span>
          </div>
          <div className="my-0.5">
            <span className="font-heading text-2xl sm:text-[26px] font-extrabold text-neutral-900 tracking-tight block">
              {formatRD(metrics.transferenciaTotal)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 font-medium pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Transferencias digitales</span>
            <Eye className="h-3 w-3 text-neutral-300" />
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW (3 PANELS: Apertura / Acciones Rápidas / Resumen Turno) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PANEL 1: Estado del Turno & Apertura */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-md bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                  <Unlock className="h-3 w-3" />
                </div>
                Apertura de Turno
              </span>
              {activeCaja && (
                <Badge variant="outline" className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 px-1.5 py-0 rounded-full">
                  Activo
                </Badge>
              )}
            </div>

            {activeCaja ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Fondo Inicial en Gaveta</span>
                  <div className="font-heading text-2xl font-black text-neutral-950 mt-0.5">
                    {formatRD(activeCaja.monto_inicial)}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>Hora de apertura:</span>
                    <span className="font-semibold text-neutral-800">{formatDateTimeRD(activeCaja.abierta_en)}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>Turno:</span>
                    <span className="font-semibold text-neutral-800">
                      {activeCaja.notas_apertura?.includes("Turno:") ? activeCaja.notas_apertura.split("Turno:")[1].split("|")[0].trim() : (new Date(activeCaja.abierta_en).getHours() < 12 ? 'Mañana' : 'Tarde')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="h-10 w-10 rounded-xl bg-neutral-50 text-neutral-400 border border-neutral-200/80 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-neutral-800">Caja cerrada actualmente</div>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[220px] mx-auto">Inicia un turno para comenzar a registrar transacciones.</p>
                <Button 
                  onClick={() => setIsAperturaOpen(true)}
                  className="mt-3 h-8 text-xs font-bold rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Unlock className="h-3.5 w-3.5" /> Abrir turno ahora
                </Button>
              </div>
            )}
          </div>

          {activeCaja && (
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white font-bold text-[10px] uppercase shadow-2xs">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0 truncate">
                  <span className="text-xs font-semibold text-neutral-800 block truncate leading-tight">
                    {tenantUsers.find(e => e.id === activeCaja.empleado_id)?.name || currentUser?.name || "Cajero"}
                  </span>
                  <span className="text-[10px] text-neutral-400 block leading-tight">Responsable en turno</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold text-blue-700 bg-blue-50 border-blue-200 px-1.5 py-0 rounded-full shrink-0">
                Cajero
              </Badge>
            </div>
          )}
        </div>

        {/* PANEL 2: Acciones Rápidas */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-md bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="h-3 w-3" />
                </div>
                Operaciones Rápidas
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">Movimientos</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('INGRESO'); setIsMovOpen(true); }}
                className="h-9 rounded-xl border-emerald-200/90 bg-emerald-50/40 hover:bg-emerald-100/60 text-emerald-800 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Ingreso
              </Button>
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('EGRESO'); setIsMovOpen(true); }}
                className="h-9 rounded-xl border-rose-200/90 bg-rose-50/40 hover:bg-rose-100/60 text-rose-800 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-600 shrink-0" /> Egreso
              </Button>
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('RETIRO'); setIsMovOpen(true); }}
                className="h-9 rounded-xl border-amber-200/90 bg-amber-50/40 hover:bg-amber-100/60 text-amber-800 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <Landmark className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Retiro
              </Button>
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('GASTO_CAJA_CHICA'); setIsMovOpen(true); }}
                className="h-9 rounded-xl border-indigo-200/90 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-800 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <PiggyBank className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> Caja Chica
              </Button>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-100">
            <Button 
              variant="outline" 
              disabled={!activeCaja || totalGlobalPending <= 0}
              onClick={() => setIsPagoTecnicoOpen(true)}
              className="w-full h-8.5 rounded-xl border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <Users className="h-3.5 w-3.5 text-purple-600" />
              <span>Liquidar a Técnicos</span>
              <span className="font-extrabold text-[11px] ml-0.5">({formatRD(totalGlobalPending)})</span>
            </Button>
          </div>
        </div>

        {/* PANEL 3: Resumen del Turno */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-md bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                  <FileText className="h-3 w-3" />
                </div>
                Resumen del Turno
              </span>
              <Badge variant="outline" className="text-[10px] font-bold border-neutral-200 text-neutral-600 px-1.5 py-0">
                {activeMovements.length} movs
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-neutral-600">
                <span>Otros ingresos:</span>
                <span className="font-bold text-emerald-700">
                  +{formatRD(activeMovements.filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + m.monto, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Egresos / gastos:</span>
                <span className="font-bold text-rose-600">
                  -{formatRD(metrics.egresosEfectivo)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-purple-50/60 border border-purple-100 text-purple-900">
                <span className="font-medium text-[11px]">Comisiones por pagar:</span>
                <span className="font-bold text-xs">{formatRD(totalGlobalPending)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-900 block leading-tight">Total en Efectivo</span>
              <span className="text-[10px] text-neutral-400 block leading-tight">Esperado en gaveta</span>
            </div>
            <span className="font-heading text-lg font-black text-neutral-900">
              {formatRD(metrics.efectivoEsperado)}
            </span>
          </div>
        </div>
      </div>

      {/* ── TABLES SECTION ── */}
      
      {/* Movimientos del Turno */}
      <Card className="border border-neutral-200/90 bg-white shadow-2xs rounded-2xl overflow-hidden mt-3">
        <CardHeader className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 border border-neutral-200/80 shadow-2xs shrink-0">
              <History className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-base font-bold text-neutral-900 leading-tight">
                  Movimientos del Turno
                </CardTitle>
                <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-bold border-neutral-200 text-neutral-600 bg-neutral-50 shadow-2xs">
                  {processedActiveMovements.length}
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-400">Entradas, salidas y cobros del turno en curso.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input 
                placeholder="Buscar movimiento..." 
                value={movSearch}
                onChange={(e) => {
                  setMovSearch(e.target.value);
                  setMovsPage(1);
                }}
                className="pl-8 h-8.5 text-xs rounded-xl border-neutral-200/90 bg-neutral-50/50 focus:bg-white"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (!activeCaja) {
                  toast.error("No hay un turno abierto actualmente");
                  return;
                }
                setShowMovimientosPrint(true);
              }}
              className="h-8.5 rounded-xl border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold gap-1.5 px-3 text-xs shadow-2xs cursor-pointer whitespace-nowrap active:scale-95 transition-all"
            >
              <Printer className="h-3.5 w-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const totalMovsPages = Math.ceil(processedActiveMovements.length / 10) || 1;
            const currentActiveMovements = processedActiveMovements.slice((movsPage - 1) * 10, movsPage * 10);

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 w-28 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('creado_en')}>
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-neutral-400" /> Hora {sortConfig?.key === 'creado_en' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                        </th>
                        <th className="py-3 px-4 w-36 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('tipo')}>
                          <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-neutral-400" /> Tipo {sortConfig?.key === 'tipo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                        </th>
                        <th className="py-3 px-4 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('concepto')}>
                          <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-400" /> Concepto / Detalles {sortConfig?.key === 'concepto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                        </th>
                        <th className="py-3 px-4 w-44 hidden md:table-cell">
                          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-neutral-400" /> Responsable / Técnico</span>
                        </th>
                        <th className="py-3 px-4 w-36 text-center cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('metodo')}>
                          <span className="flex items-center justify-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-neutral-400" /> Método {sortConfig?.key === 'metodo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                        </th>
                        <th className="py-3 px-4 w-36 text-right cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('monto')}>
                          <span className="flex items-center justify-end gap-1.5"><Coins className="h-3.5 w-3.5 text-neutral-400" /> Monto {sortConfig?.key === 'monto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {processedActiveMovements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 px-4 text-center">
                            <div className="h-10 w-10 rounded-xl bg-neutral-50 text-neutral-400 border border-neutral-200/80 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div className="text-xs font-bold text-neutral-800">No hay movimientos registrados</div>
                            <p className="text-[11px] text-neutral-400 mt-0.5">Las ventas, cobros y operaciones del turno se reflejarán aquí.</p>
                          </td>
                        </tr>
                      ) : (
                        currentActiveMovements.map((mov) => {
                          const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(mov.tipo);
                          const isEgreso = ['EGRESO', 'RETIRO', 'GASTO_CAJA_CHICA', 'PAGO_NOMINA'].includes(mov.tipo);
                          const matchingInvoice = findInvoiceForMovement(mov);
                          const isClickable = !!matchingInvoice;

                          // Resolve technician or employee responsible
                          const techId = mov.tecnico_id || matchingInvoice?.mechanicId;
                          const techName = techId ? technicians.find(t => t.id === techId)?.name : null;
                          const empName = mov.empleado_id ? tenantUsers.find(u => u.id === mov.empleado_id)?.name : null;

                          return (
                            <tr 
                              key={mov.id} 
                              onClick={() => {
                                if (matchingInvoice) {
                                  setSelectedInvoice(matchingInvoice);
                                  setSelectedInvoiceEdit(false);
                                }
                              }}
                              className={cn(
                                "transition-colors",
                                isClickable ? "hover:bg-neutral-50/80 cursor-pointer" : "hover:bg-neutral-50/60"
                              )}
                            >
                              <td className="py-3 px-4 text-neutral-500 font-medium whitespace-nowrap">
                                {new Date(mov.creado_en).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <Badge className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold border shadow-2xs",
                                  isIngreso ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                  isEgreso ? "bg-rose-50 text-rose-700 border-rose-200" : 
                                  "bg-neutral-100 text-neutral-700 border-neutral-200"
                                )}>
                                  <span className="flex items-center gap-1">
                                    {isIngreso ? <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> : <ArrowUpRight className="h-3 w-3 text-rose-600" />}
                                    {mov.tipo === 'GASTO_CAJA_CHICA' ? 'Caja Chica' : mov.tipo === 'PAGO_NOMINA' ? 'Nómina' : mov.tipo === 'INGRESO' ? 'Ingreso' : mov.tipo}
                                  </span>
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-neutral-800">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <span className="font-semibold text-neutral-900 block">{mov.concepto}</span>
                                    {matchingInvoice?.customerName && (
                                      <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1 mt-0.5">
                                        <User className="h-3 w-3 text-neutral-400" />
                                        Cliente: {matchingInvoice.customerName}
                                      </span>
                                    )}
                                  </div>
                                  {isClickable && (
                                    <Badge variant="outline" className="text-[10px] font-bold border-neutral-200 bg-neutral-50 text-neutral-700 rounded-md py-0.5 px-2 hover:bg-neutral-100 transition-colors w-fit self-start sm:self-auto gap-1">
                                      <FileText className="h-3 w-3 text-neutral-400" /> Ver Factura
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-neutral-600 hidden md:table-cell whitespace-nowrap">
                                {techName ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                    <Users className="h-3 w-3" /> {techName}
                                  </span>
                                ) : empName ? (
                                  <span className="text-[11px] font-medium text-neutral-600">
                                    {empName}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {mov.metodo === 'EFECTIVO' ? (
                                  <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                    <Wallet className="h-3 w-3 text-emerald-600" /> EFECTIVO
                                  </span>
                                ) : mov.metodo === 'TARJETA' ? (
                                  <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                                    <CreditCard className="h-3 w-3 text-blue-600" /> TARJETA
                                  </span>
                                ) : mov.metodo === 'TRANSFERENCIA' ? (
                                  <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200/70">
                                    <Smartphone className="h-3 w-3 text-violet-600" /> TRANSF.
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-xs">—</span>
                                )}
                              </td>
                              <td className={cn(
                                "py-3 px-4 text-right font-extrabold text-sm tabular-nums whitespace-nowrap",
                                isIngreso ? "text-emerald-600" : "text-rose-500"
                              )}>
                                {isIngreso ? "+" : "-"}{formatRD(mov.monto)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {totalMovsPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-neutral-100 bg-neutral-50/50">
                    <span className="text-xs text-neutral-500">
                      Mostrando {(movsPage - 1) * 10 + 1} al {Math.min(movsPage * 10, processedActiveMovements.length)} de {processedActiveMovements.length} movimientos
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMovsPage((p) => Math.max(1, p - 1))}
                        disabled={movsPage === 1}
                        className="h-8 rounded-xl text-xs font-bold border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                      >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMovsPage((p) => Math.min(totalMovsPages, p + 1))}
                        disabled={movsPage === totalMovsPages}
                        className="h-8 rounded-xl text-xs font-bold border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                      >
                        Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Histórico de Cierres */}
      <Card className="border border-neutral-200/90 bg-white shadow-2xs rounded-2xl overflow-hidden mt-4">
        <CardHeader className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 border border-neutral-200/80 shadow-2xs shrink-0">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base font-bold text-neutral-900 leading-tight">
                Histórico de Cierres
              </CardTitle>
              <p className="text-[11px] text-neutral-400">Auditoría de arqueos y cuadres pasados.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              className="rounded-xl border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 font-bold gap-1.5 text-xs h-8.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              onClick={() => {
                if (activeCaja) {
                  setSelectedPrintCaja(activeCaja);
                } else if (closedShifts.length > 0) {
                  setSelectedPrintCaja(closedShifts[0]);
                } else {
                  toast.error("No hay cuadres disponibles para imprimir");
                }
              }}
            >
              <Printer className="h-3.5 w-3.5 text-emerald-600" /> Imprimir Arqueo
            </Button>
            <Button 
              className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold gap-1.5 text-xs h-8.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              onClick={() => setIsHistoricoOpen(true)}
            >
              <History className="h-3.5 w-3.5" /> Ver Cierres
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const totalHistPages = Math.ceil(closedShifts.length / 5) || 1;
            const currentClosedShifts = closedShifts.slice((histPage - 1) * 5, histPage * 5);

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4"><span className="flex items-center gap-1.5"><Unlock className="h-3.5 w-3.5 text-emerald-600" /> Apertura</span></th>
                        <th className="py-3 px-4"><span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-rose-600" /> Cierre</span></th>
                        <th className="py-3 px-4"><span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-neutral-400" /> Encargado</span></th>
                        <th className="py-3 px-4 text-right"><span className="flex items-center justify-end gap-1.5"><Banknote className="h-3.5 w-3.5 text-neutral-500" /> Inicial</span></th>
                        <th className="py-3 px-4 text-right"><span className="flex items-center justify-end gap-1.5"><Coins className="h-3.5 w-3.5 text-blue-600" /> Esperado</span></th>
                        <th className="py-3 px-4 text-right"><span className="flex items-center justify-end gap-1.5"><Wallet className="h-3.5 w-3.5 text-emerald-600" /> Contado</span></th>
                        <th className="py-3 px-4 text-right"><span className="flex items-center justify-end gap-1.5"><Scale className="h-3.5 w-3.5 text-amber-500" /> Diferencia</span></th>
                        <th className="py-3 px-4 text-center"><span className="flex items-center justify-center gap-1.5"><Printer className="h-3.5 w-3.5 text-neutral-400" /> Recibo</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {closedShifts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 px-4 text-center">
                            <div className="h-10 w-10 rounded-xl bg-neutral-50 text-neutral-400 border border-neutral-200/80 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                              <History className="h-5 w-5" />
                            </div>
                            <div className="text-xs font-bold text-neutral-800">No hay historial de cierres</div>
                            <p className="text-[11px] text-neutral-400 mt-0.5">Al cerrar un turno, se archivará automáticamente aquí para auditoría.</p>
                          </td>
                        </tr>
                      ) : (
                        currentClosedShifts.map((shift) => (
                          <tr key={shift.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="py-3 px-4 text-neutral-600 font-medium whitespace-nowrap">
                              {formatDateTimeRD(shift.abierta_en)}
                            </td>
                            <td className="py-3 px-4 text-neutral-600 font-medium whitespace-nowrap">
                              {formatDateTimeRD(shift.cerrada_en || "")}
                            </td>
                            <td className="py-3 px-4 font-semibold text-neutral-800">
                              <div className="flex flex-col">
                                <span className="text-xs">Abre: {tenantUsers.find((u) => u.id === shift.empleado_id)?.name || "Cajero"}</span>
                                {shift.empleado_cierre_id && (
                                  <span className="text-[10px] text-neutral-500">Cierra: {tenantUsers.find((u) => u.id === shift.empleado_cierre_id)?.name || "N/A"}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-neutral-800">
                              {formatRD(shift.monto_inicial)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-neutral-800">
                              {formatRD(shift.monto_esperado_efectivo || 0)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-neutral-800">
                              {formatRD(shift.monto_contado_efectivo || 0)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              <Badge className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] border shadow-2xs font-extrabold",
                                (shift.diferencia || 0) === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (shift.diferencia || 0) > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                              )}>
                                {(shift.diferencia || 0) > 0 ? "+" : ""}{formatRD(shift.diferencia || 0)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                onClick={() => setSelectedPrintCaja(shift)}
                                className="h-7.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 inline-flex items-center"
                              >
                                <Printer className="h-3.5 w-3.5 text-neutral-300" /> Reimprimir
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalHistPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-neutral-100 bg-neutral-50/50">
                    <span className="text-xs text-neutral-500">
                      Mostrando {(histPage - 1) * 5 + 1} al {Math.min(histPage * 5, closedShifts.length)} de {closedShifts.length} cierres
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                        disabled={histPage === 1}
                        className="h-8 rounded-xl text-xs font-bold border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                      >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistPage((p) => Math.min(totalHistPages, p + 1))}
                        disabled={histPage === totalHistPages}
                        className="h-8 rounded-xl text-xs font-bold border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                      >
                        Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>


      {/* DIALOG 1: Apertura de Caja */}
      <Dialog open={isAperturaOpen} onOpenChange={setIsAperturaOpen}>
        <DialogContent className="sm:max-w-md w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <Unlock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Apertura de Caja
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  Fondo inicial en efectivo para iniciar operaciones del turno.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <form onSubmit={handleAperturaSubmit} className="space-y-3">
            {/* HERO CARD MONTO INICIAL */}
            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  Efectivo Inicial
                </span>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                  Fondo base
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm select-none">RD$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={aperturaMonto}
                  onChange={(e) => setAperturaMonto(formatAmountInput(e.target.value))}
                  placeholder="0.00"
                  className="h-10 w-full pl-11 pr-3 text-center font-heading text-2xl font-bold text-neutral-950 tracking-tight rounded-lg border border-neutral-200 bg-white shadow-2xs focus:ring-2 focus:ring-neutral-950/20 outline-none placeholder:text-neutral-300"
                />
              </div>

              {/* Botones de montos sugeridos en 1 sola fila */}
              <div className="grid grid-cols-5 gap-1 pt-1.5">
                {[
                  { label: "500", val: "500" },
                  { label: "1,000", val: "1,000" },
                  { label: "2,000", val: "2,000" },
                  { label: "3,000", val: "3,000" },
                  { label: "5,000", val: "5,000" },
                ].map((p) => {
                  const isSelected = parseAmount(aperturaMonto) === parseAmount(p.val) && aperturaMonto !== "";
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setAperturaMonto(formatAmountInput(p.val))}
                      className={cn(
                        "text-[10px] font-semibold py-1 px-1 rounded-md border text-center transition-all active:scale-95 cursor-pointer whitespace-nowrap",
                        isSelected
                          ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs font-bold"
                          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECCIONA EL TURNO (Horizontal compacto) */}
            <div className="space-y-1">
              <Label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                Turno Operativo
              </Label>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    id: "Mañana" as const,
                    label: "Mañana",
                    IconComponent: MorningShiftIcon,
                    activeRing: "border-orange-500 bg-orange-50/60 ring-1 ring-orange-500 text-orange-950 font-bold",
                  },
                  {
                    id: "Tarde" as const,
                    label: "Tarde",
                    IconComponent: AfternoonShiftIcon,
                    activeRing: "border-sky-500 bg-sky-50/60 ring-1 ring-sky-500 text-sky-950 font-bold",
                  },
                  {
                    id: "Noche" as const,
                    label: "Noche",
                    IconComponent: NightShiftIcon,
                    activeRing: "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 text-indigo-950 font-bold",
                  },
                ].map((t) => {
                  const Icon = t.IconComponent;
                  const sel = aperturaTurno === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAperturaTurno(t.id)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer relative",
                        sel
                          ? t.activeRing
                          : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 shadow-2xs font-medium"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-xs leading-none">{t.label}</span>
                      {sel && (
                        <div className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-neutral-950 text-white">
                          <Check className="h-2 w-2" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CAJERO RESPONSABLE (Barra compacta en 1 línea) */}
            <div className="space-y-1">
              <Label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                Cajero Responsable
              </Label>
              <div className="flex items-center justify-between py-1 px-2.5 rounded-lg border border-neutral-200/90 bg-neutral-50/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white font-bold text-[10px] uppercase shadow-2xs">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-neutral-900 block truncate leading-tight">
                      {currentUser?.name || "Usuario de Caja"}
                    </span>
                    <span className="text-[10px] text-neutral-500 capitalize block leading-tight">
                      {currentUser?.role === 'owner' ? 'Propietario / Admin' : currentUser?.role || 'Cajero'}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 px-1.5 py-0 rounded-full shrink-0">
                  Sesión activa
                </Badge>
              </div>
            </div>

            {/* NOTAS ADICIONALES (1 línea compacta) */}
            <div className="space-y-1">
              <Label htmlFor="apertura-notas" className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                Notas (Opcional)
              </Label>
              <Input 
                id="apertura-notas"
                placeholder="Observaciones iniciales del turno..."
                value={aperturaNotas}
                onChange={(e) => setAperturaNotas(e.target.value)}
                className="h-8 rounded-lg border-neutral-200 text-xs px-2.5"
              />
            </div>

            <DialogFooter className="mt-2 pt-2 border-t border-neutral-100 flex gap-2 sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAperturaOpen(false)}
                className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="h-8 text-xs rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold cursor-pointer"
              >
                <Unlock className="h-3.5 w-3.5 mr-1" /> Abrir Caja
              </Button>
            </DialogFooter>
          </form>
        </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Cierre y Arqueo de Caja */}
      <Dialog 
        open={isCierreOpen} 
        onOpenChange={(v) => {
          setIsCierreOpen(v);
          if (!v) {
            setShowCierreSuccess(false);
            setClosedCajaRef(null);
            setContadoEfectivo("");
            setContadoTarjeta("");
            setContadoTransferencia("");
            setCierrePin("");
            setCierreNotas("");
          }
        }}
      >
        <DialogContent className="sm:max-w-xl md:max-w-2xl w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  {showCierreSuccess ? "Caja Cerrada Exitosamente" : "Cerrar Caja — Arqueo y Cuadre"}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  {showCierreSuccess 
                    ? "El cuadre ha sido registrado y el turno ha finalizado."
                    : "Ingresa el conteo físico para verificar diferencias y cerrar el turno."}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
          {showCierreSuccess && closedCajaRef ? (
            <div className="py-2 text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                  <Lock className="h-7 w-7" />
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1 text-white shadow-2xs ring-2 ring-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-heading font-black text-neutral-900 tracking-tight">Turno Cerrado Correctamente</h2>
                <p className="text-xs text-neutral-500">
                  El arqueo físico y las diferencias han quedado archivadas en el historial.
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 space-y-2.5 max-w-md mx-auto text-left shadow-2xs">
                <div className="flex justify-between text-xs text-neutral-600 font-semibold">
                  <span>Efectivo Declarado:</span>
                  <span className="text-neutral-950 font-bold">{formatRD(closedCajaRef.monto_contado_efectivo || 0)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600 font-semibold">
                  <span>Total Contado (Efectivo + Digital):</span>
                  <span className="text-neutral-950 font-bold">
                    {formatRD((closedCajaRef.monto_contado_efectivo || 0) + (closedCajaRef.monto_contado_tarjeta || 0) + (closedCajaRef.monto_contado_transferencia || 0))}
                  </span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Balance de Diferencia
                  </span>
                  <span className={cn(
                    "text-2xl font-heading font-black mt-0.5 tracking-tight",
                    (closedCajaRef.diferencia || 0) === 0 ? "text-emerald-700" : (closedCajaRef.diferencia || 0) > 0 ? "text-amber-700" : "text-rose-700"
                  )}>
                    {(closedCajaRef.diferencia || 0) > 0 ? "+" : ""}{formatRD(closedCajaRef.diferencia || 0)}
                  </span>
                  <Badge className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase mt-1",
                    (closedCajaRef.diferencia || 0) === 0 ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    (closedCajaRef.diferencia || 0) > 0 ? "bg-amber-100 text-amber-800 border-amber-200" :
                    "bg-rose-100 text-rose-800 border-rose-200"
                  )}>
                    {(closedCajaRef.diferencia || 0) === 0 ? "Caja Cuadrada ✓" :
                     (closedCajaRef.diferencia || 0) > 0 ? "Sobrante" : "Faltante"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 max-w-md mx-auto">
                <Button
                  type="button"
                  onClick={() => {
                    setIsCierreOpen(false);
                    setShowCierreSuccess(false);
                    setClosedCajaRef(null);
                  }}
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold rounded-xl border-neutral-200 hover:bg-neutral-100 gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver a caja
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const cRef = closedCajaRef;
                    setIsCierreOpen(false);
                    setShowCierreSuccess(false);
                    setClosedCajaRef(null);
                    setSelectedPrintCaja(cRef);
                  }}
                  className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white h-9 text-xs font-bold gap-1.5 shadow-xs rounded-xl cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir Cierre
                </Button>
              </div>
            </div>
          ) : (() => {
            const valEfectivo = parseAmount(contadoEfectivo);
            const valTarjeta = parseAmount(contadoTarjeta);
            const valTransferencia = parseAmount(contadoTransferencia);

            const totalEsperado = metrics.efectivoEsperado + metrics.tarjetaTotal + metrics.transferenciaTotal;
            const totalContado = valEfectivo + valTarjeta + valTransferencia;
            const dif = +(totalContado - totalEsperado).toFixed(2);
            const umbral = currentTenant?.config?.umbral_diferencia_caja || 500;

            return (
              <form onSubmit={handleCierreSubmit} className="space-y-3 pt-1">
                {/* Valores Esperados en Sistema */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-1.5 text-center shadow-2xs">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1">
                      <Banknote className="h-3 w-3" /> Efectivo
                    </div>
                    <div className="font-heading text-sm font-black text-emerald-700 mt-0.5">
                      {formatRD(metrics.efectivoEsperado)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-1.5 text-center shadow-2xs">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-sky-600 flex items-center justify-center gap-1">
                      <CreditCard className="h-3 w-3" /> Tarjeta
                    </div>
                    <div className="font-heading text-sm font-black text-sky-700 mt-0.5">
                      {formatRD(metrics.tarjetaTotal)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-1.5 text-center shadow-2xs">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 flex items-center justify-center gap-1">
                      <Landmark className="h-3 w-3" /> Transf.
                    </div>
                    <div className="font-heading text-sm font-black text-indigo-700 mt-0.5">
                      {formatRD(metrics.transferenciaTotal)}
                    </div>
                  </div>
                </div>

                {/* Conteo Físico por Método */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-0.5">
                    <Label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Conteo Físico en Caja
                    </Label>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      Esperado: <strong className="text-neutral-800">{formatRD(totalEsperado)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <AmountField
                      label="Efectivo"
                      icon={Banknote}
                      badgeText="Físico"
                      badgeClassName="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                      buttonClassName="text-[9px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs transition-all active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/90 cursor-pointer"
                      expectedVal={metrics.efectivoEsperado}
                      value={contadoEfectivo}
                      onChange={setContadoEfectivo}
                      autoFocus
                    />
                    <AmountField
                      label="Tarjeta"
                      icon={CreditCard}
                      badgeText="POS"
                      badgeClassName="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 bg-sky-100 text-sky-800 border border-sky-300/80"
                      buttonClassName="text-[9px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs transition-all active:scale-95 bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200/90 cursor-pointer"
                      expectedVal={metrics.tarjetaTotal}
                      value={contadoTarjeta}
                      onChange={setContadoTarjeta}
                    />
                    <AmountField
                      label="Transferencia"
                      icon={Landmark}
                      badgeText="Banco"
                      badgeClassName="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 bg-indigo-100 text-indigo-800 border border-indigo-300/80"
                      buttonClassName="text-[9px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs transition-all active:scale-95 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200/90 cursor-pointer"
                      expectedVal={metrics.transferenciaTotal}
                      value={contadoTransferencia}
                      onChange={setContadoTransferencia}
                    />
                  </div>
                </div>

                {/* Resumen del Cuadre / Diferencia */}
                <div
                  className={cn(
                    "rounded-xl p-2.5 border transition-all",
                    dif === 0
                      ? "bg-emerald-50 border-emerald-200 shadow-2xs"
                      : dif < 0
                        ? "bg-rose-50 border-rose-200 shadow-2xs"
                        : "bg-amber-50 border-amber-200 shadow-2xs"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          dif === 0
                            ? "bg-emerald-100 text-emerald-700"
                            : dif < 0
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {dif === 0 ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            "text-xs font-bold tracking-tight leading-tight",
                            dif === 0
                              ? "text-emerald-900"
                              : dif < 0
                                ? "text-rose-900"
                                : "text-amber-900"
                          )}
                        >
                          {dif === 0
                            ? "Caja perfectamente cuadrada"
                            : dif < 0
                              ? "Faltante en caja"
                              : "Sobrante en caja"}
                        </div>
                        <div className="text-[10px] text-neutral-500 flex items-center gap-1 flex-wrap mt-0.5">
                          <span>Esperado: <strong className="text-neutral-700">{formatRD(totalEsperado)}</strong></span>
                          <span>•</span>
                          <span>Contado: <strong className="text-neutral-700">{formatRD(totalContado)}</strong></span>
                        </div>
                        {Math.abs(dif) > umbral && (
                          <div className="text-[9px] font-bold text-rose-600 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Excede tolerancia ({formatRD(umbral)})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          "font-heading text-base sm:text-lg font-black",
                          dif === 0
                            ? "text-emerald-700"
                            : dif < 0
                              ? "text-rose-700"
                              : "text-amber-700"
                        )}
                      >
                        {formatRD(Math.abs(dif))}
                      </div>
                      <div className="text-[9px] font-semibold text-neutral-500">
                        {dif === 0 ? "Sin diferencias" : dif < 0 ? "Faltante" : "Sobrante"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cajero Responsable del Cierre (Usuario Actual) y PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-neutral-100 pt-2">
                  <div className="space-y-1">
                    <Label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                      Cajero que Cierra
                    </Label>
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 py-1 px-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-white font-bold text-[10px] uppercase shadow-2xs shrink-0">
                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate leading-tight">
                          {currentUser?.name || "Cajero Responsable"}
                        </div>
                        <div className="text-[9px] text-neutral-500 capitalize leading-tight">
                          {currentUser?.role === 'owner' ? 'Propietario / Admin' : currentUser?.role || 'Cajero'}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-semibold text-blue-700 bg-blue-50 border-blue-200 px-1 py-0 rounded-full shrink-0">
                        Firma
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="cierre-pin" className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                      PIN {currentUser?.pin ? '(Requerido)' : '(Opcional)'}
                    </Label>
                    <Input 
                      id="cierre-pin"
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      required={!!currentUser?.pin}
                      value={cierrePin}
                      onChange={(e) => setCierrePin(e.target.value)}
                      className="h-8 rounded-lg border-neutral-200 text-center font-mono tracking-widest text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cierre-notas" className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                    Comentarios de Cuadre (Opcional)
                  </Label>
                  <Input 
                    id="cierre-notas"
                    placeholder="Observaciones de diferencias o novedades..."
                    value={cierreNotas}
                    onChange={(e) => setCierreNotas(e.target.value)}
                    className="h-8 rounded-lg border-neutral-200 text-xs px-2.5"
                  />
                </div>

                <DialogFooter className="mt-2 pt-2 border-t border-neutral-100 flex gap-2 sm:justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCierreOpen(false)}
                    className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="h-8 text-xs rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold shadow-xs cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5 mr-1" /> Registrar Cuadre y Cerrar
                  </Button>
                </DialogFooter>
              </form>
            );
          })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Registrar Movimiento Rápido */}
      <Dialog open={isMovOpen} onOpenChange={setIsMovOpen}>
        <DialogContent className="sm:max-w-lg w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Registrar Movimiento Extra
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  Entradas, salidas de efectivo o gastos directos del turno.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <form onSubmit={handleMovSubmit} className="space-y-3">
            {/* TIPO DE OPERACION */}
            <div className="space-y-1">
              <Label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                Tipo de Operación
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { value: 'INGRESO', label: 'Ingreso Extra', icon: ArrowDownLeft, activeClass: 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500 font-bold' },
                  { value: 'EGRESO', label: 'Egreso Extra', icon: ArrowUpRight, activeClass: 'border-rose-500 bg-rose-50/70 text-rose-950 ring-1 ring-rose-500 font-bold' },
                  { value: 'RETIRO', label: 'Retiro / Remesa', icon: Landmark, activeClass: 'border-amber-500 bg-amber-50/70 text-amber-950 ring-1 ring-amber-500 font-bold' },
                  { value: 'GASTO_CAJA_CHICA', label: 'Caja Chica', icon: PiggyBank, activeClass: 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500 font-bold' },
                  { value: 'PAGO_NOMINA', label: 'Pago Nómina', icon: Users, activeClass: 'border-purple-500 bg-purple-50/70 text-purple-950 ring-1 ring-purple-500 font-bold' },
                ].map(opt => {
                  const Icon = opt.icon;
                  const sel = movTipo === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMovTipo(opt.value as any)}
                      className={cn(
                        "flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs active:scale-95",
                        sel
                          ? opt.activeClass
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 font-medium"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HERO CARD MONTO */}
            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-neutral-900" />
                  Monto de la Operación
                </span>
                <span className="text-[9px] font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded-full">
                  RD$ Dominicano
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm select-none">RD$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={movMonto}
                  onChange={(e) => setMovMonto(formatAmountInput(e.target.value))}
                  placeholder="0.00"
                  className="h-10 w-full pl-11 pr-3 text-center font-heading text-2xl font-bold text-neutral-900 tracking-tight rounded-lg border border-neutral-200 bg-white shadow-2xs focus:ring-2 focus:ring-neutral-900/10 outline-none placeholder:text-neutral-300"
                />
              </div>
            </div>

            {/* METODO O SELECT ESPECIFICO */}
            <div className="space-y-1">
              {movTipo !== 'GASTO_CAJA_CHICA' && movTipo !== 'PAGO_NOMINA' && (
                <div>
                  <Label htmlFor="mov-metodo" className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5 mb-1">
                    Forma de Pago
                  </Label>
                  <Select value={movMetodo} onValueChange={(val) => val && setMovMetodo(val as any)}>
                    <SelectTrigger className="h-8.5 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {movTipo === 'GASTO_CAJA_CHICA' && (
                <div>
                  <Label htmlFor="mov-gasto-cat" className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5 mb-1">
                    Categoría del Gasto
                  </Label>
                  <Select value={movGastoCategoria} onValueChange={(val) => val && setMovGastoCategoria(val)}>
                    <SelectTrigger className="h-8.5 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CATEGORIAS_GASTOS.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {movTipo === 'PAGO_NOMINA' && (
                <div>
                  <Label htmlFor="mov-tecnico" className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5 mb-1">
                    Técnico a Liquidar
                  </Label>
                  <Select value={movTecnicoId} onValueChange={(val) => {
                      if (!val) return;
                      setMovTecnicoId(val);
                      const tech = technicians.find(t => t.id === val);
                      if (tech) {
                        const { total, pendingIds } = calculateTechCommission(val);
                        setMovMonto(formatAmountInput(total.toFixed(2)));
                        setMovConcepto(`Pago Nómina a ${tech.name} (${pendingIds.length} facturas pendientes)`);
                      }
                    }}>
                    <SelectTrigger className="h-8.5 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Seleccione Técnico" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {technicians.filter(t => t.tenantId === tenantId).map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* CONCEPTO */}
            <div className="space-y-1">
              <Label htmlFor="mov-concepto" className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-0.5">
                Concepto / Motivo de la Operación
              </Label>
              <Input 
                id="mov-concepto"
                placeholder="Detalle el concepto (ej: Pago almuerzo técnicos, retiro gerencia...)"
                required
                value={movConcepto}
                onChange={(e) => setMovConcepto(e.target.value)}
                className="h-8.5 rounded-lg border-neutral-200 text-xs px-2.5"
              />
            </div>

            <DialogFooter className="mt-2 pt-2 border-t border-neutral-100 flex gap-2 sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsMovOpen(false)}
                className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="h-8 text-xs rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold cursor-pointer shadow-2xs gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Registrar Movimiento
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Caja Chica Setup */}
      <Dialog open={isCajaChicaOpen} onOpenChange={setIsCajaChicaOpen}>
        <DialogContent className="sm:max-w-md w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Fondo de Caja Chica
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  Límite rotativo para gastos menores y reposición al 100%.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <form onSubmit={handleCcSubmit} className="space-y-3">
            {/* SALDO ACTUAL & ASIGNADO */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-2.5 shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Saldo Actual</span>
                <span className="font-heading text-lg font-black text-emerald-700">
                  {formatRD(currentTenant?.monto_actual_caja_chica ?? 10000)}
                </span>
              </div>
              <div className="border-l border-neutral-200 pl-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Fondo Asignado</span>
                <span className="font-heading text-lg font-black text-neutral-900">
                  {formatRD(currentTenant?.monto_caja_chica ?? 10000)}
                </span>
              </div>
            </div>

            {/* HERO CARD MONTO FIJO */}
            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-2.5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-neutral-900" />
                  Nuevo Límite de Fondo Fijo
                </span>
                <span className="text-[9px] font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded-full">
                  Rotativo
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm select-none">RD$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={ccMontoFijo}
                  onChange={(e) => setCcMontoFijo(formatAmountInput(e.target.value))}
                  placeholder="10,000.00"
                  className="h-10 w-full pl-11 pr-3 text-center font-heading text-2xl font-bold text-neutral-900 tracking-tight rounded-lg border border-neutral-200 bg-white shadow-2xs focus:ring-2 focus:ring-neutral-900/10 outline-none placeholder:text-neutral-300"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {["5,000", "10,000", "15,000", "20,000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCcMontoFijo(preset)}
                    className="text-[10px] font-semibold py-1 px-1 rounded-md border text-center transition-all active:scale-95 cursor-pointer bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-neutral-400 px-1">
              Al guardar, el saldo actual se repondrá automáticamente completando el total de esta asignación.
            </p>

            <DialogFooter className="mt-2 pt-2 border-t border-neutral-100 flex gap-2 sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCajaChicaOpen(false)}
                className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="h-8 text-xs rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold cursor-pointer shadow-2xs gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Reponer y Guardar
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Historial de Turnos y Cierres */}
      <HistoricoCierresDialog
        open={isHistoricoOpen}
        onOpenChange={setIsHistoricoOpen}
        cajas={cajas.filter(c => c.tenant_id === tenantId)}
        tenantUsers={tenantUsers}
        onSelectPrint={(c) => setSelectedPrintCaja(c)}
      />

      
      {/* DIALOG 7: Cuentas x Cobrar */}
      <Dialog open={isCxcOpen} onOpenChange={setIsCxcOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Cuentas por Cobrar
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  Facturas a crédito pendientes y recepción de abonos.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <Input 
                placeholder="Buscar por cliente o número de factura..."
                value={cxcSearch}
                onChange={(e) => setCxcSearch(e.target.value)}
                className="pl-8 h-8.5 rounded-xl border-neutral-200/90 text-xs bg-neutral-50/50 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              {processedCxcInvoices.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-neutral-800">Cuentas al día</div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">No hay facturas de crédito pendientes de cobro.</p>
                </div>
              ) : (
                processedCxcInvoices.map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50/50 p-2.5 sm:p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {inv.customerName ? inv.customerName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-neutral-900 text-xs truncate">{inv.customerName || 'Cliente No Registrado'}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
                            #{inv.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-neutral-400" />
                            {formatDateTimeRD(inv.createdAt).split(',')[0]}
                          </span>
                          <span>•</span>
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Pendiente
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                      <span className="font-heading text-base sm:text-lg font-black text-neutral-900">
                        {formatRD(inv.total)}
                      </span>

                      <div className="flex items-center gap-1 bg-neutral-50 p-0.5 rounded-xl border border-neutral-200/90 shadow-2xs">
                        <span className="text-[9px] font-bold uppercase text-neutral-400 px-1">Cobrar:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 rounded-lg hover:bg-emerald-50 text-emerald-700 text-[11px] font-bold gap-1 cursor-pointer"
                          onClick={() => handlePayCxc(inv, 'EFECTIVO')}
                        >
                          <Coins className="h-3 w-3" /> Efectivo
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 rounded-lg hover:bg-sky-50 text-sky-700 text-[11px] font-bold gap-1 cursor-pointer"
                          onClick={() => handlePayCxc(inv, 'TARJETA')}
                        >
                          <CreditCard className="h-3 w-3" /> Tarjeta
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 rounded-lg hover:bg-indigo-50 text-indigo-700 text-[11px] font-bold gap-1 cursor-pointer"
                          onClick={() => handlePayCxc(inv, 'TRANSFERENCIA')}
                        >
                          <Landmark className="h-3 w-3" /> Transf.
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50/80 flex flex-row items-center justify-between gap-3 sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Pendiente:</span>
              <span className="font-heading text-lg sm:text-xl font-black text-neutral-950">
                {formatRD(processedCxcInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
                ({processedCxcInvoices.length} facturas)
              </span>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCxcOpen(false)}
              className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer font-medium hover:bg-neutral-100"
            >
              Cerrar Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* DIALOG 8: Liquidación de Técnicos (Pago Técnico Detallado) */}
      <Dialog open={isPagoTecnicoOpen} onOpenChange={setIsPagoTecnicoOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Liquidación por Técnico
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  Comisiones de mano de obra y archivo de pagos.
                </DialogDescription>
              </div>
            </div>

            {/* Selector de Pestañas Pendientes vs Historial */}
            <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/10 mr-2">
              <button
                type="button"
                onClick={() => setPagoTecnicoTab('pending')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  pagoTecnicoTab === 'pending'
                    ? "bg-white text-neutral-950 shadow-2xs"
                    : "text-white/80 hover:text-white"
                )}
              >
                <Users className="h-3.5 w-3.5" /> Pendientes
              </button>
              <button
                type="button"
                onClick={() => setPagoTecnicoTab('history')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  pagoTecnicoTab === 'history'
                    ? "bg-white text-neutral-950 shadow-2xs"
                    : "text-white/80 hover:text-white"
                )}
              >
                <History className="h-3.5 w-3.5" /> Historial
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {/* Controles de Selección e Impresión/Historial */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-neutral-50/70 p-2.5 rounded-xl border border-neutral-200/90 shadow-2xs">
              <div className="flex-1 max-w-sm">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Técnico a Liquidar
                </Label>
                <Select value={selectedTechToPay} onValueChange={(val) => val && setSelectedTechToPay(val)}>
                  <SelectTrigger className="h-8.5 rounded-xl border-neutral-200 bg-white text-xs font-semibold">
                    <SelectValue placeholder={pagoTecnicoTab === 'history' ? "Todos los Técnicos" : "Seleccione Técnico"}>
                      {selectedTechToPay && selectedTechToPay !== 'all' 
                        ? technicians.find(t => t.id === selectedTechToPay)?.name 
                        : (pagoTecnicoTab === 'history' ? "Todos los Técnicos" : "Seleccione Técnico")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {pagoTecnicoTab === 'history' && (
                      <SelectItem value="all">Todos los Técnicos</SelectItem>
                    )}
                    {technicians.filter(t => t.tenantId === tenantId).map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto pt-1 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePrintLiquidacion()}
                  disabled={!selectedTechToPay || (pagoTecnicoTab === 'pending' && techCommissionInfo.items.length === 0)}
                  className="h-8.5 rounded-xl border-neutral-200/90 bg-white hover:bg-neutral-50 font-bold gap-1.5 text-xs text-neutral-700 shadow-2xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-neutral-500" />
                  Imprimir Comprobante
                </Button>
              </div>
            </div>

            {pagoTecnicoTab === 'pending' ? (
              <>
                {selectedTechToPay && (
                  <>
                    {techCommissionInfo.items.length === 0 ? (
                      <div className="py-10 px-4 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                        <p className="text-xs font-bold text-neutral-700">El técnico está al día</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">No hay facturas pendientes de comisión.</p>
                      </div>
                    ) : (
                      <div className="border border-neutral-200/90 rounded-xl overflow-hidden shadow-2xs bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 uppercase text-[10px] font-bold">
                            <tr>
                              <th className="py-2.5 px-3"><span className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-neutral-400" /> Factura / Fecha</span></th>
                              <th className="py-2.5 px-3 text-right text-purple-700"><span className="flex items-center justify-end gap-1.5"><Percent className="h-3.5 w-3.5 text-purple-600" /> Comisión</span></th>
                              <th className="py-2.5 px-3 text-right text-blue-700"><span className="flex items-center justify-end gap-1.5"><Wrench className="h-3.5 w-3.5 text-blue-600" /> Mano de Obra</span></th>
                              <th className="py-2.5 px-3 text-right text-neutral-900"><span className="flex items-center justify-end gap-1.5"><Coins className="h-3.5 w-3.5 text-neutral-600" /> Total Fila</span></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {techCommissionInfo.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-neutral-800 text-xs">#{item.inv.id.slice(-6).toUpperCase()}</div>
                                  <div className="text-[10px] text-neutral-400">{new Date(item.inv.createdAt).toLocaleDateString()}</div>
                                  <div className="text-[10px] text-blue-600 font-medium mt-0.5 line-clamp-1" title={item.nombresAplicables.join(', ')}>
                                    {item.nombresAplicables.length > 0 ? item.nombresAplicables.join(', ') : 'Servicio general'}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-purple-700">{formatRD(item.comisionTotal)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-700">{formatRD(item.manoObraTotal)}</td>
                                <td className="py-2.5 px-3 text-right font-black text-neutral-900">{formatRD(item.totalFila)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-neutral-50 border-t border-neutral-200">
                            <tr>
                              <td colSpan={3} className="py-2.5 px-3 text-right font-bold text-neutral-700 uppercase text-[11px]">
                                Total a Liquidar:
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-neutral-950 text-sm">
                                {formatRD(techCommissionInfo.total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* TAB HISTORIAL DE LIQUIDACIONES REALIZADAS */
              <div className="space-y-3">
                {filteredHistoricalLiquidaciones.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <History className="h-8 w-8 text-neutral-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-neutral-700">Sin historial registrado</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">No hay pagos de liquidación para este criterio.</p>
                  </div>
                ) : (
                  <div className="border border-neutral-200/90 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3"><span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-neutral-400" /> Fecha</span></th>
                          <th className="py-2.5 px-3"><span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-neutral-400" /> Técnico</span></th>
                          <th className="py-2.5 px-3"><span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-400" /> Concepto</span></th>
                          <th className="py-2.5 px-3 text-right"><span className="flex items-center justify-end gap-1.5"><Coins className="h-3.5 w-3.5 text-emerald-600" /> Monto</span></th>
                          <th className="py-2.5 px-3 text-center"><span className="flex items-center justify-center gap-1.5"><Printer className="h-3.5 w-3.5 text-neutral-400" /> Acción</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredHistoricalLiquidaciones.map((mov) => {
                          const techName = technicians.find(t => t.id === mov.tecnico_id)?.name || "Técnico";
                          return (
                            <tr key={mov.id} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-neutral-500 whitespace-nowrap text-[11px]">
                                {new Date(mov.creado_en).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-neutral-900 text-xs">
                                {techName}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-600 text-xs">
                                <span className="line-clamp-1">{mov.concepto}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-600 whitespace-nowrap text-xs">
                                {formatRD(mov.monto)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePrintLiquidacion(
                                    mov.tecnico_id,
                                    [],
                                    mov.monto,
                                    true,
                                    new Date(mov.creado_en).toLocaleString('es-DO')
                                  )}
                                  className="h-6 px-2 text-[11px] font-bold text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 gap-1 rounded-md cursor-pointer"
                                >
                                  <Printer className="h-3 w-3" /> Reimprimir
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50/80 flex flex-row items-center justify-between gap-3 sm:justify-between">
            <div className="flex items-center gap-2">
              {pagoTecnicoTab === 'pending' && selectedTechToPay && techCommissionInfo.total > 0 && (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total a Liquidar:</span>
                  <span className="font-heading text-lg sm:text-xl font-black text-neutral-950">
                    {formatRD(techCommissionInfo.total)}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    ({techCommissionInfo.items.length} {techCommissionInfo.items.length === 1 ? 'factura' : 'facturas'})
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPagoTecnicoOpen(false)}
                className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer font-medium hover:bg-neutral-100"
              >
                Cerrar
              </Button>
              {pagoTecnicoTab === 'pending' && (
                <Button 
                  onClick={handleLiquidarTecnico}
                  disabled={!selectedTechToPay || techCommissionInfo.total <= 0}
                  className="h-8 text-xs rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold shadow-2xs cursor-pointer gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> Liquidar ({formatRD(techCommissionInfo.total)})
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceDetailDialog 
        open={!!selectedInvoice} 
        onClose={() => {
          setSelectedInvoice(null);
          setSelectedInvoiceEdit(false);
        }} 
        invoice={selectedInvoice} 
        defaultEdit={selectedInvoiceEdit}
      />
      {/* DIALOG 9: Detalles de Tarjetas (KPIs) */}
      <Dialog open={!!detailsModalType} onOpenChange={(open) => {
        if (!open) {
          setDetailsModalType(null);
          setDetailsSearch("");
        }
      }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200 max-h-[88vh] [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:transition-colors">
          <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative pr-12">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                  {detailsData.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                  Desglose detallado de pagos y transacciones registradas.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="p-3 sm:px-4 border-b border-neutral-100 bg-neutral-50/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Buscar transacción por concepto, tipo, monto..."
                value={detailsSearch}
                onChange={(e) => setDetailsSearch(e.target.value)}
                className="pl-9 pr-8 h-8.5 rounded-xl border-neutral-200 text-xs bg-white focus:bg-white shadow-2xs"
              />
              {detailsSearch && (
                <button 
                  type="button"
                  onClick={() => setDetailsSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs cursor-pointer p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-0 max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead className="sticky top-0 bg-neutral-50/95 backdrop-blur-sm border-b border-neutral-200 z-10">
                <tr className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-28 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-neutral-400" /> Hora</span>
                  </th>
                  <th className="py-3 px-4 w-28 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-neutral-400" /> Tipo</span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-400" /> Concepto</span>
                  </th>
                  <th className="py-3 px-4 text-right w-32 whitespace-nowrap">
                    <span className="flex items-center justify-end gap-1.5"><Coins className="h-3.5 w-3.5 text-neutral-400" /> Monto</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredDetailsItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-4 text-center text-neutral-400 font-medium bg-white">
                      {detailsSearch.trim() 
                        ? "No se encontraron transacciones que coincidan con la búsqueda."
                        : "No hay transacciones para mostrar en esta categoría."}
                    </td>
                  </tr>
                ) : (
                  filteredDetailsItems.map(mov => {
                    const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(mov.tipo);
                    const isEgreso = ['EGRESO', 'RETIRO', 'GASTO_CAJA_CHICA', 'PAGO_NOMINA'].includes(mov.tipo);
                    
                    return (
                      <tr key={mov.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-2.5 px-4 text-neutral-500 font-medium whitespace-nowrap">
                          {new Date(mov.creado_en).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <Badge className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold border shadow-2xs",
                            isIngreso ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isEgreso ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-neutral-100 text-neutral-700 border-neutral-200"
                          )}>
                            {mov.tipo}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-neutral-800">
                          {mov.concepto}
                        </td>
                        <td className={cn(
                          "py-2.5 px-4 text-right font-bold text-sm tabular-nums whitespace-nowrap",
                          isIngreso ? "text-emerald-600" : "text-rose-500"
                        )}>
                          {isIngreso ? "+" : "-"}{formatRD(mov.monto)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TOTAL EN LA PARTE INFERIOR Y BOTON CERRAR */}
          <DialogFooter className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50/80 flex flex-row items-center justify-between gap-3 sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total:</span>
              <span className="font-heading text-lg sm:text-xl font-black text-neutral-950">
                {formatRD(filteredDetailsTotal)}
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
                ({filteredDetailsItems.length} {filteredDetailsItems.length === 1 ? 'transacción' : 'transacciones'})
              </span>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setDetailsModalType(null);
                setDetailsSearch("");
              }} 
              className="h-8 text-xs rounded-xl border-neutral-200 cursor-pointer font-medium hover:bg-neutral-100"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thermal Print Portals */}
      {selectedPrintCaja && (
        <ReporteCuadreThermal
          caja={selectedPrintCaja}
          invoices={invoices}
          movimientos={cajaMovements}
          tenant={currentTenant}
          empleadoName={tenantUsers.find((u) => u.id === (selectedPrintCaja.empleado_cierre_id || selectedPrintCaja.empleado_id))?.name || "Cajero"}
          rango={`${formatDateTimeRD(selectedPrintCaja.abierta_en)} al ${selectedPrintCaja.cerrada_en ? formatDateTimeRD(selectedPrintCaja.cerrada_en) : "En curso"}`}
          formato={printFormat}
          onBack={() => setSelectedPrintCaja(null)}
          onFormatChange={(fmt) => {
            setPrintFormat(fmt);
            updateTenant(tenantId, {
              config: {
                ...currentTenant?.config,
                formato_ticket: fmt
              }
            });
          }}
        />
      )}

      {showMovimientosPrint && activeCaja && (
        <ReporteMovimientosTurnoThermal
          caja={activeCaja}
          movimientos={processedActiveMovements}
          tenant={currentTenant}
          empleadoName={tenantUsers.find((u) => u.id === activeCaja.empleado_id)?.name || "Cajero"}
          ventasEf={processedActiveMovements.filter(m => m.tipo === 'VENTA' && m.metodo === 'EFECTIVO').reduce((s, m) => s + m.monto, 0)}
          ventasTar={metrics.tarjetaTotal}
          ventasTrans={metrics.transferenciaTotal}
          otrosIng={processedActiveMovements.filter(m => ['INGRESO', 'ABONO'].includes(m.tipo) && m.metodo === 'EFECTIVO').reduce((s, m) => s + m.monto, 0)}
          egresos={metrics.egresosEfectivo}
          efectivoEsperado={metrics.efectivoEsperado}
          formato={printFormat}
          onBack={() => setShowMovimientosPrint(false)}
          onFormatChange={(fmt) => {
            setPrintFormat(fmt);
            updateTenant(tenantId, {
              config: {
                ...currentTenant?.config,
                formato_ticket: fmt
              }
            });
          }}
        />
      )}
    </div>
  );
}
