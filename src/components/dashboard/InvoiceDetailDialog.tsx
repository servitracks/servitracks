"use client";

import { useRef } from "react";
import { useStore, Invoice } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ticket, translatePaymentMethod } from "@/components/pos/Ticket";
import { useParams } from "@/lib/next-compat";
import { printThermalDocument } from "@/lib/thermalPrint";

interface InvoiceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  defaultEdit?: boolean;
}

export function InvoiceDetailDialog({ open, onClose, invoice }: InvoiceDetailDialogProps) {
  const { tenant } = useParams();
  const { customers, tenants, printSettings } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { name: "ServiTracks", phone: "", address: "", rnc: "", logo: "" };
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const customer = customers.find((c) => c.id === invoice.customerId);

  const handlePrint = () => {
    if (!printRef.current) return;
    printThermalDocument({
      element: printRef.current,
      title: `Factura_${invoice.id}`,
      paperSize: (printSettings.paperSize as any) || "80mm",
    });
  };

  const statusLabel =
    invoice.status === "paid" ? "PAGADA" :
    invoice.status === "pending" ? "PENDIENTE" : "ANULADA";

  const statusBadgeClass =
    invoice.status === "paid" ? "bg-emerald-100 text-emerald-800" :
    invoice.status === "pending" ? "bg-amber-100 text-amber-800" :
    "bg-rose-100 text-rose-800";

  let parsedMeta: {
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
  let cleanNotesText: string | null = invoice.notes || null;

  if (invoice.notes && invoice.notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(invoice.notes);
      if (parsed && typeof parsed === "object" && ("condicionCobro" in parsed || "instrumentoPago" in parsed)) {
        parsedMeta = parsed;
        cleanNotesText = null;
      }
    } catch {
      // Conservar texto plano si no es JSON válido
    }
  }

  const methodLabel =
    parsedMeta?.instrumentoPago === "MIXTO"
      ? "PAGO MIXTO"
      : translatePaymentMethod(parsedMeta?.instrumentoPago || invoice.paymentMethod);

  return (
    <>
      {/* Contenedor de impresión oculto para Ticket Térmico con altura auto-ajustable */}
      <div ref={printRef} style={{ display: "none" }} aria-hidden="true">
        <Ticket 
           invoiceId={invoice.id}
           ncf={invoice.ncf}
           qrUrl={invoice.qrUrl}
           securityCode={invoice.securityCode}
           signatureDate={invoice.signatureDate}
           createdAt={invoice.createdAt}
           tenant={taller}
           customer={customer}
           items={invoice.items || []}
           subtotal={invoice.subtotal}
           itbis={invoice.tax}
           total={invoice.total}
           payMethod={invoice.paymentMethod}
           notes={invoice.notes}
        />
      </div>

      {/* Modal de Consulta y Detalle de Factura (SOLO LECTURA) */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-neutral-200 shadow-2xl p-5 sm:p-6 flex flex-col max-h-[calc(100dvh-4rem)] overflow-hidden bg-white">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-neutral-900">
              <div className="h-8 w-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <span>Detalle de Factura</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-1">
            {/* Visual Receipt Card */}
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200/80 p-4 font-mono text-xs leading-relaxed space-y-2 relative overflow-hidden">
              <div className="absolute right-3.5 top-3.5">
                <Badge className={cn("border-none text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs", statusBadgeClass)}>
                  {statusLabel}
                </Badge>
              </div>

              <div className="text-center space-y-0.5 mb-2 mt-2">
                {taller.logo && (
                  <div className="flex justify-center mb-1.5">
                    <img src={taller.logo} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain filter grayscale contrast-125" />
                  </div>
                )}
                <div className="font-bold text-sm text-neutral-900 uppercase tracking-tight">{taller.name}</div>
                {taller.address && <div className="text-[10px] text-neutral-500">{taller.address}</div>}
                {taller.phone && <div className="text-[10px] text-neutral-500">Tel: {taller.phone}</div>}
                {taller.rnc && <div className="text-[10px] text-neutral-500 font-semibold">RNC: {taller.rnc}</div>}
              </div>

              <div className="border-t border-dashed border-neutral-200 my-2.5" />

              <div className="flex justify-between">
                <span className="text-neutral-500">Factura:</span>
                <span className="font-bold text-neutral-800 font-mono">#{invoice.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Cliente:</span>
                <span className="font-bold text-neutral-800">{customer?.name || invoice.customerName || "Cliente General"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fecha:</span>
                <span className="text-neutral-700">
                  {new Date(invoice.createdAt).toLocaleDateString("es-DO")} {new Date(invoice.createdAt).toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {invoice.ncf && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">NCF:</span>
                  <span className="font-bold text-neutral-900 font-mono">{invoice.ncf}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Método de pago:</span>
                <span className="font-bold text-neutral-900 uppercase">{methodLabel}</span>
              </div>
              {parsedMeta?.referencia && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">No. Referencia:</span>
                  <span className="font-bold text-neutral-900 font-mono uppercase">{parsedMeta.referencia}</span>
                </div>
              )}
              {parsedMeta?.instrumentoPago === "MIXTO" && parsedMeta.desgloseMixto && (
                <div className="bg-white/90 rounded-lg border border-neutral-200/80 p-2 space-y-1 text-[10.5px]">
                  <div className="font-bold text-neutral-600 uppercase text-[9.5px] tracking-wider">Desglose Pago Mixto:</div>
                  {Number(parsedMeta.desgloseMixto.efectivo || 0) > 0 && (
                    <div className="flex justify-between text-neutral-700">
                      <span>Efectivo:</span>
                      <span className="font-bold text-emerald-700">
                        RD$ {Number(parsedMeta.desgloseMixto.efectivo).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {Number(parsedMeta.desgloseMixto.tarjeta || 0) > 0 && (
                    <div className="flex justify-between text-neutral-700">
                      <span>
                        Tarjeta{parsedMeta.desgloseMixto.tarjetaRef ? ` (${parsedMeta.desgloseMixto.tarjetaRef})` : ""}:
                      </span>
                      <span className="font-bold text-sky-700">
                        RD$ {Number(parsedMeta.desgloseMixto.tarjeta).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {Number(parsedMeta.desgloseMixto.transferencia || 0) > 0 && (
                    <div className="flex justify-between text-neutral-700">
                      <span>
                        Transferencia{parsedMeta.desgloseMixto.transferenciaRef ? ` (${parsedMeta.desgloseMixto.transferenciaRef})` : ""}:
                      </span>
                      <span className="font-bold text-indigo-700">
                        RD$ {Number(parsedMeta.desgloseMixto.transferencia).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {Number(parsedMeta.desgloseMixto.cambioEfectivo || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold border-t border-dashed border-neutral-200 pt-1">
                      <span>Cambio devuelto:</span>
                      <span>
                        RD$ {Number(parsedMeta.desgloseMixto.cambioEfectivo).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-dashed border-neutral-200 my-2.5" />

              {/* Items List (READ-ONLY) */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(invoice.items || []).map((item, idx) => {
                  const qty = item.quantity || 1;
                  const price = item.unitPrice || (item as any).salePrice || 0;
                  const itemTotal = qty * price;
                  return (
                    <div key={item.id || idx} className="grid grid-cols-[28px_1fr_auto_minmax(55px,auto)] gap-1 text-[11px] items-center py-0.5 border-b border-neutral-100 last:border-none">
                      <span className="text-neutral-500 font-medium">{qty}x</span>
                      <span className="text-neutral-800 font-semibold truncate pr-2">{item.name}</span>
                      <span className="text-neutral-400 text-right font-medium">RD$</span>
                      <span className="font-bold text-neutral-900 text-right">
                        {itemTotal.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-neutral-200 my-2.5" />

              {/* Totales */}
              <div className="space-y-1 text-[11px]">
                <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 text-neutral-600 items-center">
                  <span>Subtotal</span>
                  <span className="text-neutral-400 text-right">RD$</span>
                  <span className="text-right font-medium">{(invoice.subtotal || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {(invoice.tax || 0) > 0 && (
                  <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 text-neutral-600 items-center">
                    <span>ITBIS (18%)</span>
                    <span className="text-neutral-400 text-right">RD$</span>
                    <span className="text-right font-medium">{(invoice.tax || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {(invoice.discount || 0) > 0 && (
                  <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 text-emerald-700 items-center font-bold">
                    <span>Descuento</span>
                    <span className="text-neutral-400 text-right">RD$</span>
                    <span className="text-right">-{(invoice.discount || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-[1fr_auto_minmax(55px,auto)] gap-1 font-black text-sm text-neutral-900 border-t border-dashed border-neutral-200 pt-2.5 mt-2.5 items-center">
                <span className="tracking-tight uppercase">Total Pagado</span>
                <span className="text-neutral-400 text-xs font-bold text-right">RD$</span>
                <span className="text-right text-base">{(invoice.total || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {cleanNotesText && (
              <div className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
                <span className="font-bold text-neutral-700 block text-[10px] uppercase tracking-wider mb-0.5">Notas:</span>
                <p className="italic text-neutral-600">{cleanNotesText}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-neutral-100 pt-3 mt-1 shrink-0 flex flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl flex-1 h-10 font-bold text-neutral-800 border-neutral-200 hover:bg-neutral-50 gap-2 text-xs cursor-pointer shadow-2xs"
            >
              <Printer className="h-4 w-4" /> Imprimir Recibo
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="rounded-xl flex-1 h-10 font-bold bg-neutral-950 text-white hover:bg-neutral-800 text-xs cursor-pointer shadow-2xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
