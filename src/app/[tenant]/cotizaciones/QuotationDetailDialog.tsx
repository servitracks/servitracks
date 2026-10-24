"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useStore, Customer, Vehicle, Product, Service } from "@/store/useStore";
import { X, Send, Printer, FileText, Check, Ban, ShoppingCart, RefreshCw, MessageSquare, Archive, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, useParams } from "@/lib/next-compat";
import { cn } from "@/lib/utils";
import type { Quote, QuoteItem, QuoteStatus, WorkOrder } from "@/store/types";
import { Ticket } from "@/components/pos/Ticket";
import { printThermalDocument } from "@/lib/thermalPrint";

interface QuotationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  quote: Quote | null;
  tenantId: string;
}

const statusColors: Record<QuoteStatus, string> = {
  draft: "bg-neutral-150 text-neutral-600 border-neutral-200",
  sent: "bg-blue-50 text-blue-700 border-blue-100",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
  expired: "bg-amber-50 text-amber-700 border-amber-100",
  archived: "bg-purple-50 text-purple-700 border-purple-100",
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
  archived: "Archivada",
};

export default function QuotationDetailDialog({
  open,
  onClose,
  quote,
  tenantId,
}: QuotationDetailDialogProps) {
  const router = useRouter();
  const { tenant: tenantSlug } = useParams();

  const customers = useStore((s) => s.customers);
  const vehicles = useStore((s) => s.vehicles);
  const tenants = useStore((s) => s.tenants);
  const printSettings = useStore((s) => s.printSettings);
  
  const updateQuote = useStore((s) => s.updateQuote);
  const addOrder = useStore((s) => s.addOrder);

  const [paperFormat, setPaperFormat] = useState<"80mm" | "A4">(() => 
    printSettings.paperSize === "A4" ? "A4" : "80mm"
  );
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (printSettings.paperSize === "A4") {
      setPaperFormat("A4");
    } else {
      setPaperFormat("80mm");
    }
  }, [printSettings.paperSize]);

  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveObsInput, setArchiveObsInput] = useState("");

  const currentTenant = useMemo(() => 
    tenants.find((t) => t.id === tenantId) ?? { name: "ServiTracks", phone: "", address: "", rnc: "", logo: "" },
    [tenants, tenantId]
  );

  const customer = useMemo(() => 
    quote ? customers.find((c) => c.id === quote.customerId) : null,
    [customers, quote]
  );

  const vehicle = useMemo(() => 
    quote ? vehicles.find((v) => v.id === quote.vehicleId) : null,
    [vehicles, quote]
  );

  if (!quote) return null;

  // Update Status Helper
  const handleUpdateStatus = (status: QuoteStatus) => {
    updateQuote(quote.id, { status });
    toast.success(`Estado de cotización actualizado a ${statusLabels[status]}`);
  };

  const handleOpenArchiveModal = () => {
    setArchiveObsInput(quote?.observation || "");
    setIsArchiveDialogOpen(true);
  };

  // Convert Quote to Work Order
  const handleConvertToOrder = (shouldRedirectToPos = false) => {
    try {
      const orderId = crypto.randomUUID();
      
      // Separate service IDs and products
      const serviceIds = quote.items
        .filter((i) => i.serviceId && !i.serviceId.startsWith('custom-'))
        .map((i) => i.serviceId!);

      const customServices = quote.items
        .filter((i) => i.serviceId && i.serviceId.startsWith('custom-'))
        .map((i) => ({ 
          name: i.name, 
          price: i.unitPrice, 
          tax: i.taxPercentage ?? 0 
        }));

      const customParts = quote.items
        .filter((i) => !i.productId && (!i.serviceId || !i.serviceId.startsWith('custom-')))
        .map((i) => ({ 
          name: i.name, 
          price: i.unitPrice, 
          quantity: i.quantity, 
          tax: i.taxPercentage ?? 18 
        }));

      const parts = quote.items
        .filter((i) => i.productId && typeof i.productId === 'string' && i.productId.trim().length > 0)
        .map((i) => ({
          productId: i.productId!.trim(),
          name: i.name,
          price: i.unitPrice,
          quantity: i.quantity,
          tax: i.taxPercentage ?? 18,
        }));

      const newOrder: WorkOrder = {
        id: orderId,
        tenantId,
        customerId: quote.customerId,
        vehicleId: quote.vehicleId || "general",
        status: "pending",
        description: `Servicios importados de Cotización ${quote.quoteNumber}`,
        quoteId: quote.id,
        items: quote.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          serviceId: i.serviceId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxPercentage: i.taxPercentage ?? 18,
          discountPercentage: i.discountPercentage ?? 0,
          total: i.total,
        })),
        serviceIds: serviceIds,
        customServices: customServices.length > 0 ? customServices : undefined,
        customParts: customParts.length > 0 ? customParts : undefined,
        parts: parts,
        subtotal: quote.subtotal,
        tax: quote.tax,
        applyItbis: (quote.tax || 0) > 0,
        total: quote.total,
        notes: quote.notes ? `Notas de cotización: ${quote.notes}` : undefined,
        checklist: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to store
      addOrder(newOrder);
      
      // Update quote status to accepted
      updateQuote(quote.id, { status: "accepted" });
      
      toast.success("Cotización convertida en Orden de Trabajo con éxito");
      onClose();

      if (shouldRedirectToPos) {
        // Redirect directly to POS with orderId and quoteId parameters to autoload cart
        router.push(`/${tenantSlug}/pos?orderId=${orderId}&quoteId=${quote.id}`);
      } else {
        // Redirect to work orders
        router.push(`/${tenantSlug}/orders`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al convertir la cotización");
    }
  };

  // WhatsApp Share Link
  const handleShareWhatsApp = () => {
    if (!customer || !customer.phone) {
      toast.error("El cliente no tiene un número de teléfono registrado");
      return;
    }

    const brandModel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Vehículo";
    const plate = vehicle?.plate ? `(Placa: ${vehicle.plate})` : "";
    
    let itemsText = "";
    quote.items.forEach((item) => {
      itemsText += `• ${item.quantity}x ${item.name} - RD$ ${item.unitPrice.toLocaleString()}\n`;
    });

    const validText = quote.validUntil 
      ? `*Válida hasta:* ${new Date(quote.validUntil).toLocaleDateString("es-DO")}\n` 
      : "";

    const message = `*${currentTenant.name} - Presupuesto de Taller*\n\n` +
      `Estimado(a) *${customer.name}*,\n` +
      `Le compartimos la cotización *${quote.quoteNumber}* para su vehículo *${brandModel}* ${plate}.\n\n` +
      `*Detalles del presupuesto:*\n` +
      `${itemsText}\n` +
      `*Subtotal:* RD$ ${quote.subtotal.toLocaleString()}\n` +
      (quote.discount ? `*Descuento:* - RD$ ${quote.discount.toLocaleString()}\n` : "") +
      `*ITBIS (Impuestos):* RD$ ${quote.tax.toLocaleString()}\n` +
      `*Total Estimado:* RD$ ${quote.total.toLocaleString()}\n\n` +
      validText +
      (quote.notes ? `*Notas:* ${quote.notes}\n\n` : "") +
      `¿Desea que procedamos a agendar su cita para realizar el trabajo? Quedamos a su orden.`;

    const encodedText = encodeURIComponent(message);
    const cleanPhone = customer.phone.replace(/\D/g, "");
    
    // Add country code if missing (assuming Dominican Republic +1 if length is 10 digits)
    const formattedPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, "_blank");
    updateQuote(quote.id, { status: "sent" });
  };

  const handlePrint = () => {
    const printElement = componentRef.current;
    if (!printElement) return;

    printThermalDocument({
      element: printElement,
      title: `Cotizacion_${quote?.quoteNumber || "COT"}`,
      paperSize: paperFormat,
    });
  };

  const modalWidth = paperFormat === "A4" ? "sm:max-w-4xl" : "sm:max-w-[500px]";

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
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className={cn(modalWidth, "w-[96vw] sm:w-full rounded-3xl p-0 bg-white overflow-hidden h-[86vh] max-h-[88vh] flex flex-col shadow-2xl transition-all duration-200 border border-neutral-200/80")}>
          
          {/* Actions Header bar */}
          <div className="bg-neutral-50/90 px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white font-mono text-xs font-bold shrink-0">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-neutral-900 tracking-tight text-base sm:text-lg">
                    {quote.quoteNumber}
                  </span>
                  <Badge className={cn("text-[10px] font-bold border rounded-full px-2.5 py-0.5", statusColors[quote.status])}>
                    {statusLabels[quote.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                  <span className="font-medium text-neutral-700">
                    {customer?.name || "Cliente General"}
                  </span>
                  {vehicle && (
                    <>
                      <span>·</span>
                      <span className="font-semibold text-neutral-800">
                        {vehicle.brand} {vehicle.model}
                      </span>
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-neutral-100 border border-neutral-300 font-mono shadow-2xs text-[10px]">
                        <span className="text-[8px] font-bold text-neutral-400">RD</span>
                        <span className="font-black text-neutral-900">{vehicle.plate.toUpperCase()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mr-8 flex items-center gap-2 shrink-0">
              {quote.status !== "archived" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenArchiveModal}
                  className="h-8 px-3 rounded-xl border border-purple-200/90 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Archive className="h-3.5 w-3.5 text-purple-600" />
                  <span>Archivar</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateStatus("draft")}
                  className="h-8 px-3 rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Desarchivar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Printable Area - Vista previa con el Ticket idéntico al POS */}
          <div 
            className="receipt-scroll-container bg-neutral-100/90 p-3 sm:p-6 overflow-y-auto flex-1 min-h-0 flex justify-center items-start scroll-smooth"
            style={{
              scrollbarWidth: "auto",
              scrollbarColor: "#94a3b8 #f1f5f9",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div 
              ref={componentRef} 
              className={cn(
                "print-container bg-white shadow-lg rounded-xl transition-all duration-200 my-2 pb-6 self-start",
                paperFormat === "A4" ? "w-full max-w-[850px] p-2 sm:p-4" : "w-auto"
              )}
            >
              <Ticket
                invoiceId={quote.quoteNumber}
                tipoDocumento="COTIZACIÓN / PRESUPUESTO"
                esCotizacion={true}
                validUntil={quote.validUntil}
                observation={quote.observation}
                notes={quote.notes}
                createdAt={quote.createdAt}
                tenant={{
                  nombre: currentTenant.name,
                  name: currentTenant.name,
                  logo: currentTenant.logo,
                  logo_url: currentTenant.logo,
                  direccion: currentTenant.address,
                  address: currentTenant.address,
                  telefono: currentTenant.phone,
                  phone: currentTenant.phone,
                  rnc: currentTenant.rnc,
                }}
                customer={customer ? {
                  nombre: customer.name,
                  name: customer.name,
                  telefono: customer.phone,
                  phone: customer.phone,
                  rnc: customer.rnc,
                  cedula: customer.rnc,
                  direccion: customer.address,
                  address: customer.address,
                } : undefined}
                cliente={customer ? {
                  nombre: customer.name,
                  telefono: customer.phone,
                  phone: customer.phone,
                  rnc: customer.rnc,
                  cedula: customer.rnc,
                  direccion: customer.address,
                  address: customer.address,
                } : undefined}
                vehicle={vehicle ? {
                  brand: vehicle.brand,
                  model: vehicle.model,
                  year: vehicle.year,
                  plate: vehicle.plate,
                  color: vehicle.color,
                  km: vehicle.km,
                } : undefined}
                items={quote.items.map((i) => {
                  const lineNet = (i.quantity || 1) * (i.unitPrice || 0) * (1 - (i.discountPercentage || 0) / 100);
                  const lineTax = Math.round((lineNet * ((i.taxPercentage ?? 0) / 100)) * 100) / 100;
                  return {
                    id: i.id,
                    name: i.name,
                    descripcion: i.name,
                    quantity: i.quantity,
                    cantidad: i.quantity,
                    unitPrice: i.unitPrice,
                    precio_unitario: i.unitPrice,
                    salePrice: i.unitPrice,
                    tax: lineTax,
                    is_exento: (i.taxPercentage ?? 0) === 0,
                    total: i.total,
                  };
                })}
                subtotal={quote.subtotal}
                itbis={quote.tax}
                discount={quote.discount}
                total={quote.total}
                formato={paperFormat}
                orden={{
                  numero: quote.quoteNumber,
                  creado_en: quote.createdAt,
                  subtotal: quote.subtotal,
                  itbis: quote.tax,
                  descuento: quote.discount || 0,
                  total: quote.total,
                  saldo: 0,
                  pagado: 0,
                  metodo_pago: "Cotización",
                  notas: quote.notes,
                  items: quote.items.map((i) => {
                    const lineNet = (i.quantity || 1) * (i.unitPrice || 0) * (1 - (i.discountPercentage || 0) / 100);
                    const lineTax = Math.round((lineNet * ((i.taxPercentage ?? 0) / 100)) * 100) / 100;
                    return {
                      id: i.id,
                      name: i.name,
                      descripcion: i.name,
                      quantity: i.quantity,
                      cantidad: i.quantity,
                      unitPrice: i.unitPrice,
                      precio_unitario: i.unitPrice,
                      salePrice: i.unitPrice,
                      tax: lineTax,
                      is_exento: (i.taxPercentage ?? 0) === 0,
                      total: i.total,
                    };
                  }),
                  vehicle: vehicle ? {
                    brand: vehicle.brand,
                    model: vehicle.model,
                    year: vehicle.year,
                    plate: vehicle.plate,
                    color: vehicle.color,
                    km: vehicle.km,
                  } : undefined,
                }}
              />
            </div>
          </div>

          {/* Actions Footer - Compacto, estructurado y con fondos de color */}
          <div className="bg-white p-3 sm:px-5 border-t border-neutral-100 flex flex-col gap-2 shrink-0 print:hidden">
            {/* Fila 1: Selector de Formato + Utilidades (WhatsApp, Imprimir, Cerrar) */}
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              {/* Selector de tamaño */}
              <div className="flex items-center p-0.5 bg-neutral-100/90 rounded-xl border border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => setPaperFormat("80mm")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
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
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    paperFormat === "A4"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Hoja A4</span>
                </button>
              </div>

              {/* Botones de Utilidad con Fondo de Color */}
              <div className="flex items-center gap-1.5">
                {customer?.phone && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    className="rounded-xl border border-emerald-200/90 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 gap-1.5 h-8 px-2.5 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                    title="Compartir por WhatsApp"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 gap-1.5 h-8 px-3 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                >
                  <Printer className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Imprimir</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 h-8 px-3 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                >
                  Cerrar
                </Button>
              </div>
            </div>

            {/* Fila 2: Acciones Principales según el estado de la Cotización */}
            {quote.status === "draft" && (
              <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateStatus("rejected")}
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 h-9 px-3 text-xs font-bold cursor-pointer gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  <span>Rechazar</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateStatus("accepted")}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 text-xs font-bold cursor-pointer gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Aprobar Cotización</span>
                </Button>
              </div>
            )}

            {quote.status === "sent" && (
              <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateStatus("rejected")}
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 h-9 px-3 text-xs font-bold cursor-pointer gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  <span>Rechazar</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateStatus("accepted")}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 text-xs font-bold cursor-pointer gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Aprobar Cotización</span>
                </Button>
              </div>
            )}

            {quote.status === "accepted" && (
              <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConvertToOrder(false)}
                  className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 gap-1.5 h-9 px-3 text-xs font-bold cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>Crear Orden</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConvertToOrder(true)}
                  className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 gap-1.5 h-9 px-3.5 text-xs font-bold shadow-xs active:scale-[0.98] cursor-pointer transition-all"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Facturar en POS</span>
                </Button>
              </div>
            )}

            {(quote.status === "rejected" || quote.status === "expired") && (
              <div className="w-full pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateStatus("draft")}
                  className="w-full rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 gap-1.5 h-9 px-3.5 text-xs font-bold shadow-xs active:scale-[0.98] cursor-pointer transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reactivar como Borrador</span>
                </Button>
              </div>
            )}
          </div>
          
        </DialogContent>
      </Dialog>

      {/* Custom Archive Dialog inside Detail View */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white z-[350]">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Archive className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-neutral-900">
                Archivar Cotización {quote?.quoteNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500 pt-1">
              Ingrese el motivo u observación por el cual se archiva esta cotización.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <textarea
              placeholder="Ej: Cliente canceló por costo de repuestos, vehículo vendido..."
              value={archiveObsInput}
              onChange={(e) => setArchiveObsInput(e.target.value)}
              className="w-full min-h-[90px] text-xs p-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 resize-y"
            />
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
              className="rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 h-9 px-4 font-semibold text-xs cursor-pointer shadow-2xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (quote) {
                  updateQuote(quote.id, {
                    status: "archived",
                    observation: archiveObsInput.trim() || undefined,
                  });
                  toast.success(`Cotización ${quote.quoteNumber} archivada correctamente`);
                  setIsArchiveDialogOpen(false);
                }
              }}
              className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold h-9 px-4 text-xs cursor-pointer shadow-xs"
            >
              Archivar Cotización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
