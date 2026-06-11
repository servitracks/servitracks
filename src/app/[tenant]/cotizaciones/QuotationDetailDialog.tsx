"use client";

import { useMemo } from "react";
import { useStore, Customer, Vehicle, Product, Service } from "@/store/useStore";
import { X, Send, Printer, FileText, Check, Ban, ShoppingCart, RefreshCw, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, useParams } from "@/lib/next-compat";
import { cn } from "@/lib/utils";
import type { Quote, QuoteItem, QuoteStatus, WorkOrder } from "@/store/types";

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
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
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
  
  const updateQuote = useStore((s) => s.updateQuote);
  const addOrder = useStore((s) => s.addOrder);

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

  // Convert Quote to Work Order
  const handleConvertToOrder = (shouldRedirectToPos = false) => {
    try {
      const orderId = `o-cot-${Date.now()}`;
      
      // Separate service IDs and products
      const serviceIds = quote.items
        .filter((i) => i.serviceId)
        .map((i) => i.serviceId!);

      const parts = quote.items
        .filter((i) => i.productId)
        .map((i) => ({
          productId: i.productId!,
          quantity: i.quantity,
        }));

      const newOrder: WorkOrder = {
        id: orderId,
        tenantId,
        customerId: quote.customerId,
        vehicleId: quote.vehicleId,
        status: "pending",
        description: `Servicios importados de Cotización ${quote.quoteNumber}`,
        serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
        parts: parts.length > 0 ? parts : undefined,
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
        // Redirect directly to POS with orderId parameter to autoload cart
        router.push(`/${tenantSlug}/pos?orderId=${orderId}`);
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
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          /* Hide main app layout and overlays */
          body > div:first-child,
          .print\\:hidden,
          [class*="backdrop-blur"],
          .bg-black\\/80 {
            display: none !important;
          }

          /* Ensure body background is white */
          body {
            background: white !important;
          }

          /* Flatten Radix Dialog wrapper, positioners, and overlays */
          div.fixed, [role="dialog"] {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide default close button in print */
          [role="dialog"] > button {
            display: none !important;
          }

          /* Print sheet styling */
          #quotation-print-sheet {
            padding: 10mm !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-3xl rounded-2xl p-0 bg-white overflow-hidden max-h-[95vh] flex flex-col">
          
          {/* Actions Header bar */}
          <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-800">{quote.quoteNumber}</span>
              <Badge className={cn("text-xs font-bold border rounded-full px-2 py-0.5", statusColors[quote.status])}>
                {statusLabels[quote.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2.5">
              {quote.status === "draft" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 font-bold cursor-pointer"
                    onClick={() => handleUpdateStatus("rejected")}
                  >
                    <Ban className="h-3 w-3 mr-1" /> Rechazar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-emerald-600 border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 font-bold cursor-pointer"
                    onClick={() => handleUpdateStatus("accepted")}
                  >
                    <Check className="h-3 w-3 mr-1" /> Aprobar
                  </Button>
                </>
              )}
              {quote.status === "accepted" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-blue-600 border-blue-100 hover:bg-blue-50 hover:text-blue-700 font-bold cursor-pointer"
                  onClick={() => handleConvertToOrder(false)}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Facturar / Orden
                </Button>
              )}
              {quote.status === "rejected" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-neutral-600 border-neutral-200 hover:bg-neutral-100 font-bold cursor-pointer"
                  onClick={() => handleUpdateStatus("draft")}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Volver a Borrador
                </Button>
              )}
              
              <div className="h-4 w-px bg-neutral-200 mx-1" />
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer"
                onClick={handleShareWhatsApp}
                title="Compartir por WhatsApp"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer mr-8"
                onClick={handlePrint}
                title="Imprimir / PDF"
              >
                <Printer className="h-4 w-4 text-neutral-600" />
              </Button>

            </div>
          </div>

          {/* Printable Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0" id="quotation-print-sheet">
            
            {/* Centered Document Header */}
            <div className="flex flex-col items-center text-center pb-6 border-b-2 border-neutral-800">
              {currentTenant.logo ? (
                <img 
                  src={currentTenant.logo} 
                  alt="Logo" 
                  className="h-16 w-auto max-w-[200px] object-contain mb-3 filter grayscale contrast-125 print:h-14" 
                />
              ) : (
                <h2 className="text-2xl font-black text-neutral-900 tracking-wider uppercase mb-1">{currentTenant.name}</h2>
              )}
              <div className="text-xs text-neutral-500 font-medium space-y-1">
                {currentTenant.rnc && <p>RNC: <span className="font-bold text-neutral-700">{currentTenant.rnc}</span></p>}
                <p className="max-w-md mx-auto leading-relaxed">
                  {currentTenant.address && <span>{currentTenant.address}</span>}
                  {currentTenant.address && currentTenant.phone && <span className="mx-2 text-neutral-300">|</span>}
                  {currentTenant.phone && <span>Tel: <span className="font-bold text-neutral-700">{currentTenant.phone}</span></span>}
                </p>
              </div>
            </div>

            {/* Document Title, Client & Vehicle Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-neutral-200">
              {/* Left side: Quote Meta */}
              <div className="space-y-2">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-neutral-900">PRESUPUESTO</h1>
                  <p className="text-xs font-bold text-neutral-500 font-mono mt-0.5">{quote.quoteNumber}</p>
                </div>
                
                <div className="text-xs text-neutral-600 space-y-1 pt-1">
                  <p><span className="font-bold text-neutral-700">Fecha de Emisión:</span> {new Date(quote.createdAt).toLocaleDateString("es-DO")}</p>
                  {quote.validUntil && (
                    <p><span className="font-bold text-neutral-700">Válido hasta:</span> {new Date(quote.validUntil).toLocaleDateString("es-DO")}</p>
                  )}
                </div>
              </div>

              {/* Right side: Client & Vehicle Combined details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Cliente</h3>
                  <p className="text-xs font-bold text-neutral-800 leading-snug">{customer?.name || "Cliente General"}</p>
                  {customer?.phone && <p className="text-[11px] text-neutral-500">Tel: {customer.phone}</p>}
                  {customer?.email && <p className="text-[11px] text-neutral-500 truncate max-w-[140px]" title={customer.email}>{customer.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Vehículo</h3>
                  {vehicle ? (
                    <>
                      <p className="text-xs font-bold text-neutral-800 leading-snug">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
                      <p className="text-[11px] text-neutral-500 font-mono">Placa: {vehicle.plate.toUpperCase()}</p>
                      {vehicle.color && <p className="text-[11px] text-neutral-500">Color: {vehicle.color}</p>}
                    </>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic">Sin vehículo vinculado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-neutral-800 text-neutral-800 font-bold uppercase text-[9px] tracking-wider pb-2">
                    <th className="py-2.5 pr-4">Descripción / Artículo</th>
                    <th className="py-2.5 px-3 text-center w-[70px]">Cant.</th>
                    <th className="py-2.5 px-3 text-right w-[110px]">Precio Unit.</th>
                    <th className="py-2.5 px-3 text-right w-[90px]">Desc.</th>
                    <th className="py-2.5 px-3 text-right w-[110px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {quote.items.map((item) => (
                    <tr key={item.id} className="py-3 hover:bg-neutral-50/50">
                      <td className="py-3 pr-4 font-semibold text-neutral-800">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 text-center text-neutral-600 font-medium">
                        {item.serviceId ? <span className="text-neutral-400 font-bold">—</span> : item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-600 font-mono">
                        RD$ {item.unitPrice.toLocaleString("es-DO")}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-600 font-mono">
                        {item.discountPercentage ? `${item.discountPercentage}%` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-neutral-900 font-mono">
                        RD$ {item.total.toLocaleString("es-DO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 border-t-2 border-neutral-800">
              <div className="md:col-span-7 text-xs text-neutral-500">
                {quote.notes && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-[9px] uppercase tracking-wider text-neutral-400">Notas y Condiciones:</h4>
                    <p className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-100 text-neutral-500 italic whitespace-pre-line leading-relaxed text-[11px]">
                      {quote.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-5 text-xs text-neutral-600 space-y-2 font-medium ml-auto w-full max-w-[280px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-neutral-900 font-mono">RD$ {quote.subtotal.toLocaleString("es-DO")}</span>
                </div>
                {quote.discount && quote.discount > 0 ? (
                  <div className="flex justify-between text-rose-600">
                    <span>Descuento:</span>
                    <span className="font-semibold font-mono">- RD$ {quote.discount.toLocaleString("es-DO")}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>ITBIS (18%):</span>
                  <span className="font-semibold text-neutral-900 font-mono">RD$ {quote.tax.toLocaleString("es-DO")}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-900 pt-2.5 border-t-2 border-neutral-800">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="font-mono">RD$ {quote.total.toLocaleString("es-DO")}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Actions Footer */}
          <DialogFooter className="gap-2 shrink-0 border-t border-neutral-100 p-4 bg-neutral-50/50 flex justify-end print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-10 px-4 font-bold text-neutral-700 hover:bg-neutral-150 cursor-pointer"
            >
              Cerrar
            </Button>
            
            <Button
              type="button"
              onClick={() => handleConvertToOrder(false)}
              className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-2 h-10 px-4 font-bold cursor-pointer"
            >
              <FileText className="h-4 w-4" /> Crear Orden
            </Button>

            <Button
              type="button"
              onClick={() => handleConvertToOrder(true)}
              className="rounded-xl bg-black text-white hover:bg-neutral-850 gap-2 h-10 px-4 font-bold cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" /> Facturar POS
            </Button>
          </DialogFooter>
          
        </DialogContent>
      </Dialog>
    </>
  );
}
