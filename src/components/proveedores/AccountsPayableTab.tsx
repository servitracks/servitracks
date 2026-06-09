"use client";
import { useState, useMemo } from "react";
import type { AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, LayoutList, Users, History, FileText, TrendingUp, Wallet } from "lucide-react";
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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.commercialName || "—";

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
    toast.success(isPaid ? "Factura pagada completamente" : `Abono de RD$ ${amount.toLocaleString("es-DO")} registrado`);
    setPayDialog(null);
    setPayAmount("");
  };

  const statusColors: Record<string, string> = { pendiente: "bg-amber-100 text-amber-700", parcial: "bg-blue-100 text-blue-700", pagada: "bg-emerald-100 text-emerald-700", vencida: "bg-rose-100 text-rose-700" };

  return (
    <div className="space-y-6">
      {/* Epic Mini Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-600/20 rounded-2xl overflow-hidden">
          <CardContent className="p-5 relative">
            <Clock className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white/10" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-rose-100 uppercase tracking-wider mb-1">Pendiente Hoy</p>
              <p className="text-3xl font-black">RD$ {pendingToday.toLocaleString("es-DO")}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20 rounded-2xl overflow-hidden">
          <CardContent className="p-5 relative">
            <History className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white/20" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-amber-100 uppercase tracking-wider mb-1">Pendiente Semana</p>
              <p className="text-3xl font-black">RD$ {pendingWeek.toLocaleString("es-DO")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pendiente Mes</p>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><CreditCard className="h-4 w-4" /></div>
            </div>
            <p className="text-2xl font-black text-neutral-900">RD$ {pendingMonth.toLocaleString("es-DO")}</p>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Facturas Vencidas</p>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle className="h-4 w-4" /></div>
            </div>
            <p className="text-2xl font-black text-neutral-900">{overdueCount} <span className="text-sm text-neutral-500 font-medium">facturas</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Controls: View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="bg-neutral-100 p-1 rounded-xl flex items-center">
          <button
            onClick={() => setViewMode("grouped")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
              viewMode === "grouped" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            <Users className="h-4 w-4" /> Por Proveedor
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
              viewMode === "list" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            <LayoutList className="h-4 w-4" /> Todas las Facturas
          </button>
        </div>

        {viewMode === "list" && (
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
            <SelectTrigger className="w-48 h-10 rounded-xl border-neutral-200 bg-white font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="parcial">Parciales</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="pagada">Pagadas</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grouped View */}
      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {supplierStats.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <Wallet className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="font-bold text-neutral-800">No hay deudas ni historial registrado</p>
              <p className="text-sm text-neutral-500">Crea órdenes de compra para empezar a gestionar cuentas por pagar.</p>
            </div>
          ) : (
            supplierStats.map(stat => (
              <div key={stat.supplier.id} className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-blue-200">
                <div 
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/80 transition-colors"
                  onClick={() => setExpandedSupplier(expandedSupplier === stat.supplier.id ? null : stat.supplier.id)}
                >
                  {/* Supplier Info */}
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center font-black text-xl text-neutral-600 border border-neutral-200/50 shadow-inner">
                      {stat.supplier.commercialName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-neutral-900">{stat.supplier.commercialName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="text-xs text-neutral-500 font-medium">Compras Totales: <span className="font-bold text-neutral-700">RD$ {stat.totalComprado.toLocaleString("es-DO")}</span></span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Financials & Toggle */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 mb-1">Deuda Actual</p>
                      <p className={cn("text-2xl font-black tracking-tight", stat.deudaActual > 0 ? "text-rose-600" : "text-emerald-600")}>
                        RD$ {stat.deudaActual.toLocaleString("es-DO")}
                      </p>
                    </div>
                    
                    {stat.facturasVencidas > 0 && (
                      <Badge className="bg-rose-100 text-rose-700 border-none font-bold px-2 py-1 rounded-lg">
                        {stat.facturasVencidas} Vencidas
                      </Badge>
                    )}
                    
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center transition-colors", expandedSupplier === stat.supplier.id ? "bg-blue-100 text-blue-600" : "bg-neutral-100 text-neutral-400")}>
                      {expandedSupplier === stat.supplier.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Invoices Area */}
                {expandedSupplier === stat.supplier.id && (
                  <div className="bg-neutral-50/50 p-5 sm:p-6 border-t border-neutral-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-bold text-sm text-neutral-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" /> Historial de Facturas
                      </h5>
                      <span className="text-xs font-medium text-neutral-500 bg-white px-2.5 py-1 rounded-md border border-neutral-200 shadow-sm">
                        {stat.payables.length} registros
                      </span>
                    </div>

                    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-neutral-50/80">
                          <TableRow>
                            <TableHead className="font-bold">Factura</TableHead>
                            <TableHead className="font-bold">Emisión</TableHead>
                            <TableHead className="font-bold">Vencimiento</TableHead>
                            <TableHead className="font-bold text-right">Monto</TableHead>
                            <TableHead className="font-bold text-right">Balance</TableHead>
                            <TableHead className="font-bold text-center">Estado</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stat.payables.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center text-neutral-400">Sin facturas registradas.</TableCell></TableRow>
                          ) : stat.payables.map((ap) => {
                            const remaining = ap.amount - ap.paidAmount;
                            const isOverdue = ap.status !== "pagada" && new Date(ap.dueDate) < now;
                            const isNearDue = !isOverdue && ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd;
                            
                            return (
                              <TableRow key={ap.id} className={cn("hover:bg-neutral-50/50 transition-colors", isOverdue && "bg-rose-50/30")}>
                                <TableCell className="font-mono font-bold text-sm">#{ap.invoiceNumber}</TableCell>
                                <TableCell className="text-xs text-neutral-500 font-medium">{new Date(ap.createdAt).toLocaleDateString("es-DO")}</TableCell>
                                <TableCell>
                                  <span className={cn("text-xs font-bold px-2 py-1 rounded-md", 
                                    isOverdue ? "bg-rose-100 text-rose-700" : isNearDue ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600"
                                  )}>
                                    {isOverdue && "🔴 "}{isNearDue && "🟡 "}
                                    {new Date(ap.dueDate).toLocaleDateString("es-DO")}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-xs font-semibold text-neutral-600">RD$ {ap.amount.toLocaleString("es-DO")}</TableCell>
                                <TableCell className="text-right font-black text-sm">RD$ {remaining.toLocaleString("es-DO")}</TableCell>
                                <TableCell className="text-center">
                                  <Badge className={cn("text-[10px] uppercase font-bold border-none", statusColors[ap.status])}>
                                    {ap.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {ap.status !== "pagada" && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 rounded-lg text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 gap-1.5" 
                                      onClick={(e) => { e.stopPropagation(); setPayDialog(ap); setPayAmount(String(remaining)); }}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Pagar
                                    </Button>
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
        /* List View */
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-neutral-50/80">
              <TableRow>
                <TableHead className="font-bold">Factura</TableHead>
                <TableHead className="font-bold">Proveedor</TableHead>
                <TableHead className="font-bold text-right">Monto Total</TableHead>
                <TableHead className="font-bold text-right">Balance Pend.</TableHead>
                <TableHead className="font-bold">Vencimiento</TableHead>
                <TableHead className="font-bold text-center">Estado</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-40 text-center text-neutral-400 font-medium">No se encontraron facturas con este filtro.</TableCell></TableRow>
              ) : filteredList.map((ap) => {
                const remaining = ap.amount - ap.paidAmount;
                const isOverdue = ap.status !== "pagada" && new Date(ap.dueDate) < now;
                const isNearDue = !isOverdue && ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd;
                return (
                  <TableRow key={ap.id} className={cn("hover:bg-neutral-50/50 transition-colors", isOverdue && "bg-rose-50/30")}>
                    <TableCell className="font-mono font-bold text-sm text-neutral-900">#{ap.invoiceNumber}</TableCell>
                    <TableCell className="font-semibold text-sm text-neutral-700">{getSupplierName(ap.supplierId)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold text-neutral-500">RD$ {ap.amount.toLocaleString("es-DO")}</TableCell>
                    <TableCell className="text-right font-black text-sm text-neutral-900">RD$ {remaining.toLocaleString("es-DO")}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-md", 
                        isOverdue ? "bg-rose-100 text-rose-700" : isNearDue ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600"
                      )}>
                        {isOverdue && "🔴 "}{isNearDue && "🟡 "}
                        {new Date(ap.dueDate).toLocaleDateString("es-DO")}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[10px] uppercase font-bold border-none", statusColors[ap.status])}>
                        {ap.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ap.status !== "pagada" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 gap-1.5" 
                          onClick={() => { setPayDialog(ap); setPayAmount(String(remaining)); }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Epic Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) { setPayDialog(null); setPayAmount(""); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden bg-white">
          <div className="bg-neutral-50/80 p-6 border-b border-neutral-100">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-black flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Registrar Pago a Proveedor
              </DialogTitle>
              <DialogDescription className="text-sm mt-1 text-neutral-500">
                Estás a punto de registrar un abono o saldo para la factura <strong className="text-neutral-900 font-mono">#{payDialog?.invoiceNumber}</strong>.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handlePay} className="p-6 space-y-6">
            <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center shadow-inner">
              <span className="font-bold text-sm uppercase tracking-wider text-emerald-700">Balance Pendiente</span>
              <span className="text-2xl font-black tabular-nums">
                RD$ {payDialog ? (payDialog.amount - payDialog.paidAmount).toLocaleString("es-DO") : "0"}
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Monto a Pagar o Abonar (RD$)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-neutral-400">RD$</span>
                <Input 
                  type="number" 
                  min="1" 
                  step="0.01"
                  max={payDialog ? (payDialog.amount - payDialog.paidAmount) : undefined}
                  className="pl-12 h-14 text-xl font-bold rounded-2xl border-neutral-200 shadow-sm focus:ring-emerald-500" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)} 
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="pt-2 sm:justify-between flex-row">
              <Button type="button" variant="outline" onClick={() => setPayDialog(null)} className="h-12 px-6 rounded-xl border-neutral-200 font-bold w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" className="h-12 px-8 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20 w-full sm:w-auto">
                Confirmar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

