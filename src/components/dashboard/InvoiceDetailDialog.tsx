"use client";

import { useState, useEffect } from "react";
import { useStore, Invoice } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Save, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ticket } from "@/components/pos/Ticket";
import { useParams } from "@/lib/next-compat";

interface InvoiceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function InvoiceDetailDialog({ open, onClose, invoice }: InvoiceDetailDialogProps) {
  const { tenant } = useParams();
  const { customers, updateInvoice, tenants } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { name: "ServiTracks", phone: "", address: "", rnc: "", logo: "" };

  const [editForm, setEditForm] = useState({
    ncf: "",
    paymentMethod: "cash" as Invoice["paymentMethod"],
    status: "paid" as Invoice["status"],
    notes: "",
  });

  useEffect(() => {
    if (invoice) {
      setEditForm({
        ncf: invoice.ncf || "",
        paymentMethod: invoice.paymentMethod || "cash",
        status: invoice.status || "paid",
        notes: invoice.notes || "",
      });
    }
  }, [invoice]);

  if (!invoice) return null;

  const customer = customers.find((c) => c.id === invoice.customerId);

  const handleSave = () => {
    updateInvoice(invoice.id, {
      ncf: editForm.ncf,
      paymentMethod: editForm.paymentMethod,
      status: editForm.status,
      notes: editForm.notes,
    });
    toast.success("Factura actualizada correctamente");
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Estilo para impresión térmica de 80mm */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #receipt-print-dialog { display: block !important; }
          @page { size: 80mm auto; margin: 4mm; }
        }
        #receipt-print-dialog { display: none; }
      `}</style>

      {/* 80mm Thermal Receipt (oculto en pantalla, visible al imprimir) */}
      <div id="receipt-print-dialog">
        <Ticket 
           invoiceId={invoice.id}
           ncf={editForm.ncf}
           qrUrl={invoice.qrUrl}
           securityCode={invoice.securityCode}
           signatureDate={invoice.signatureDate}
           createdAt={invoice.createdAt}
           tenant={taller}
           customer={customer}
           items={invoice.items}
           subtotal={invoice.subtotal}
           itbis={invoice.tax}
           total={invoice.total}
           payMethod={editForm.paymentMethod}
           notes={editForm.notes}
        />
      </div>

      {/* Pantalla interactiva en Servitrack */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-6 flex flex-col max-h-[calc(100dvh-4rem)] overflow-hidden">
          <DialogHeader className="pb-4 border-b border-neutral-100 flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-neutral-900">
              <div className="h-9 w-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              Detalle de Factura
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4 overflow-y-auto flex-1 pr-1">
            {/* Visual Receipt Summary card */}
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200/60 p-5 font-mono text-xs leading-relaxed space-y-2.5 relative overflow-hidden">
              <div className="absolute right-4 top-4">
                <Badge className={cn("border-none text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full",
                  editForm.status === "paid" ? "bg-emerald-100 text-emerald-800" :
                  editForm.status === "pending" ? "bg-amber-100 text-amber-800" :
                  "bg-rose-100 text-rose-800"
                )}>
                  {editForm.status === "paid" ? "PAGADA" : editForm.status === "pending" ? "PENDIENTE" : "CANCELADA"}
                </Badge>
              </div>

              <div className="text-center space-y-0.5 mb-2 mt-4">
                {taller.logo && (
                  <div className="flex justify-center mb-2">
                    <img src={taller.logo} alt="Logo" className="h-12 w-auto max-w-[120px] object-contain filter grayscale contrast-125" />
                  </div>
                )}
                <div className="font-bold text-sm text-neutral-800 uppercase tracking-tight">{taller.name}</div>
                <div className="text-[10px] text-neutral-500">{taller.address}</div>
                <div className="text-[10px] text-neutral-500">Tel: {taller.phone}</div>
                {taller.rnc && <div className="text-[10px] text-neutral-500">RNC: {taller.rnc}</div>}
              </div>
              <div className="border-t border-dashed border-neutral-200 my-3" />

              <div className="flex justify-between">
                <span className="text-neutral-400">Cliente:</span>
                <span className="font-bold text-neutral-700">{customer?.name || "Cliente General"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Fecha:</span>
                <span className="text-neutral-700">{new Date(invoice.createdAt).toLocaleDateString("es-DO")} {new Date(invoice.createdAt).toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {editForm.ncf && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">NCF:</span>
                  <span className="font-bold text-neutral-800">{editForm.ncf}</span>
                </div>
              )}

              <div className="border-t border-dashed border-neutral-200 my-3" />

              {/* Items List */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {invoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[28px_1fr_auto_minmax(55px,auto)] gap-1 text-[11px] items-center">
                    <span className="text-neutral-500 font-medium">{item.quantity}x</span>
                    <span className="text-neutral-700 truncate pr-2">{item.name}</span>
                    <span className="text-neutral-400 text-right font-medium">RD$</span>
                    <span className="font-bold text-neutral-800 text-right">
                      {(item.unitPrice * item.quantity).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-neutral-200 my-3" />

              <div className="space-y-1.5 text-[11px]">
                <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 text-neutral-500 items-center">
                  <span>Subtotal</span>
                  <span className="text-neutral-400 text-right">RD$</span>
                  <span className="text-right font-medium">{invoice.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 text-neutral-500 items-center">
                  <span>ITBIS (18%)</span>
                  <span className="text-neutral-400 text-right">RD$</span>
                  <span className="text-right font-medium">{invoice.tax.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 font-black text-sm text-neutral-900 border-t border-dashed border-neutral-200 pt-3 mt-3 items-center">
                <span className="tracking-tight uppercase">Total</span>
                <span className="text-neutral-400 text-xs font-bold text-right">RD$</span>
                <span className="text-right text-base">{invoice.total.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4 border-t border-neutral-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Editar Información</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ncf" className="text-xs font-bold text-neutral-600">Número NCF</Label>
                  <Input
                    id="ncf"
                    value={editForm.ncf}
                    placeholder="B01-XXXXXXXX"
                    className="h-10 rounded-xl border-neutral-200 focus:ring-1 focus:ring-black text-sm"
                    onChange={(e) => setEditForm({ ...editForm, ncf: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-600">Método de Pago</Label>
                  <Select
                    value={editForm.paymentMethod}
                    onValueChange={(val) => setEditForm({ ...editForm, paymentMethod: val as Invoice["paymentMethod"] })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-neutral-150 shadow-lg">
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-600">Estado de Factura</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => setEditForm({ ...editForm, status: val as Invoice["status"] })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-neutral-150 shadow-lg">
                      <SelectItem value="paid">✅ Pagada</SelectItem>
                      <SelectItem value="pending">⏳ Pendiente</SelectItem>
                      <SelectItem value="cancelled">🚫 Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="notes" className="text-xs font-bold text-neutral-600">Comentario / Notas</Label>
                  <Input
                    id="notes"
                    value={editForm.notes}
                    placeholder="Escribe alguna observación..."
                    className="h-10 rounded-xl border-neutral-200 focus:ring-1 focus:ring-black text-sm"
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-neutral-100 pt-4 mt-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl flex-1 h-11 font-bold text-neutral-600 border-neutral-200 hover:bg-neutral-50 gap-2 text-sm"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="rounded-xl flex-1 h-11 font-bold bg-black text-white hover:bg-neutral-800 gap-2 shadow-sm text-sm"
            >
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
