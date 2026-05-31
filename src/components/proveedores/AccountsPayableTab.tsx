"use client";
import { useState } from "react";
import type { AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AccountsPayableTab({ tenantId }: { tenantId: string }) {
  const accountsPayable = useStore((s) => s.accountsPayable).filter((ap) => ap.tenantId === tenantId);
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const { updateAccountPayable } = useStore();
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [payDialog, setPayDialog] = useState<AccountPayable | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const monthEnd = new Date(today.getTime() + 30 * 86400000);

  // Auto-mark overdue
  const processed = accountsPayable.map((ap) => {
    if (ap.status === "pendiente" && new Date(ap.dueDate) < now) return { ...ap, status: "vencida" as const };
    return ap;
  });

  const pendingToday = processed.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) <= today).reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const pendingWeek = processed.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd).reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const pendingMonth = processed.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) <= monthEnd).reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const overdueCount = processed.filter((ap) => ap.status === "vencida" || (ap.status !== "pagada" && new Date(ap.dueDate) < now)).length;

  const filtered = processed
    .filter((ap) => statusFilter === "Todos" || ap.status === statusFilter)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.commercialName || "—";

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
    <div className="space-y-4">
      {/* Mini Dashboard */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pendiente Hoy", value: pendingToday, icon: Clock, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Pendiente Semana", value: pendingWeek, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Pendiente Mes", value: pendingMonth, icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Facturas Vencidas", value: overdueCount, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", isCount: true },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-black text-neutral-900">
                  {(kpi as any).isCount ? kpi.value : `RD$ ${(kpi.value as number).toLocaleString("es-DO")}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + Table */}
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
          <SelectTrigger className="w-40 h-9 rounded-full border-neutral-200 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="Todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow>
              <TableHead>Factura</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-neutral-400">Sin cuentas por pagar.</TableCell></TableRow>
            ) : filtered.map((ap) => {
              const remaining = ap.amount - ap.paidAmount;
              const isOverdue = ap.status !== "pagada" && new Date(ap.dueDate) < now;
              const isNearDue = !isOverdue && ap.status !== "pagada" && new Date(ap.dueDate) <= weekEnd;
              return (
                <TableRow key={ap.id} className={cn("hover:bg-neutral-50/50", isOverdue && "bg-rose-50/30")}>
                  <TableCell className="font-mono font-bold text-sm">{ap.invoiceNumber}</TableCell>
                  <TableCell className="text-sm">{getSupplierName(ap.supplierId)}</TableCell>
                  <TableCell className="font-bold text-sm">RD$ {ap.amount.toLocaleString("es-DO")}</TableCell>
                  <TableCell className="text-sm">{ap.paidAmount > 0 ? `RD$ ${ap.paidAmount.toLocaleString("es-DO")}` : "—"}</TableCell>
                  <TableCell>
                    <span className={cn("text-sm", isOverdue ? "text-rose-600 font-bold" : isNearDue ? "text-amber-600 font-medium" : "text-neutral-600")}>
                      {isOverdue && "🔴 "}{isNearDue && "🟡 "}
                      {new Date(ap.dueDate).toLocaleDateString("es-DO")}
                    </span>
                  </TableCell>
                  <TableCell><Badge className={cn("text-xs border-none", statusColors[ap.status])}>{ap.status.charAt(0).toUpperCase() + ap.status.slice(1)}</Badge></TableCell>
                  <TableCell>
                    {ap.status !== "pagada" && (
                      <Button variant="outline" size="sm" className="rounded-lg text-xs h-7 gap-1" onClick={() => { setPayDialog(ap); setPayAmount(String(remaining)); }}>
                        <CheckCircle2 className="h-3 w-3" /> Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) { setPayDialog(null); setPayAmount(""); } }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Registrar Pago</DialogTitle>
            {payDialog && <p className="text-sm text-neutral-500">{payDialog.invoiceNumber} — Pendiente: <strong>RD$ {(payDialog.amount - payDialog.paidAmount).toLocaleString("es-DO")}</strong></p>}
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Monto a Pagar (RD$)</Label>
              <Input type="number" min="1" className="h-10 rounded-xl border-neutral-200" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayDialog(null)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Confirmar Pago</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
