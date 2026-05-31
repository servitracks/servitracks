"use client";

import { useRef } from "react";
import { useStore, type Product } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import Barcode from "react-barcode";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export default function PrintLabelDialog({ open, onOpenChange, product }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const barcodeSettings = useStore(s => s.barcodeSettings);

  if (!product) return null;

  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Configuración para impresión térmica típica de 50x25mm
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Etiqueta - ${product.sku}</title>
          <style>
            @page {
              size: 50mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm;
              width: 46mm;
              height: 21mm;
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
            }
            .name {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 2px;
              max-height: 10px;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              width: 100%;
            }
            .price {
              font-size: 10px;
              font-weight: 900;
              margin-bottom: 2px;
            }
            .loc {
              font-size: 7px;
              color: #333;
            }
            .barcode-container {
              display: flex;
              justify-content: center;
              width: 100%;
            }
            .barcode-container svg {
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="name">${product.name}</div>
          <div class="price">RD$ ${product.salePrice.toLocaleString("es-DO")}</div>
          <div class="barcode-container">
            ${printRef.current.innerHTML}
          </div>
          ${product.location ? `<div class="loc">Ubicación: ${product.location}</div>` : ''}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Esperar un momento a que los estilos y el SVG se rendericen
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      onOpenChange(false);
    }, 250);
  };

  const codeToPrint = product.barcode || product.sku;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Etiqueta
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center bg-neutral-50 rounded-xl border border-neutral-200 border-dashed">
          {/* Vista Previa Visual (no es exactamente la de impresión) */}
          <div className="w-[50mm] h-[25mm] bg-white border border-neutral-300 shadow-sm flex flex-col items-center justify-center p-1 relative overflow-hidden">
            <div className="text-[7px] font-bold text-center leading-tight truncate w-full px-1">{product.name}</div>
            <div className="text-[8px] font-black mt-0.5">RD$ {product.salePrice.toLocaleString("es-DO")}</div>
            <div ref={printRef} className="mt-0.5 w-full flex justify-center overflow-hidden">
              <Barcode 
                value={codeToPrint} 
                width={barcodeSettings?.width ?? 1.5} 
                height={barcodeSettings?.height ?? 40} 
                fontSize={barcodeSettings?.fontSize ?? 14} 
                margin={0} 
                displayValue={barcodeSettings?.showText ?? true} 
              />
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-4 text-center px-4">
            Asegúrate de configurar el tamaño de papel de tu impresora térmica a <strong>50x25mm</strong> (o equivalente).
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={handlePrint} className="rounded-xl bg-black text-white hover:bg-neutral-800 gap-2">
            <Printer className="h-4 w-4" /> Imprimir Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
