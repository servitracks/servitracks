"use client";

import { useRef, useState, useEffect } from "react";
import { useStore, Invoice } from "@/store/useStore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, Receipt, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ticket, translatePaymentMethod } from "@/components/pos/Ticket";
import { useParams } from "@/lib/next-compat";
import { printThermalDocument } from "@/lib/thermalPrint";
import { toast } from "sonner";

interface InvoiceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  defaultEdit?: boolean;
}

export function InvoiceDetailDialog({ open, onClose, invoice }: InvoiceDetailDialogProps) {
  const { tenant } = useParams();
  const { customers, tenants, printSettings, vehicles } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { name: "ServiTracks", phone: "", address: "", rnc: "", logo: "" };
  const printRef = useRef<HTMLDivElement>(null);

  const [paperFormat, setPaperFormat] = useState<"80mm" | "A4">(() =>
    printSettings?.paperSize === "A4" ? "A4" : "80mm"
  );

  useEffect(() => {
    if (printSettings?.paperSize === "A4") {
      setPaperFormat("A4");
    } else {
      setPaperFormat("80mm");
    }
  }, [printSettings?.paperSize]);

  if (!invoice) return null;

  const customer = customers.find((c) => c.id === invoice.customerId);
  const vehicle = vehicles.find((v) => v.id === (invoice as any).vehicleId);

  const handlePrint = () => {
    if (!printRef.current) return;
    printThermalDocument({
      element: printRef.current,
      title: `Factura_${invoice.id}`,
      paperSize: paperFormat,
    });
  };

  const statusLabel =
    invoice.status === "paid" ? "PAGADA" :
    invoice.status === "pending" ? "PENDIENTE" : "ANULADA";

  const statusBadgeClass =
    invoice.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" :
    invoice.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200/80" :
    "bg-rose-50 text-rose-700 border-rose-200/80";

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
      // Conservar texto plano
    }
  }

  const methodLabel =
    parsedMeta?.instrumentoPago === "MIXTO"
      ? "PAGO MIXTO"
      : translatePaymentMethod(parsedMeta?.instrumentoPago || invoice.paymentMethod);

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const phone = customer?.phone;
    if (!phone) {
      toast.error("El cliente no tiene un número de teléfono registrado");
      return;
    }

    let itemsText = "";
    (invoice.items || []).forEach((item) => {
      const lineTotal = (item as any).total || (item.unitPrice || 0) * (item.quantity || 1);
      itemsText += `• ${item.quantity || 1}x ${item.name} - RD$ ${Number(lineTotal).toLocaleString("es-DO")}\n`;
    });

    const ncfText = invoice.ncf ? `*NCF:* ${invoice.ncf}\n` : "";

    const message =
      `*${taller.name || "ServiTracks"} - Comprobante de Pago*\n\n` +
      `Estimado(a) *${customer?.name || "Cliente"}*,\n` +
      `Le compartimos el comprobante de su factura *#${invoice.id.slice(-6).toUpperCase()}*.\n\n` +
      ncfText +
      `*Detalles del servicio/compra:*\n` +
      `${itemsText}\n` +
      `*Subtotal:* RD$ ${(invoice.subtotal || 0).toLocaleString("es-DO")}\n` +
      (invoice.tax ? `*ITBIS:* RD$ ${invoice.tax.toLocaleString("es-DO")}\n` : "") +
      (invoice.discount ? `*Descuento:* - RD$ ${invoice.discount.toLocaleString("es-DO")}\n` : "") +
      `*Total:* RD$ ${(invoice.total || 0).toLocaleString("es-DO")}\n\n` +
      `*Método de pago:* ${methodLabel}\n` +
      `¡Gracias por preferir nuestros servicios!`;

    const encodedText = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, "_blank");
  };

  const modalWidth = paperFormat === "A4" ? "sm:max-w-4xl" : "sm:max-w-[460px]";

  return (
    <>
      <style>{`
        .receipt-scroll-container::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .receipt-scroll-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 9999px;
        }
        .receipt-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
          border: 2px solid #f1f5f9;
        }
        .receipt-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent
          className={cn(
            modalWidth,
            "w-[96vw] sm:w-full rounded-3xl p-0 bg-white overflow-hidden h-[86vh] max-h-[88vh] flex flex-col shadow-2xl transition-all duration-200 border border-neutral-200/80"
          )}
        >
          {/* 1. Header Bar: Compacto y limpio (sin colisiones con el botón de cerrar) */}
          <div className="bg-neutral-50/90 px-5 py-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-10">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white font-mono text-xs font-bold shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-neutral-900 tracking-tight text-sm">
                    {invoice.ncf || `#${invoice.id.slice(-6).toUpperCase()}`}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold border rounded-full px-2 py-0.5",
                      statusBadgeClass
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
                {customer?.name && (
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5" title={customer.name}>
                    {customer.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Área Central: Visualización Centrada y Nítida del Ticket */}
          <div
            className="receipt-scroll-container bg-neutral-100/90 p-3 sm:p-5 overflow-y-auto flex-1 min-h-0 flex justify-center items-start scroll-smooth"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e1 #f1f5f9",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              ref={printRef}
              className={cn(
                "print-container bg-white shadow-xl rounded-xl transition-all duration-200 my-1 pb-4 self-start",
                paperFormat === "A4" ? "w-full max-w-[850px] p-4 sm:p-6" : "w-auto"
              )}
            >
              <Ticket
                invoiceId={invoice.id}
                ncf={invoice.ncf}
                qrUrl={invoice.qrUrl}
                securityCode={invoice.securityCode}
                signatureDate={invoice.signatureDate}
                createdAt={invoice.createdAt}
                tenant={{
                  nombre: taller.name,
                  name: taller.name,
                  logo: taller.logo,
                  logo_url: taller.logo,
                  direccion: taller.address,
                  address: taller.address,
                  telefono: taller.phone,
                  phone: taller.phone,
                  rnc: taller.rnc,
                }}
                customer={
                  customer
                    ? {
                        nombre: customer.name,
                        name: customer.name,
                        telefono: customer.phone,
                        phone: customer.phone,
                        rnc: customer.rnc,
                        cedula: customer.rnc,
                        direccion: customer.address,
                        address: customer.address,
                      }
                    : invoice.customerName
                    ? {
                        nombre: invoice.customerName,
                        name: invoice.customerName,
                        rnc: invoice.customerRnc,
                        cedula: invoice.customerRnc,
                      }
                    : undefined
                }
                cliente={
                  customer
                    ? {
                        nombre: customer.name,
                        telefono: customer.phone,
                        phone: customer.phone,
                        rnc: customer.rnc,
                        cedula: customer.rnc,
                        direccion: customer.address,
                      }
                    : undefined
                }
                vehicle={
                  vehicle
                    ? {
                        brand: vehicle.brand,
                        model: vehicle.model,
                        year: vehicle.year,
                        plate: vehicle.plate,
                        color: vehicle.color,
                        km: vehicle.km,
                      }
                    : undefined
                }
                items={(invoice.items || []).map((i) => {
                  const qty = i.quantity || 1;
                  const price = i.unitPrice || (i as any).salePrice || 0;
                  const lineTax = i.tax || 0;
                  return {
                    id: i.id,
                    name: i.name,
                    descripcion: i.name,
                    quantity: qty,
                    cantidad: qty,
                    unitPrice: price,
                    precio_unitario: price,
                    salePrice: price,
                    tax: lineTax,
                    is_exento: lineTax === 0,
                    total: (i as any).total || qty * price,
                  };
                })}
                subtotal={invoice.subtotal}
                itbis={invoice.tax}
                discount={invoice.discount}
                total={invoice.total}
                payMethod={invoice.paymentMethod}
                notes={cleanNotesText || undefined}
                formato={paperFormat}
                orden={{
                  numero: invoice.ncf || invoice.id,
                  creado_en: invoice.createdAt,
                  subtotal: invoice.subtotal,
                  itbis: invoice.tax,
                  descuento: invoice.discount || 0,
                  total: invoice.total,
                  saldo: 0,
                  pagado: invoice.total,
                  metodo_pago: invoice.paymentMethod,
                  pago_referencia: parsedMeta?.referencia,
                  notas: cleanNotesText || undefined,
                  items: (invoice.items || []).map((i) => {
                    const qty = i.quantity || 1;
                    const price = i.unitPrice || (i as any).salePrice || 0;
                    const lineTax = i.tax || 0;
                    return {
                      id: i.id,
                      name: i.name,
                      descripcion: i.name,
                      quantity: qty,
                      cantidad: qty,
                      unitPrice: price,
                      precio_unitario: price,
                      salePrice: price,
                      tax: lineTax,
                      is_exento: lineTax === 0,
                      total: (i as any).total || qty * price,
                    };
                  }),
                }}
              />
            </div>
          </div>

          {/* 3. Footer de Controles CENTRADOS y Compactos */}
          <div className="bg-white p-3 sm:px-5 border-t border-neutral-100 flex flex-col items-center justify-center gap-2.5 shrink-0">
            {/* Selector de formato CENTRADO */}
            <div className="flex items-center justify-center p-0.5 bg-neutral-100/90 rounded-xl border border-neutral-200/80">
              <button
                type="button"
                onClick={() => setPaperFormat("80mm")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  paperFormat === "80mm"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Ticket 80mm</span>
              </button>

              <button
                type="button"
                onClick={() => setPaperFormat("A4")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  paperFormat === "A4"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Hoja A4</span>
              </button>
            </div>

            {/* Botones de Acción CENTRADOS con Fondos de Color */}
            <div className="flex items-center justify-center gap-2 w-full">
              {customer?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-2xs transition-all"
                  title="Compartir por WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-semibold cursor-pointer h-9 px-4 text-xs gap-1.5 shadow-xs active:scale-[0.98] transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimir ({paperFormat === "A4" ? "A4" : "80mm"})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer h-9 px-3.5 text-xs font-semibold shadow-2xs transition-all"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
