"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cn, formatAmountInput, parseAmount } from "@/lib/utils";
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  Printer, 
  X, 
  Search, 
  FileText, 
  Check, 
  ShieldCheck, 
  FolderOpen, 
  Tag, 
  UserCog, 
  Wrench, 
  User, 
  Truck,
  Calendar,
  CalendarDays,
  CalendarRange,
  Layers,
  Cpu,
  Package,
  Building2,
  Split,
  AlertTriangle,
  Clock,
  Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useStore, WorkOrder, Customer, Vehicle, Invoice, OpenTab } from "@/store/useStore";
import { Ticket } from "@/components/pos/Ticket";
import { printThermalDocument } from "@/lib/thermalPrint";
import { toast } from "sonner";

type PayMethod = "cash" | "card" | "transfer";

const PAY_METHODS: { key: PayMethod; label: string; icon: React.ElementType; color: string }[] = [
  { key: "cash",     label: "Efectivo",      icon: Banknote,    color: "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100" },
  { key: "card",     label: "Tarjeta",       icon: CreditCard,  color: "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100" },
  { key: "transfer", label: "Transferencia", icon: Smartphone,  color: "bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-100" },
];

export type CustomerFiscalType = 'consumidor_final' | 'credito_fiscal' | 'gubernamental' | 'regimen_especial' | 'consumo';
export type CondicionCobro = 'COBRAR_AHORA' | 'ANTICIPO' | 'CREDITO';
export type InstrumentoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';

const formatRD = (amount: number) =>
  "RD$ " +
  Number(amount || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export interface CheckoutConfirmData {
  type: CustomerFiscalType;
  rnc?: string;
  name?: string;
  isFiscalEnabled: boolean;
  condicionCobro: CondicionCobro;
  instrumentoPago: InstrumentoPago;
  paidAmount: number;
  pendingAmount: number;
  cashReceived: number;
  change: number;
  creditDays?: number;
  referencia?: string;
  desgloseMixto?: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    transferenciaRef?: string;
  };
}

