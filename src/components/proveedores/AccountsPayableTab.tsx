"use client";

import { useState, useMemo } from "react";
import type { AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  LayoutList, 
  Users, 
  History, 
  FileText, 
  TrendingUp, 
  Wallet,
  Calendar,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AccountsPayableTab({ tenantId }: { tenantId: string }) {
  const accountsPayable = useStore((s) => s.accountsPayable).filter((ap) => ap.tenantId === tenantId);
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const { updateAccountPayable } = useStore();
  
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [payDialog, setPayDialog] = useState<AccountPayable | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const monthEnd = new Date(today.getTime() + 30 * 86400000);

  // Auto-mark overdue
  const processed = useMemo(() => accountsPayable.map((ap) => {
    if (ap.status === "pendiente" && new Date(ap.dueDate) < now) return { ...ap, status: "vencida" as const };
    return ap;
  }), [accountsPayable, now]);

  const pendingToday = processed.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) <= today).reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const pendingWeek = processed.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd).reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const pendingMonth = processed.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) <= monthEnd).reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const overdueCount = processed.filter((ap) => ap.status === "vencida" || (ap.status !== "pagada" && new Date(ap.dueDate) < now)).length;

  const filteredList = processed
    .filter((ap) => statusFilter === "Todos" || ap.status === statusFilter)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.commercialName || "Proveedor";

  const supplierStats = useMemo(() => {
    return suppliers.map(sup => {
      const supplierOrders = purchaseOrders.filter(po => po.supplierId === sup.id && po.status !== 'cancelada' && po.status !== 'borrador');
      const totalComprado = supplierOrders.reduce((sum, po) => sum + po.total, 0);

      const supplierPayables = processed.filter(ap => ap.supplierId === sup.id);
      const pendingPayables = supplierPayables.filter(ap => ap.status !== "pagada");
      
      const deudaActual = pendingPayables.reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);
      const facturasVencidas = pendingPayables.filter(ap => ap.status === "vencida" || new Date(ap.dueDate) < now).length;

      return {
        supplier: sup,
        totalComprado,
        deudaActual,
        facturasVencidas,
        payables: supplierPayables.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      };
    }).filter(s => s.deudaActual > 0 || s.totalComprado > 0)
      .sort((a, b) => b.deudaActual - a.deudaActual);
  }, [suppliers, purchaseOrders, processed, now]);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDialog || !payAmount) return;
    const amount = Number(payAmount);
    if (amount <= 0) { toast.error("Monto inválido"); return; }
    const newPaid = payDialog.paidAmount + amount;
    const isPaid = newPaid >= payDialog.amount;
    updateAccountPayable(payDialog.id, {
      paidAmount: newPaid,
      status: isPaid ? "pagada" : "parcial",
      paidAt: isPaid ? new Date().toISOString() : undefined,
    });
    toast.success(isPaid ? `Factura #${payDialog.invoiceNumber} pagada completamente` : `Abono de RD$ ${amount.toLocaleString("es-DO")} registrado`);
    setPayDialog(null);
    setPayAmount("");
  };

  const statusColors: Record<string, { badge: string; dot: string }> = { 
    pendiente: { badge: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500" }, 
    parcial: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", dot: "bg-blue-500" }, 
    pagada: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500" }, 
    vencida: { badge: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500" } 
  };

  return (
    <div className="space-y-4">
      {/* 1. Mini Dashboard Ejecutivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Pendiente Hoy",
            currency: "RD$",
            formattedNumber: pendingToday.toLocaleString("es-DO", { maximumFractionDigits: 0 }),
            value: `RD$ ${pendingToday.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`,
            subtext: "Vencimiento inmediato",
            icon: Clock,
            iconBg: "bg-rose-50 text-rose-700 border-rose-200/80",
            statusDot: pendingToday > 0 ? "bg-rose-500" : "bg-emerald-500",
            subColor: pendingToday > 0 ? "text-rose-600 font-semibold" : undefined,
          },
          {
            label: "Pendiente 7 Días",
            currency: "RD$",
            formattedNumber: pendingWeek.toLocaleString("es-DO", { maximumFractionDigits: 0 }),
            value: `RD$ ${pendingWeek.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`,
            subtext: "Vence esta semana",
            icon: Calendar,
            iconBg: "bg-amber-50 text-amber-700 border-amber-200/80",
            statusDot: pendingWeek > 0 ? "bg-amber-500" : "bg-emerald-500",
            subColor: pendingWeek > 0 ? "text-amber-600 font-semibold" : undefined,
          },
          {
            label: "Pendiente Este Mes",
            currency: "RD$",
            formattedNumber: pendingMonth.toLocaleString("es-DO", { maximumFractionDigits: 0 }),
            value: `RD$ ${pendingMonth.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`,
            subtext: "Compromisos del mes",
            icon: CreditCard,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200/80",
            statusDot: "bg-blue-500",
          },
          {
            label: "Facturas Vencidas",
            value: `${overdueCount} facturas`,
            subtext: overdueCount > 0 ? "Requiere pago urgente" : "Cero moras",
            icon: AlertTriangle,
            iconBg: overdueCount > 0 ? "bg-rose-50 text-rose-700 border-rose-200/80" : "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            statusDot: overdueCount > 0 ? "bg-rose-500" : "bg-emerald-500",
            subColor: overdueCount > 0 ? "text-rose-600 font-semibold" : undefined,
          },
        ].map((kpi) => {
          const isLong = ((kpi as any).formattedNumber?.length || kpi.value.length) > 9;
          return (
            <div
              key={kpi.label}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all"
            >
              {/* Fila superior: Título e Icono */}
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
                  {kpi.label}
                </span>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0 shadow-2xs", kpi.iconBg)}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>

              {/* Fila central: Valor de ancho completo sin recorte */}
              <div className="mt-2.5">
                {"currency" in kpi && (kpi as any).currency ? (
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xs font-bold text-neutral-400 tracking-tight shrink-0 select-none">
                      {(kpi as any).currency}
                    </span>
                    <span className={cn(
                      "font-black tracking-tight text-neutral-900 tabular-nums whitespace-nowrap",
                      isLong ? "text-lg xl:text-xl" : "text-xl sm:text-2xl"
                    )}>
                      {(kpi as any).formattedNumber}
                    </span>
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "font-black tracking-tight text-neutral-900 font-mono tabular-nums whitespace-nowrap",
                      isLong ? "text-lg xl:text-xl" : "text-xl sm:text-2xl"
                    )}
                  >
                    {kpi.value}
                  </div>
                )}

                {/* Fila inferior: Indicador y subtexto */}
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  {kpi.statusDot && (
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", kpi.statusDot)} />
                  )}
                  <p className={cn("text-[11px] truncate font-medium", (kpi as any).subColor || "text-neutral-400")}>
                    {kpi.subtext}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Barra de Modos de Vista & Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Switch Agrupado vs Lista Plana */}
          <div className="flex rounded-xl border border-neutral-200/90 overflow-hidden bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "grouped"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Por Proveedor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Todas las Facturas</span>
            </button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
              <SelectTrigger className="w-44 h-9 rounded-xl border-neutral-200 bg-white text-xs font-medium text-neutral-700 shadow-2xs cursor-pointer">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-neutral-200">
                <SelectItem value="Todos" className="text-xs">Todos los estados</SelectItem>
                <SelectItem value="pendiente" className="text-xs">Pendientes</SelectItem>
                <SelectItem value="parcial" className="text-xs">Parciales</SelectItem>
                <SelectItem value="vencida" className="text-xs">Vencidas</SelectItem>
                <SelectItem value="pagada" className="text-xs">Pagadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 3. VISTA AGRUPADA POR PROVEEDOR */}
      {viewMode === "grouped" ? (
        <div className="space-y-3">
          {supplierStats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs">
              <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3 mx-auto">
                <Wallet className="h-7 w-7" />
              </div>
              <h4 className="text-base font-bold text-neutral-900 font-heading">
                No hay cuentas por pagar activas
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mt-1 mx-auto">
                Todas tus facturas de proveedores están completamente al día o no se han emitido órdenes a crédito.
              </p>
            </div>
          ) : (
            supplierStats.map((stat) => (
              <div 
                key={stat.supplier.id} 
                className="bg-white border border-neutral-200/80 rounded-2xl shadow-2xs overflow-hidden transition-all hover:border-neutral-300"
              >
                <div 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/70 transition-colors"
                  onClick={() => setExpandedSupplier(expandedSupplier === stat.supplier.id ? null : stat.supplier.id)}
                >
                  {/* Info Suplidor */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 bg-neutral-900 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                      {stat.supplier.commercialName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm sm:text-base text-neutral-900 truncate">{stat.supplier.commercialName}</h4>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">
                        Compras Acumuladas: <strong className="text-neutral-700 font-mono">RD$ {stat.totalComprado.toLocaleString("es-DO")}</strong>
                      </p>
                    </div>
                  </div>
                  
                  {/* Balance & Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-0.5">Balance Pendiente</p>
                      <p className={cn("text-lg sm:text-xl font-mono font-black tabular-nums tracking-tight", stat.deudaActual > 0 ? "text-rose-600" : "text-emerald-700")}>
                        RD$ {stat.deudaActual.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    {stat.facturasVencidas > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700">
                        <AlertTriangle className="h-3 w-3" />
                        {stat.facturasVencidas} Vencidas
                      </span>
                    )}
                    
                    <div className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center transition-colors shadow-2xs border", 
                      expandedSupplier === stat.supplier.id ? "bg-neutral-900 text-white border-neutral-900" : "bg-neutral-100 text-neutral-500 border-neutral-200"
                    )}>
                      {expandedSupplier === stat.supplier.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Desglose de Facturas */}
                {expandedSupplier === stat.supplier.id && (
                  <div className="bg-neutral-50/70 p-4 sm:p-5 border-t border-neutral-100 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h5 className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Facturas de {stat.supplier.commercialName}</span>
                      </h5>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {stat.payables.length} registros
                      </span>
                    </div>

                    <div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden shadow-2xs">
                      <Table className="w-full text-xs min-w-[700px]">
                        <TableHeader className="bg-neutral-50/80">
                          <TableRow className="border-b border-neutral-200/80">
                            <TableHead className="py-3 pl-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                              Factura
                            </TableHead>
                            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Emisión
                            </TableHead>
                            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Vencimiento
                            </TableHead>
                            <TableHead className="py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Monto Total
                            </TableHead>
                            <TableHead className="py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Balance Pendiente
                            </TableHead>
                            <TableHead className="py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Estado
                            </TableHead>
                            <TableHead className="w-[90px] py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Acción
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stat.payables.map((ap) => {
                            const remaining = ap.amount - ap.paidAmount;
                            const isOverdue = ap.status !== "pagada" && new Date(ap.dueDate) < now;
                            const isNearDue = !isOverdue && ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd;
                            const status = statusColors[ap.status] || statusColors.pendiente;

                            return (
                              <TableRow key={ap.id} className={cn("hover:bg-neutral-50/70 border-b border-neutral-100 transition-colors", isOverdue && "bg-rose-50/20")}>
                                <TableCell className="py-3 pl-4 font-mono font-bold text-xs text-neutral-900">
                                  #{ap.invoiceNumber}
                                </TableCell>
                                <TableCell className="py-3 text-xs text-neutral-500 font-mono">
                                  {new Date(ap.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                                </TableCell>
                                <TableCell className="py-3 whitespace-nowrap">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg border",
                                    isOverdue 
                                      ? "bg-rose-50 text-rose-700 border-rose-200" 
                                      : isNearDue 
                                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                                      : "bg-neutral-100 text-neutral-600 border-neutral-200"
                                  )}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isOverdue ? "bg-rose-500" : isNearDue ? "bg-amber-500" : "bg-neutral-400")} />
                                    {new Date(ap.dueDate).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 text-right font-mono text-xs text-neutral-500 tabular-nums">
                                  RD$ {ap.amount.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="py-3 text-right font-mono font-black text-xs sm:text-sm text-neutral-900 tabular-nums">
                                  RD$ {remaining.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="py-3 text-center whitespace-nowrap">
                                  <span className={cn("inline-flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border", status.badge)}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", status.dot)} />
                                    {ap.status}
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 pr-4 text-right">
                                  {ap.status !== "pagada" ? (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 px-2.5 rounded-lg text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 gap-1 cursor-pointer" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPayDialog(ap); 
                                        setPayAmount(String(remaining)); 
                                      }}
                                    >
                                      <CheckCircle2 className="h-3 w-3" /> Pagar
                                    </Button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      Saldada
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* 4. VISTA PLANA DE TODAS LAS FACTURAS */
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-neutral-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100">
            <Table className="w-full text-xs min-w-[750px]">
              <TableHeader className="bg-neutral-50/80">
                <TableRow className="border-b border-neutral-200/80">
                  <TableHead className="w-[130px] py-3.5 pl-6 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                    Factura
                  </TableHead>
                  <TableHead className="min-w-[200px] py-3.5 pl-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Proveedor
                  </TableHead>
                  <TableHead className="w-[140px] py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Monto Total
                  </TableHead>
                  <TableHead className="w-[140px] py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Balance Pend.
                  </TableHead>
                  <TableHead className="w-[130px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Vencimiento
                  </TableHead>
                  <TableHead className="w-[110px] py-3.5 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Estado
                  </TableHead>
                  <TableHead className="w-[90px] py-3.5 pr-6 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                          <FileText className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-neutral-800 text-sm">
                          No se encontraron facturas con este filtro
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((ap) => {
                    const remaining = ap.amount - ap.paidAmount;
                    const isOverdue = ap.status !== "pagada" && new Date(ap.dueDate) < now;
                    const isNearDue = !isOverdue && ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd;
                    const status = statusColors[ap.status] || statusColors.pendiente;

                    return (
                      <TableRow key={ap.id} className={cn("hover:bg-neutral-50/70 bg-white border-b border-neutral-100 transition-colors", isOverdue && "bg-rose-50/20")}>
                        <TableCell className="py-3.5 pl-6 font-mono font-bold text-xs sm:text-sm text-neutral-900">
                          #{ap.invoiceNumber}
                        </TableCell>
                        <TableCell className="py-3.5 pl-2 font-semibold text-xs text-neutral-800">
                          {getSupplierName(ap.supplierId)}
                        </TableCell>
                        <TableCell className="py-3.5 text-right font-mono text-xs text-neutral-500 tabular-nums">
                          RD$ {ap.amount.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-3.5 text-right font-mono font-black text-xs sm:text-sm text-neutral-900 tabular-nums">
                          RD$ {remaining.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg border",
                            isOverdue 
                              ? "bg-rose-50 text-rose-700 border-rose-200" 
                              : isNearDue 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isOverdue ? "bg-rose-500" : isNearDue ? "bg-amber-500" : "bg-neutral-400")} />
                            {new Date(ap.dueDate).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-center whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border", status.badge)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", status.dot)} />
                            {ap.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 pr-6 text-right">
                          {ap.status !== "pagada" ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2.5 rounded-lg text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 gap-1 cursor-pointer" 
                              onClick={() => { 
                                setPayDialog(ap); 
                                setPayAmount(String(remaining)); 
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Pagar
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Saldada
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 5. Modal de Pago a Proveedor */}
      <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) { setPayDialog(null); setPayAmount(""); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden bg-white shadow-2xl">
          <div className="bg-neutral-50/80 p-6 border-b border-neutral-100">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> 
                <span>Registrar Pago a Proveedor</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 mt-1">
                Abono o liquidación para la factura <strong className="text-neutral-900 font-mono">#{payDialog?.invoiceNumber}</strong>.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handlePay} className="p-6 space-y-4">
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/80 flex justify-between items-center shadow-2xs">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">Balance Pendiente</span>
              <span className="text-xl font-mono font-black text-emerald-950 tabular-nums">
                RD$ {payDialog ? (payDialog.amount - payDialog.paidAmount).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-600">Monto a Pagar o Abonar (RD$)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-neutral-400 font-mono">RD$</span>
                <Input 
                  type="number" 
                  min="1" 
                  step="0.01"
                  max={payDialog ? (payDialog.amount - payDialog.paidAmount) : undefined}
                  className="pl-12 h-11 text-base font-mono font-bold rounded-xl border-neutral-200 shadow-2xs" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)} 
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="pt-2 sm:justify-between flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setPayDialog(null)} 
                className="h-10 px-5 rounded-xl border-neutral-200 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="h-10 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs active:scale-[0.98] transition-all cursor-pointer"
              >
                Confirmar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
