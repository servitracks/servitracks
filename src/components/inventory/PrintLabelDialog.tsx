"use client";

import { useRef, useState } from "react";
import { useStore, type Product } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [rotate, setRotate] = useState(true); // Default to rotated based on user feedback

  if (!product) return null;

  const compats = product.vehicleCompatibilities && product.vehicleCompatibilities.length > 0
    ? product.vehicleCompatibilities
    : (product.vehicleMake || product.vehicleModel || product.vehicleYear)
      ? [{ make: product.vehicleMake, model: product.vehicleModel, year: product.vehicleYear }]
      : [];

  const compatString = compats.slice(0, 2).map(c => [c.make, c.model, c.year].filter(Boolean).join(" ")).join(" / ") 
    + (compats.length > 2 ? ` (+${compats.length - 2})` : '');

  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Configuración para impresión térmica
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rotationCss = rotate ? `
      @page {
        size: 25mm 50mm;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        width: 25mm;
        height: 50mm;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
      }
      .label-canvas {
        width: 50mm;
        height: 25mm;
        padding: 2.5mm; /* Margen de seguridad 2-3mm */
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transform: rotate(90deg);
        transform-origin: center center;
      }
    ` : `
      @page {
        size: 50mm 25mm landscape;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        width: 50mm;
        height: 25mm;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
      }
      .label-canvas {
        width: 100%;
        height: 100%;
        padding: 2.5mm; /* Margen de seguridad 2-3mm */
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Etiqueta - ${product.sku}</title>
          <style>
            ${rotationCss}
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
            .vehicle-info {
              font-size: 8px;
              font-weight: bold;
              margin-bottom: 2px;
              color: #333;
              text-align: center;
              max-height: 10px;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              width: 100%;
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
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="label-canvas">
            <div class="name">${product.name}</div>
            ${compatString 
              ? `<div class="vehicle-info">${compatString}</div>` 
              : ''}
            <div class="barcode-container">
              ${printRef.current.innerHTML}
            </div>
            ${product.location ? `<div class="loc">Ubicación: ${product.location}</div>` : ''}
          </div>
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
          <div className="w-[50mm] h-[25mm] bg-white border border-neutral-300 shadow-sm flex flex-col items-center justify-center p-1 relative overflow-hidden transition-transform duration-300" style={{ transform: rotate ? 'rotate(90deg)' : 'none' }}>
            <div className="text-[7px] font-bold text-center leading-tight truncate w-full px-1">{product.name}</div>
            {compatString && (
              <div className="text-[6.5px] font-bold text-neutral-700 mt-0.5 truncate w-full text-center px-1">
                {compatString}
              </div>
            )}
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
          
          <div className="mt-6 flex items-center justify-between w-full px-4 bg-white p-3 rounded-lg border border-neutral-200">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Rotar 90° (Landscape)</Label>
              <p className="text-xs text-neutral-500">Alinea el código con el borde ancho</p>
            </div>
            <Switch checked={rotate} onCheckedChange={setRotate} />
          </div>
          
          <p className="text-xs text-neutral-400 mt-4 text-center px-4">
            Asegúrate de configurar el tamaño de papel de tu impresora térmica a <strong>50x25mm</strong> (o equivalente). Margen interno aplicado: 2.5mm.
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