interface CheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  payMethod?: "cash" | "card" | "transfer";
  setPayMethod?: (m: "cash" | "card" | "transfer") => void;
  cashReceived?: string;
  setCashReceived?: (v: string) => void;
  customer?: Customer | null;
  defaultFiscalActive?: boolean;
  initialCustomerData?: {
    type?: string;
    rnc?: string;
    name?: string;
  };
  onConfirm: (data: CheckoutConfirmData) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  total,
  customer,
  defaultFiscalActive = false,
  initialCustomerData,
  onConfirm,
}: CheckoutProps) {
  // Modalidades: COBRAR AHORA, ANTICIPO, CRÉDITO (Omitiendo "AL RETIRAR")
  const [condicionCobro, setCondicionCobro] = useState<CondicionCobro>("COBRAR_AHORA");
  const [instrumentoPago, setInstrumentoPago] = useState<InstrumentoPago>("EFECTIVO");

  // Anticipo
  const [anticipoMontoStr, setAnticipoMontoStr] = useState<string>(() => formatAmountInput(String(Math.round(total / 2))));
  const anticipoMonto = parseAmount(anticipoMontoStr);

  // Crédito
  const [limiteDiasSel, setLimiteDiasSel] = useState<number>(30);
  const [abonoCredito, setAbonoCredito] = useState<number>(0);

  // Efectivo recibido (con separador de miles en coma)
  const [montoRecibidoStr, setMontoRecibidoStr] = useState<string>(() => formatAmountInput(String(total)));
  const efectivoNum = parseAmount(montoRecibidoStr);

  // Referencias de tarjeta y transferencia
  const [referencia, setReferencia] = useState<string>("");

  // Desglose Mixto
  const [pagoEfectivoStr, setPagoEfectivoStr] = useState<string>(() => formatAmountInput(String(Math.round(total / 2))));
  const pagoEfectivo = parseAmount(pagoEfectivoStr);
  const [pagoTarjetaStr, setPagoTarjetaStr] = useState<string>(() => formatAmountInput(String(Math.max(0, total - Math.round(total / 2)))));
  const pagoTarjeta = parseAmount(pagoTarjetaStr);
  const [pagoTransferenciaStr, setPagoTransferenciaStr] = useState<string>("0");
  const pagoTransferencia = parseAmount(pagoTransferenciaStr);
  const [pagoTransferenciaRef, setPagoTransferenciaRef] = useState<string>("");

  // Facturación Electrónica DGII (Activada / Desactivada con Switch)
  const [isFiscalEnabled, setIsFiscalEnabled] = useState<boolean>(defaultFiscalActive);
  const [invoiceType, setInvoiceType] = useState<CustomerFiscalType>("consumidor_final");
  const [rnc, setRnc] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSearchingRnc, setIsSearchingRnc] = useState(false);

  // Sincronizar estado inicial al abrir
  useEffect(() => {
    if (open) {
      setMontoRecibidoStr(formatAmountInput(String(total)));
      setAnticipoMontoStr(formatAmountInput(String(Math.round(total / 2))));
      setAbonoCredito(0);
      setPagoEfectivoStr(formatAmountInput(String(Math.round(total / 2))));
      setPagoTarjetaStr(formatAmountInput(String(Math.max(0, total - Math.round(total / 2)))));
      setPagoTransferenciaStr("0");
      setPagoTransferenciaRef("");
      setReferencia("");
      setIsFiscalEnabled(defaultFiscalActive);

      if (initialCustomerData) {
        if (initialCustomerData.type) {
          const t = initialCustomerData.type;
          if (t === "consumo" || t === "consumidor_final" || t === "E32") setInvoiceType("consumidor_final");
          else if (t === "credito_fiscal" || t === "E31") setInvoiceType("credito_fiscal");
          else if (t === "gubernamental" || t === "E45") setInvoiceType("gubernamental");
          else if (t === "regimen_especial" || t === "E44") setInvoiceType("regimen_especial");
        }
        if (initialCustomerData.rnc) setRnc(initialCustomerData.rnc);
        if (initialCustomerData.name) setCompanyName(initialCustomerData.name);
      }
    }
  }, [open, total, defaultFiscalActive, initialCustomerData]);

  // Autofill para prueba EF2 o RNC común
  useEffect(() => {
    const cleanRnc = rnc.replace(/\D/g, "");
    if (cleanRnc === "132596161") {
      setCompanyName("2BUY ELECTRONICS AND SERVICES SRL");
    }
  }, [rnc]);

  // Monto meta a pagar hoy según la modalidad
  const targetMonto = useMemo(() => {
    if (condicionCobro === "COBRAR_AHORA") return total;
    if (condicionCobro === "ANTICIPO") return Math.min(total, Math.max(0, anticipoMonto));
    if (condicionCobro === "CREDITO") return Math.min(total, Math.max(0, abonoCredito));
    return total;
  }, [condicionCobro, total, anticipoMonto, abonoCredito]);

  const paidAmount = targetMonto;
  const pendingAmount = Math.max(0, total - paidAmount);

  // Cálculos para efectivo
  const cambio = Math.max(0, efectivoNum - targetMonto);
  const faltante = Math.max(0, targetMonto - efectivoNum);

  // Cálculos para mixto
  const asignadoMixto = (pagoEfectivo || 0) + (pagoTarjeta || 0) + (pagoTransferencia || 0);
  const cuadreMixtoExacto = Math.abs(targetMonto - asignadoMixto) < 0.01;

  // Validación de cliente para crédito
  const isAnonymousClient = !customer || customer.id === "walk-in" || (customer.name ? customer.name.toLowerCase().includes("consumidor final") : true);

  // Validación fiscal
  const requiresRnc = isFiscalEnabled && invoiceType !== "consumidor_final" && invoiceType !== "consumo";
  const isFiscalValid = !isFiscalEnabled || !requiresRnc || (rnc.trim().length >= 9 && companyName.trim().length > 0);

  // Validación para el botón de confirmar
  const isConfirmEnabled = useMemo(() => {
    if (!isFiscalValid) return false;

    if (condicionCobro === "COBRAR_AHORA") {
      if (instrumentoPago === "EFECTIVO") return efectivoNum >= total;
      if (instrumentoPago === "TRANSFERENCIA") return referencia.trim().length > 0;
      if (instrumentoPago === "MIXTO") {
        return cuadreMixtoExacto && (pagoTransferencia === 0 || pagoTransferenciaRef.trim().length > 0);
      }
      return true;
    }

    if (condicionCobro === "ANTICIPO") {
      if (anticipoMonto <= 0 || anticipoMonto >= total) return false;
      if (instrumentoPago === "EFECTIVO") return efectivoNum >= anticipoMonto;
      if (instrumentoPago === "TRANSFERENCIA") return referencia.trim().length > 0;
      if (instrumentoPago === "MIXTO") {
        return cuadreMixtoExacto && (pagoTransferencia === 0 || pagoTransferenciaRef.trim().length > 0);
      }
      return true;
    }

    if (condicionCobro === "CREDITO") {
      if (isAnonymousClient) return false;
      if (abonoCredito >= total) return false;
      return true;
    }

    return true;
  }, [
    isFiscalValid,
    condicionCobro,
    instrumentoPago,
    total,
    efectivoNum,
    referencia,
    cuadreMixtoExacto,
    pagoTransferencia,
    pagoTransferenciaRef,
    anticipoMonto,
    isAnonymousClient,
    abonoCredito,
  ]);

  const handleConfirm = () => {
    if (!isConfirmEnabled) return;
    onConfirm({
      type: invoiceType,
      rnc: rnc.trim(),
      name: companyName.trim(),
      isFiscalEnabled,
      condicionCobro,
      instrumentoPago,
      paidAmount,
      pendingAmount,
      cashReceived: efectivoNum,
      change: cambio,
      creditDays: condicionCobro === "CREDITO" ? limiteDiasSel : undefined,
      referencia: referencia.trim() || undefined,
      desgloseMixto:
        instrumentoPago === "MIXTO"
          ? {
              efectivo: pagoEfectivo,
              tarjeta: pagoTarjeta,
              transferencia: pagoTransferencia,
              transferenciaRef: pagoTransferenciaRef.trim() || undefined,
            }
          : undefined,
    });
  };

  // Atajo de teclado: Barra espaciadora para confirmar
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (!isInput && isConfirmEnabled) {
          e.preventDefault();
          handleConfirm();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isConfirmEnabled, handleConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-3.5 sm:p-4 rounded-2xl overflow-y-auto max-h-[92vh] z-[160] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        {/* Puntos decorativos de marca (Superior derecho) */}
        <div className="absolute top-2.5 right-10 opacity-20 pointer-events-none hidden sm:block">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-0.5 w-0.5 rounded-full bg-[#1B4B73]" />
            ))}
          </div>
        </div>

        {/* Puntos decorativos de marca (Inferior derecho) */}
        <div className="absolute bottom-2.5 right-3 opacity-20 pointer-events-none hidden sm:block">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-0.5 w-0.5 rounded-full bg-[#F0B900]" />
            ))}
          </div>
        </div>

        <DialogHeader className="pb-0 relative">
          <div className="flex items-start justify-between">
            {/* Logo de Marca + Título */}
            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-tr from-[#1B4B73] to-[#2563EB] flex items-center justify-center shrink-0 shadow-sm text-white font-black text-xs">
                TC
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-[#1B4B73] dark:text-white leading-tight">
                  Panel de Cobro
                </DialogTitle>
                <DialogDescription className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                  Selecciona el método de cobro
                </DialogDescription>
              </div>
            </div>

            {/* Total a cobrar */}
            <div className="text-right pr-6 sm:pr-7">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#1B4B73]/70 dark:text-sky-400 block leading-none mb-0.5">
                TOTAL A COBRAR
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#1B4B73] dark:text-sky-300 tracking-tight leading-none font-mono">
                {formatRD(total)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2.5 pt-0.5">
          {/* 1. LAS 3 MODALIDADES DE COBRO (OMITIENDO "AL RETIRAR") */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: "COBRAR_AHORA" as const,
                label: "COBRAR AHORA",
                sub: "Pago 100% hoy",
                icon: Check,
              },
              {
                id: "ANTICIPO" as const,
                label: "ANTICIPO",
                sub: "Abono + Saldo",
                icon: Calendar,
              },
              {
                id: "CREDITO" as const,
                label: "CRÉDITO",
                sub: "Cuenta por cobrar",
                icon: FileText,
              },
            ].map((m) => {
              const isSelected = condicionCobro === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setCondicionCobro(m.id);
                    if (m.id === "COBRAR_AHORA") {
                      setMontoRecibidoStr(formatAmountInput(String(total)));
                    } else if (m.id === "ANTICIPO") {
                      const half = +Math.round(total / 2);
                      setAnticipoMontoStr(formatAmountInput(String(half)));
                      setMontoRecibidoStr(formatAmountInput(String(half)));
                    } else if (m.id === "CREDITO") {
                      setAbonoCredito(0);
                      setMontoRecibidoStr("0");
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 sm:p-2.5 transition-all duration-200 active:scale-95 text-center cursor-pointer",
                    isSelected
                      ? "border-[#1B4B73] bg-[#1B4B73]/[0.05] dark:bg-[#1B4B73]/20 ring-1 ring-[#1B4B73]/20 font-bold scale-[1.01]"
                      : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-500 shadow-2xs"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-transform",
                      isSelected ? "bg-[#1B4B73] text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  </div>
                  <div
                    className={cn(
                      "font-black text-[10px] sm:text-[11px] uppercase tracking-wider leading-none",
                      isSelected ? "text-[#1B4B73] dark:text-sky-300" : "text-slate-800 dark:text-slate-200"
                    )}
                  >
                    {m.label}
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-muted-foreground font-medium leading-none">
                    {m.sub}
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#F0B900] text-slate-900 shadow-xs ring-1 ring-white">
                      <Check className="h-2 w-2 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 2. INSTRUMENTOS DE PAGO (EFECTIVO, TARJETA, TRANSFERENCIA, MIXTO) */}
          {(condicionCobro === "COBRAR_AHORA" || condicionCobro === "ANTICIPO") && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { id: "EFECTIVO" as const, label: "EFECTIVO", icon: Banknote },
                  { id: "TARJETA" as const, label: "TARJETA", icon: CreditCard },
                  { id: "TRANSFERENCIA" as const, label: "TRANSF.", icon: Building2 },
                  { id: "MIXTO" as const, label: "MIXTO", icon: Split },
                ].map((inst) => {
                  const isSel = instrumentoPago === inst.id;
                  const Icon = inst.icon;
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => {
                        setInstrumentoPago(inst.id);
                        if (inst.id === "MIXTO") {
                          const target = condicionCobro === "ANTICIPO" ? anticipoMonto : total;
                          setPagoEfectivoStr(formatAmountInput(String(Math.round(target / 2))));
                          setPagoTarjetaStr(formatAmountInput(String(Math.max(0, target - Math.round(target / 2)))));
                          setPagoTransferenciaStr("0");
                        }
                      }}
                      className={cn(
                        "relative flex items-center justify-center gap-1.5 rounded-xl border-2 py-1.5 px-2 transition-all duration-200 active:scale-95 cursor-pointer text-xs",
                        isSel
                          ? "border-[#1B4B73] bg-[#1B4B73] text-white font-black shadow-xs scale-[1.01]"
                          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-700 dark:text-slate-300 font-bold shadow-2xs"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", isSel ? "text-[#F0B900]" : "")} />
                      <span className="text-[10px] sm:text-[11px] tracking-wider">{inst.label}</span>
                      {isSel && (
                        <div className="h-3 w-3 rounded-full bg-[#F0B900] text-slate-900 flex items-center justify-center shrink-0 ml-0.5">
                          <Check className="h-2 w-2 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* DETALLES DE ANTICIPO */}
              {condicionCobro === "ANTICIPO" && (
                <div className="p-2.5 bg-[#1B4B73]/[0.03] dark:bg-[#1B4B73]/20 border-2 border-[#1B4B73]/20 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200">
                      ANTICIPO A ABONAR HOY
                    </span>
                    <span className="font-black text-[#855B00] dark:text-amber-300 bg-[#F0B900]/20 px-1.5 py-0.5 rounded border border-[#F0B900]/40 text-[10px]">
                      Saldo: <b>{formatRD(Math.max(0, total - anticipoMonto))}</b>
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <div className="relative flex-1 h-9">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-[#1B4B73]/60">
                        RD$
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-full pl-10 text-base font-black bg-white dark:bg-slate-900 border border-[#1B4B73]/30 focus-visible:ring-[#1B4B73]/30 rounded-lg text-[#1B4B73] dark:text-sky-300 font-mono"
                        value={anticipoMontoStr}
                        onChange={(e) => {
                          const str = formatAmountInput(e.target.value);
                          setAnticipoMontoStr(str);
                          setMontoRecibidoStr(str);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    {/* Botones de porcentajes rápidos */}
                    <div className="flex gap-1">
                      {[0.25, 0.5, 0.75].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const val = Math.round(total * pct);
                            const valStr = formatAmountInput(String(val));
                            setAnticipoMontoStr(valStr);
                            setMontoRecibidoStr(valStr);
                          }}
                          className="px-2 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300 hover:border-[#1B4B73] hover:text-[#1B4B73] transition-all cursor-pointer"
                        >
                          {pct * 100}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EFECTIVO: MONTO RECIBIDO Y CAMBIO */}
              {instrumentoPago === "EFECTIVO" && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 mb-0.5 block">
                        MONTO RECIBIDO (EFECTIVO)
                      </Label>
                      <div className="rounded-xl border-2 border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 px-2 py-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="font-black text-xs text-slate-400 pl-0.5">RD$</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-7 w-full text-base font-black bg-transparent border-none focus-visible:ring-0 text-[#1B4B73] dark:text-sky-200 p-0 shadow-none font-mono"
                            value={montoRecibidoStr}
                            onChange={(e) => setMontoRecibidoStr(formatAmountInput(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                          <Banknote className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className={cn("text-[9px] font-black uppercase tracking-wider mb-0.5 block", faltante > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {faltante > 0 ? "FALTANTE" : "CAMBIO A ENTREGAR"}
                      </Label>
                      <div className={cn(
                        "rounded-xl border-2 px-2 py-1 flex items-center justify-between",
                        faltante > 0
                          ? "border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                          : "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                      )}>
                        <div className="flex items-center gap-1 pl-0.5">
                          <span className="font-bold text-[11px] opacity-80">RD$</span>
                          <span className="text-base font-black leading-none font-mono">
                            {(faltante > 0 ? faltante : cambio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={cn(
                          "h-6 w-6 rounded-lg flex items-center justify-center shrink-0",
                          faltante > 0 ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600" : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600"
                        )}>
                          {faltante > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billetes rápidos */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMontoRecibidoStr(formatAmountInput(String(targetMonto)))}
                      className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:border-[#1B4B73] transition-all cursor-pointer"
                    >
                      Exacto ({formatRD(targetMonto)})
                    </button>
                    {[100, 500, 1000, 2000].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => {
                          const current = parseAmount(montoRecibidoStr) || targetMonto;
                          setMontoRecibidoStr(formatAmountInput(String(current + bill)));
                        }}
                        className="px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:border-[#1B4B73] transition-all cursor-pointer"
                      >
                        +{bill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TARJETA */}
              {instrumentoPago === "TARJETA" && (
                <div className="space-y-0.5 animate-in fade-in duration-200">
                  <Label className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    REFERENCIA DE TARJETA (OPCIONAL)
                  </Label>
                  <Input
                    placeholder="Número de aprobación / Auth #..."
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/30 rounded-lg font-medium text-xs px-2.5 shadow-2xs"
                  />
                </div>
              )}

              {/* TRANSFERENCIA */}
              {instrumentoPago === "TRANSFERENCIA" && (
                <div className="space-y-0.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200 block">
                      NO. DE TRANSFERENCIA *
                    </Label>
                    {!referencia.trim() && (
                      <span className="text-[9px] text-rose-500 font-black">* Requerida</span>
                    )}
                  </div>
                  <Input
                    placeholder="Número de confirmación bancaria..."
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className={cn(
                      "h-8 bg-white dark:bg-slate-900 border rounded-lg font-medium text-xs px-2.5 shadow-2xs",
                      !referencia.trim() ? "border-rose-400 focus-visible:ring-rose-400" : "border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/40"
                    )}
                  />
                </div>
              )}

              {/* MIXTO */}
              {instrumentoPago === "MIXTO" && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-[#1B4B73]/20 space-y-1.5 shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60 text-[11px]">
                    <span className="font-black uppercase tracking-wider text-[#1B4B73] flex items-center gap-1">
                      <Split className="h-3.5 w-3.5" /> Desglose Multi-método
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      Total: <b>{formatRD(targetMonto)}</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <div className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-0.5">
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Banknote className="h-3 w-3" /> Efectivo
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 text-right font-black text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded px-1.5 font-mono"
                        value={pagoEfectivoStr}
                        onChange={(e) => setPagoEfectivoStr(formatAmountInput(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-0.5">
                      <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> Tarjeta
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 text-right font-black text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded px-1.5 font-mono"
                        value={pagoTarjetaStr}
                        onChange={(e) => setPagoTarjetaStr(formatAmountInput(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="p-1.5 rounded-lg border border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20 space-y-0.5">
                      <span className="text-[10px] font-black text-sky-700 dark:text-sky-300 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Transferencia
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 text-right font-black text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded px-1.5 font-mono"
                        value={pagoTransferenciaStr}
                        onChange={(e) => setPagoTransferenciaStr(formatAmountInput(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {pagoTransferencia > 0 && (
                    <Input
                      placeholder="Referencia de transferencia * (Obligatoria)"
                      value={pagoTransferenciaRef}
                      onChange={(e) => setPagoTransferenciaRef(e.target.value)}
                      className={cn(
                        "h-7 text-xs rounded border px-2",
                        !pagoTransferenciaRef.trim() ? "border-rose-400" : "border-slate-200"
                      )}
                    />
                  )}

                  <div className="flex items-center justify-between pt-0.5 border-t border-border/60 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">Asignado: </span>
                      <span className="font-black text-foreground">{formatRD(asignadoMixto)}</span>
                    </div>
                    <div>
                      {!cuadreMixtoExacto ? (
                        <span className="text-rose-500 font-black">
                          Falta: {formatRD(Math.max(0, targetMonto - asignadoMixto))}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-black flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Cuadre exacto
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DETALLES DE CRÉDITO */}
          {condicionCobro === "CREDITO" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              {isAnonymousClient ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-rose-300 bg-rose-50/70 p-2.5 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <div>
                    <strong className="block text-[11px] font-bold">Cliente Registrado Obligatorio</strong>
                    <span className="text-[10px] leading-tight block">
                      Las ventas a crédito deben asignarse a un cliente registrado en la cabecera del POS.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-2 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="text-[10px]">
                      Se registrará en la cuenta por cobrar de <span className="font-black">{customer?.name}</span>.
                    </div>
                  </div>

                  {/* Plazo de crédito */}
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10 p-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
                      PLAZO DE CRÉDITO
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {[15, 30, 45, 60, 90].map((dias) => (
                        <button
                          key={dias}
                          type="button"
                          onClick={() => setLimiteDiasSel(dias)}
                          className={cn(
                            "flex flex-col items-center justify-center py-1 rounded-lg border transition-all cursor-pointer",
                            limiteDiasSel === dias
                              ? "border-[#1B4B73] bg-[#1B4B73] text-white font-bold"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          <span className="text-sm font-black leading-none">{dias}</span>
                          <span className="text-[7px] font-black uppercase">DÍAS</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Abono inicial opcional */}
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 dark:bg-amber-950/10 p-2 space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                      Abono inicial (Opcional)
                    </Label>
                    <div className="relative h-8">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-black text-xs text-amber-700/60">
                        RD$
                      </span>
                      <Input
                        type="number"
                        className="h-full pl-9 text-sm font-black bg-white dark:bg-slate-900 border border-amber-300/60 rounded-lg text-amber-800 dark:text-amber-300"
                        value={abonoCredito || ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v >= total) {
                            toast.warning("El abono debe ser menor al total.");
                            return;
                          }
                          setAbonoCredito(v);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[10px] text-amber-700/80 font-medium leading-none">
                      Saldo restante: <strong>{formatRD(Math.max(0, total - abonoCredito))}</strong>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. FACTURACIÓN ELECTRÓNICA (ACTIVAR O DESACTIVAR) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-2 sm:p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isFiscalEnabled ? "bg-[#1B4B73] text-white shadow-xs" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                )}>
                  {isFiscalEnabled ? <Sparkles className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                </div>
                <div>
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 block leading-tight">
                    Facturación Electrónica (e-CF DGII)
                  </span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-none">
                    {isFiscalEnabled ? "Emitir comprobante timbrado DGII" : "Ticket estándar interno sin timbrado DGII"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isFiscalEnabled}
                onCheckedChange={setIsFiscalEnabled}
                className="scale-90 data-[state=checked]:bg-[#1B4B73]"
              />
            </div>

            {isFiscalEnabled && (
              <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "consumidor_final" as const, label: "Consumo", sub: "E32 / B02", icon: User },
                    { id: "credito_fiscal" as const, label: "Créd. Fiscal", sub: "E31 / B01", icon: Truck },
                    { id: "gubernamental" as const, label: "Gubernamental", sub: "E45 / B15", icon: FileText },
                    { id: "regimen_especial" as const, label: "Rég. Especial", sub: "E44 / B14", icon: ShieldCheck },
                  ].map(({ id, label, sub, icon: Icon }) => {
                    const isSelected = invoiceType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setInvoiceType(id)}
                        className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <Icon className={cn("h-3 w-3 shrink-0", isSelected ? "text-[#F0B900]" : "text-slate-400")} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[10px] truncate leading-tight">{label}</div>
                          <div className={cn("text-[8px] font-mono", isSelected ? "text-white/80" : "text-muted-foreground")}>{sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {requiresRnc && (
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="space-y-0.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">RNC o Cédula *</Label>
                      <Input
                        placeholder="Ej. 132596161"
                        value={rnc}
                        onChange={(e) => setRnc(e.target.value)}
                        className="bg-white dark:bg-slate-900 border-slate-200 h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">Razón Social *</Label>
                      <Input
                        placeholder="Ej. 2BUY ELECTRONICS AND SERVICES SRL"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-white dark:bg-slate-900 border-slate-200 h-7 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. FOOTER: SEGURIDAD + BOTÓN VERDE CONFIRMAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Badge de seguridad */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#1B4B73]/[0.08] text-[#1B4B73] dark:text-sky-400 flex items-center justify-center border border-[#1B4B73]/20 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                  Transacción segura
                </span>
                <span className="text-[9px] text-slate-400 block leading-none">
                  Tus datos están protegidos
                </span>
              </div>
            </div>

            {/* Botón Verde (#16A34A) */}
            <Button
              size="default"
              className="w-full sm:w-auto h-9 sm:h-10 px-5 text-xs font-extrabold tracking-wide rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
            >
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center shrink-0">
                <Check className="h-2 w-2 stroke-[3]" />
              </div>
              <span>CONFIRMAR Y CREAR ORDEN</span>
              <span className="ml-0.5 rounded bg-white/20 px-1 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                ESPACIO
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Print Receipt Dialog ──
interface PrintReceiptProps {
  open: boolean;
  onClose: () => void;
  cart: { id: string; name: string; salePrice: number; quantity: number }[];
  subtotal: number;
  itbis: number;
  total: number;
  payMethod: PayMethod;
  cashNum: number;
  change: number;
  taller: { name: string; logo?: string; address?: string; phone?: string; rnc?: string };
  lastInvoice: any | null;
  mechanicId?: string;
  warrantyText?: string;
}

export function PrintReceiptDialog({ open, onClose, cart, subtotal, itbis, total, payMethod, cashNum, change, taller, lastInvoice, mechanicId, warrantyText }: PrintReceiptProps) {
  const technicians = useStore((s) => s.technicians);
  const customers = useStore((s) => s.customers);
  const printSettings = useStore((s) => s.printSettings);
  const techName = mechanicId ? (technicians.find(t => t.id === mechanicId)?.name ?? undefined) : undefined;

  const componentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    const printElement = componentRef.current;
    if (!printElement) return;

    printThermalDocument({
      element: printElement,
      title: `Recibo_${lastInvoice?.id || "POS"}`,
      paperSize: (printSettings.paperSize as any) || "80mm",
    });
  };

  const modalWidth = printSettings.paperSize === "A4" ? "sm:max-w-3xl" : "sm:max-w-md";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`${modalWidth} rounded-2xl p-6`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-neutral-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ¡Venta completada!
          </DialogTitle>
        </DialogHeader>
        <div className="bg-neutral-100/80 rounded-2xl border border-neutral-200/80 overflow-hidden flex justify-center py-6 px-3 max-h-[65vh] overflow-y-auto">
          <div ref={componentRef} className="print-container bg-white shadow-lg rounded-sm my-1">
            <Ticket 
              invoiceId={lastInvoice?.id || `TEMP-${Date.now()}`}
              ncf={lastInvoice?.ncf}
              qrUrl={lastInvoice?.qrUrl}
              securityCode={lastInvoice?.securityCode}
              signatureDate={lastInvoice?.signatureDate}
              createdAt={lastInvoice?.createdAt || new Date().toISOString()}
              tenant={taller}
              customer={
                lastInvoice?.customerName 
                  ? { name: lastInvoice.customerName, rnc: lastInvoice.customerRnc } 
                  : lastInvoice?.customerId 
                    ? customers.find(c => c.id === lastInvoice.customerId) 
                    : undefined
              }
              items={lastInvoice?.items || cart.map(c => ({ name: c.name, quantity: c.quantity, salePrice: c.salePrice }))}
              subtotal={lastInvoice?.subtotal || subtotal}
              itbis={itbis}
              total={total}
              payMethod={payMethod}
              cashReceived={cashNum}
              mechanicName={techName}
              warrantyText={warrantyText}
              discount={lastInvoice?.discount}
              formato={printSettings.paperSize as any}
              orden={lastInvoice ? {
                numero: lastInvoice.id,
                creado_en: lastInvoice.createdAt,
                subtotal: lastInvoice.subtotal,
                itbis: lastInvoice.tax,
                descuento: lastInvoice.discount || 0,
                total: lastInvoice.total,
                saldo: lastInvoice.pendingAmount ?? 0,
                pagado: lastInvoice.paidAmount ?? lastInvoice.total,
                metodo_pago: lastInvoice.paymentMethod,
                items: lastInvoice.items || [],
                ncf: lastInvoice.ncf,
                ecf_qr: lastInvoice.qrUrl,
                ecf_security_code: lastInvoice.securityCode,
                ecf_signature_date: lastInvoice.signatureDate,
              } : undefined}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handlePrint()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 transition-colors">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-neutral-800 transition-colors">
            Nueva Venta
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Labor Modal ──
interface LaborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
}

export function LaborModal({ open, onOpenChange, onConfirm }: LaborModalProps) {
  const [laborAmount, setLaborAmount] = useState("");
  
  // Need to import useState
  const handleConfirm = () => {
    const amount = parseFloat(laborAmount);
    if (isNaN(amount) || amount <= 0) return;
    onConfirm(amount);
    setLaborAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Mano de Obra
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Monto del servicio</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-neutral-400">RD$</span>
              <Input
                type="number"
                placeholder="0.00"
                autoFocus
                value={laborAmount}
                onChange={(e) => setLaborAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="pl-14 h-12 rounded-xl text-lg font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => { onOpenChange(false); setLaborAmount(""); }}
              className="h-12 rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="h-12 rounded-xl bg-black text-white font-bold hover:bg-neutral-800"
            >
              Autorizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Warranty Modal ──
interface WarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (text: string) => void;
  currentText?: string;
}

export function WarrantyModal({ open, onOpenChange, onSave, currentText }: WarrantyModalProps) {
  // Parse existing values from currentText if it exists
  const parseExisting = () => {
    if (!currentText) return { qty: "30", unit: "días", coverage: "mano de obra" };
    const m = currentText.match(/(\d+)\s*(días|meses|años)\s+en\s+(.+)\.?$/);
    if (m) return { qty: m[1], unit: m[2], coverage: m[3].replace(/\.$/, "") };
    return { qty: "30", unit: "días", coverage: "mano de obra" };
  };

  const initial = parseExisting();
  const [qty, setQty] = useState(initial.qty);
  const [unit, setUnit] = useState(initial.unit);
  const [coverage, setCoverage] = useState(initial.coverage);

  const UNITS = [
    { key: "días", label: "días", icon: Calendar },
    { key: "meses", label: "meses", icon: CalendarDays },
    { key: "años", label: "años", icon: CalendarRange },
  ];

  const COVERAGES = [
    { key: "mano de obra", label: "mano de obra", icon: Wrench },
    { key: "piezas y mano de obra", label: "piezas y mano de obra", icon: Layers },
    { key: "repuestos y mano de obra", label: "repuestos y mano de obra", icon: Cpu },
    { key: "piezas instaladas", label: "piezas instaladas", icon: Package },
  ];

  const preview = `${qty || "?"} ${unit} en ${coverage}.`;

  const handleSave = () => {
    if (!qty || parseInt(qty) <= 0) return;
    onSave(preview);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-neutral-200">
        <div className="bg-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Garantía de Servicio
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                Define el tiempo y alcance de la garantía en la factura.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Duración */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Duración de la garantía</span>
            </label>
            <div className="flex gap-2">
              <div className="relative w-28">
                <input
                  type="number"
                  min="1"
                  max="999"
                  autoFocus
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="w-full h-11 rounded-xl border border-neutral-200 px-3 text-xl font-black text-center text-neutral-950 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </div>
              <div className="flex gap-1.5 flex-1">
                {UNITS.map((u) => {
                  const Icon = u.icon;
                  const isSel = unit === u.key;
                  return (
                    <button
                      key={u.key}
                      type="button"
                      onClick={() => setUnit(u.key)}
                      className={cn(
                        "flex-1 h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95",
                        isSel
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{u.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cobertura */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Cubre</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COVERAGES.map((c) => {
                const Icon = c.icon;
                const isSel = coverage === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCoverage(c.key)}
                    className={cn(
                      "h-10 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 text-left shadow-2xs active:scale-95",
                      isSel
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isSel ? "text-white" : "text-emerald-600")} />
                    <span className="capitalize leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
            <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-emerald-900">Garantía: {preview}</span>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl font-bold text-xs border-neutral-200 cursor-pointer hover:bg-neutral-100 gap-1.5"
            >
              <X className="h-4 w-4 text-neutral-500" /> Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!qty || parseInt(qty) <= 0}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none cursor-pointer shadow-sm gap-1.5"
            >
              <Check className="h-4 w-4" /> Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LinkOrderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (order: WorkOrder) => void;
}

export function LinkOrderDialog({ open, onOpenChange, onSelect }: LinkOrderProps) {
  const { orders, customers, vehicles, invoices } = useStore();
  const [search, setSearch] = useState("");

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.name || "Cliente Genérico";
  const getVehicleInfo = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.brand} ${v.model} (${v.plate})` : "Vehículo";
  };

  const alreadyInvoicedOrderIds = new Set(invoices.map(inv => inv.orderId).filter(Boolean));

  // Show finished, delivered, invoiced orders that are NOT yet invoiced.
  // We also show other statuses (pending, repairing) if the search term is active, 
  // but by default we filter by status and check against alreadyInvoicedOrderIds.
  const selectableOrders = orders.filter((o) => {
    if (alreadyInvoicedOrderIds.has(o.id)) return false;

    const matchSearch =
      getCustomerName(o.customerId).toLowerCase().includes(search.toLowerCase()) ||
      getVehicleInfo(o.vehicleId).toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase());

    const isReadyStatus = o.status === "finished" || o.status === "delivered" || o.status === "invoiced";
    
    // If the user is searching, show all matching orders (even if not yet finished, in case they want to invoice early),
    // otherwise only show orders that are ready to invoice.
    return matchSearch && (search !== "" || isReadyStatus);
  });

  const statusLabels: Record<string, string> = {
    pending: "Pendiente",
    diagnosing: "En Diagnóstico",
    repairing: "En Reparación",
    waiting_parts: "Esperando Piezas",
    finished: "Finalizado",
    delivered: "Entregado",
    invoiced: "Facturado",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-neutral-100 text-neutral-600 border-neutral-200",
    diagnosing: "bg-amber-100 text-amber-700 border-amber-200",
    repairing: "bg-blue-100 text-blue-700 border-blue-200",
    waiting_parts: "bg-rose-100 text-rose-700 border-rose-200",
    finished: "bg-emerald-100 text-emerald-700 border-emerald-200",
    delivered: "bg-neutral-900 text-white border-neutral-900",
    invoiced: "bg-indigo-100 text-indigo-700 border-indigo-200",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl bg-white max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-neutral-500" />
            Vincular Orden de Trabajo
          </DialogTitle>
        </DialogHeader>

        <div className="relative my-3 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar por cliente, vehículo o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {selectableOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No se encontraron órdenes de trabajo</p>
              <p className="text-xs text-neutral-400 mt-1">Solo se muestran órdenes no facturadas.</p>
            </div>
          ) : (
            selectableOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => {
                  onSelect(order);
                  onOpenChange(false);
                }}
                className="group border border-neutral-100 hover:border-black rounded-xl p-4 transition-all bg-neutral-50 hover:bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer active:scale-[0.99]"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusColors[order.status] || "bg-neutral-100")}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                    <span className="text-xs text-neutral-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900 truncate leading-snug">{order.description}</h4>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                    <span className="font-semibold text-neutral-700">{getCustomerName(order.customerId)}</span>
                    <span className="text-neutral-300">•</span>
                    <span>{getVehicleInfo(order.vehicleId)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end w-full md:w-auto gap-4 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200/50">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(order);
                      onOpenChange(false);
                    }}
                    size="sm"
                    className="rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold px-3 h-8 gap-1 shrink-0"
                  >
                    <Check className="h-3.5 w-3.5" /> Vincular
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// OPEN TABS DIALOG (Cuentas Abiertas)
// ════════════════════════════════════════════════════════════════════════════════

interface OpenTabsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onLoadTab: (tab: OpenTab) => void;
}

export function OpenTabsDialog({ open, onOpenChange, tenantId, onLoadTab }: OpenTabsDialogProps) {
  const { openTabs, deleteOpenTab, updateProduct, addMovement, tenants, products, technicians, customers } = useStore();
  const currentTenant = tenants.find(t => t.id === tenantId);
  const currentTenantConfig = currentTenant?.config;
  const tabs = openTabs.filter(t => (
    t.tenantId === tenantId ||
    (currentTenant?.slug && t.tenantId === currentTenant.slug) ||
    !t.tenantId
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-500" />
            Cuentas en Espera
            {tabs.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                {tabs.length}
              </Badge>
            )}
          </DialogTitle>
          {tabs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                tabs.forEach(t => deleteOpenTab(t.id));
                toast.success('Todas las cuentas en espera han sido eliminadas');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 font-bold cursor-pointer"
            >
              Vaciar todas
            </Button>
          )}
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-neutral-50">
          {tabs.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No hay cuentas en espera registradas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tabs.map((tab) => {
                const subtotal = tab.items.reduce((acc, i) => acc + (i.salePrice * i.quantity), 0);
                const discAmount = tab.discount ? (tab.discountType === 'percent' ? (subtotal * tab.discount) / 100 : tab.discount) : 0;
                const total = Math.max(0, subtotal - discAmount);

                const tech = tab.mechanicId && tab.mechanicId !== 'none' ? technicians.find(t => t.id === tab.mechanicId) : null;
                const customer = tab.customerId && tab.customerId !== 'walk-in' ? customers.find(c => c.id === tab.customerId) : null;
                const displayName = customer ? customer.name : (tab.tabName || "Consumidor Final");

                return (
                  <div key={tab.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between hover:border-amber-300 transition-colors group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-neutral-900">{displayName}</h4>
                        {tech && (
                          <Badge variant="outline" className="text-[10px] bg-neutral-100 text-neutral-700 font-semibold gap-1 py-0 px-2 border-neutral-200">
                            <UserCog className="h-3 w-3" /> {tech.name}
                          </Badge>
                        )}
                        {discAmount > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 font-bold gap-1 py-0 px-2 border-emerald-200">
                            <Tag className="h-3 w-3" /> -RD$ {discAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {tab.discountType === 'percent' ? `(${tab.discount}%)` : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {tab.items.length} artículo{tab.items.length === 1 ? '' : 's'} • Creada: {new Date(tab.createdAt).toLocaleString('es-DO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-neutral-900">RD$ {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {discAmount > 0 && (
                          <p className="text-[10px] text-neutral-400 line-through">RD$ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (currentTenantConfig?.autoDeductInventory) {
                              tab.items.forEach((item) => {
                                if (item.id.startsWith('labor-') || item.sku === 'MANO-OBRA' || item.category === 'Servicios') return;
                                const currentProduct = products.find(p => p.id === item.id);
                                if (currentProduct) {
                                  updateProduct(currentProduct.id, { stock: currentProduct.stock + item.deductedQuantity });
                                  addMovement({
                                    id: `m-pos-tab-cancel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                    tenantId,
                                    productId: item.id,
                                    productName: item.name,
                                    type: 'in',
                                    quantity: item.deductedQuantity,
                                    reason: `Anulación Cuenta en Espera - ${tab.tabName}`,
                                    date: new Date().toISOString(),
                                  });
                                }
                              });
                            }
                            deleteOpenTab(tab.id);
                            toast.success('Cuenta anulada y stock reintegrado');
                          }}
                          className="h-8 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          Anular
                        </Button>
                        <Button
                          onClick={() => {
                            onLoadTab(tab);
                            deleteOpenTab(tab.id);
                          }}
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                        >
                          Recuperar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


