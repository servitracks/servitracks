"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Banknote, CreditCard, Smartphone, CheckCircle2, Printer, X, Search, FileText, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useStore, WorkOrder, Customer, Vehicle, Invoice } from "@/store/useStore";
import { Ticket } from "@/components/pos/Ticket";

type PayMethod = "cash" | "card" | "transfer";

const PAY_METHODS: { key: PayMethod; label: string; icon: React.ElementType; color: string }[] = [
  { key: "cash",     label: "Efectivo",      icon: Banknote,    color: "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100" },
  { key: "card",     label: "Tarjeta",       icon: CreditCard,  color: "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100" },
  { key: "transfer", label: "Transferencia", icon: Smartphone,  color: "bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-100" },
];

// ── Checkout Dialog ──
interface CheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  payMethod: PayMethod;
  setPayMethod: (m: PayMethod) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  onConfirm: () => void;
}

export function CheckoutDialog({ open, onOpenChange, total, payMethod, setPayMethod, cashReceived, setCashReceived, onConfirm }: CheckoutProps) {
  const cashNum = parseFloat(cashReceived.replace(/,/g, "")) || 0;
  const change = Math.max(0, cashNum - total);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Cobrar Venta</DialogTitle>
        </DialogHeader>
        <div className="bg-neutral-900 text-white rounded-xl px-5 py-4 flex justify-between items-center">
          <span className="text-sm text-neutral-400">Total a cobrar</span>
          <span className="text-3xl font-black">RD$ {total.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PAY_METHODS.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => setPayMethod(key)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 text-sm font-bold transition-all",
                payMethod === key ? color + " border-current" : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              )}>
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
        {payMethod === "cash" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Efectivo recibido</label>
            <input
              type="number"
              placeholder="0"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-xl font-bold text-right focus:outline-none focus:border-black transition-colors"
            />
            {cashNum >= total && (
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <span className="text-sm text-emerald-700 font-semibold">Cambio</span>
                <span className="text-xl font-black text-emerald-700">RD$ {change.toLocaleString()}</span>
              </div>
            )}
            {cashNum > 0 && cashNum < total && (
              <div className="text-center text-xs text-rose-500 font-medium">
                Faltan RD$ {(total - cashNum).toLocaleString()}
              </div>
            )}
          </div>
        )}
        <button
          onClick={onConfirm}
          disabled={payMethod === "cash" && cashNum < total && cashReceived !== ""}
          className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          ✓ Confirmar Pago
        </button>
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
  taller: { name: string; logo?: string; address?: string; phone?: string };
  lastInvoice: { id: string; ncf: string } | null;
  mechanicId?: string;
}

export function PrintReceiptDialog({ open, onClose, cart, subtotal, itbis, total, payMethod, cashNum, change, taller, lastInvoice, mechanicId }: PrintReceiptProps) {
  const technicians = useStore((s) => s.technicians);
  const techName = mechanicId ? (technicians.find(t => t.id === mechanicId)?.name ?? undefined) : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ¡Venta completada!
          </DialogTitle>
        </DialogHeader>
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden flex justify-center py-4 px-2 max-h-[60vh] overflow-y-auto">
          <Ticket 
            invoiceId={lastInvoice?.id || `TEMP-${Date.now()}`}
            ncf={lastInvoice?.ncf}
            createdAt={new Date().toISOString()}
            tenant={taller}
            items={cart.map(c => ({ name: c.name, quantity: c.quantity, salePrice: c.salePrice }))}
            subtotal={subtotal}
            itbis={itbis}
            total={total}
            payMethod={payMethod}
            cashReceived={cashNum}
            mechanicName={techName}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()}
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


