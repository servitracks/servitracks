"use client";

import { useRef, useState } from "react";
import { type Product } from "@/store/useStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Printer, Layers, Plus, Minus } from "lucide-react";
import { BarcodeLabelItem } from "./BarcodeLabelItem";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onOpenBulkPrint?: (product: Product, qty: number) => void;
}

export default function PrintLabelDialog({
  open,
  onOpenChange,
  product,
  onOpenBulkPrint,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState(false); // Predeterminado horizontal 50x25mm (evita que salga cortado a la izquierda)
  const [copies, setCopies] = useState<number>(1);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [labelSize, setLabelSize] = useState<"50x25" | "50x30" | "40x30" | "60x40">("50x25");

  if (!product) return null;

  const dimensionsMap: Record<
    typeof labelSize,
    { widthMm: number; heightMm: number; label: string }
  > = {
    "50x25": { widthMm: 50, heightMm: 25, label: "50 × 25 mm" },
    "50x30": { widthMm: 50, heightMm: 30, label: "50 × 30 mm" },
    "40x30": { widthMm: 40, heightMm: 30, label: "40 × 30 mm" },
    "60x40": { widthMm: 60, heightMm: 40, label: "60 × 40 mm" },
  };

  const { widthMm, heightMm } = dimensionsMap[labelSize];
  const codeToPrint = (product.barcode || product.sku || "000000").trim();
  const safeCopies = Math.max(1, Math.min(200, Number(copies) || 1));

  const handlePrint = () => {
    if (!printRef.current || typeof window === "undefined") return;

    // Limpiar cualquier contenedor previo de impresión atómica
    document
      .querySelectorAll(".atomic-print-target, #atomic-print-style")
      .forEach((el) => {
        try {
          el.remove();
        } catch {}
      });

    const pageWidthMm = rotate ? heightMm : widthMm;
    const pageHeightMm = rotate ? widthMm : heightMm;

    const styleEl = document.createElement("style");
    styleEl.id = "atomic-print-style";
    styleEl.innerHTML = `
      @page {
        size: ${pageWidthMm}mm ${pageHeightMm}mm;
        margin: 0mm !important;
      }
      @media screen {
        .atomic-print-target {
          position: fixed !important;
          top: 0 !important;
          left: -9999px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
      }
      @media print {
        @page {
          size: ${pageWidthMm}mm ${pageHeightMm}mm;
          margin: 0mm !important;
        }
        body > *:not(.atomic-print-target) {
          display: none !important;
        }
        html, body {
          margin: 0mm !important;
          padding: 0mm !important;
          width: ${pageWidthMm}mm !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .atomic-print-target {
          display: block !important;
          position: static !important;
          width: ${pageWidthMm}mm !important;
          margin: 0mm !important;
          padding: 0mm !important;
          background: #ffffff !important;
        }
        .single-thermal-label-page {
          width: ${pageWidthMm}mm !important;
          height: ${pageHeightMm}mm !important;
          margin: 0mm !important;
          padding: 0mm !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          page-break-after: always !important;
          break-after: page !important;
          box-sizing: border-box !important;
        }
        .single-thermal-label-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    const printRoot = document.createElement("div");
    printRoot.className = "atomic-print-target";

    const singleLabelHtml = printRef.current.innerHTML;
    const pagesHtml = Array.from({ length: safeCopies })
      .map(
        () => `
        <div class="single-thermal-label-page">
          <div style="${
            rotate
              ? `width: ${widthMm}mm; height: ${heightMm}mm; transform: rotate(90deg); transform-origin: center center;`
              : `width: ${widthMm}mm; height: ${heightMm}mm;`
          }">
            ${singleLabelHtml}
          </div>
        </div>
      `
      )
      .join("");

    printRoot.innerHTML = pagesHtml;
    document.body.appendChild(printRoot);

    const cleanup = () => {
      try {
        if (document.body.contains(printRoot)) document.body.removeChild(printRoot);
        if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
      } catch {}
    };

    setTimeout(() => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener("afterprint", finish);
        cleanup();
        onOpenChange(false);
      };
      window.addEventListener("afterprint", finish, { once: true });
      window.focus();
      window.print();
      setTimeout(finish, 1500);
    }, 120);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-5 bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-neutral-900">
            <Printer className="h-5 w-5" />
            Imprimir Etiqueta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vista Previa Visual de la Etiqueta */}
          <div className="py-6 px-4 flex flex-col items-center justify-center bg-neutral-100/80 rounded-2xl border border-neutral-200/80 min-h-[190px]">
            <div
              ref={printRef}
              className="bg-white border border-neutral-300 shadow-md rounded-xs transition-transform duration-300 overflow-hidden"
              style={{
                width: `${widthMm}mm`,
                height: `${heightMm}mm`,
                transform: rotate ? "rotate(90deg)" : "none",
              }}
            >
              <BarcodeLabelItem
                name={product.name}
                code={codeToPrint}
                sku={product.sku || codeToPrint}
                price={product.salePrice}
                location={product.location}
                widthMm={widthMm}
                heightMm={heightMm}
                options={{
                  showName: true,
                  showBarcode: true,
                  showSku,
                  showPrice,
                  showLocation: false,
                }}
              />
            </div>
          </div>

          {/* Controles rápidos: Cantidad + Tamaño */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">
                Cantidad de etiquetas
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="h-9 w-9 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                  className="h-9 text-center font-black text-sm rounded-xl border-neutral-200"
                />
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.min(200, c + 1))}
                  className="h-9 w-9 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">
                Medida del rollo
              </Label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-900"
              >
                <option value="50x25">50 × 25 mm (Estándar)</option>
                <option value="50x30">50 × 30 mm</option>
                <option value="40x30">40 × 30 mm</option>
                <option value="60x40">60 × 40 mm</option>
              </select>
            </div>
          </div>

          {/* Opciones visibles en la etiqueta */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/60 cursor-pointer">
              <span className="text-xs font-bold text-neutral-800">Mostrar Precio</span>
              <Switch checked={showPrice} onCheckedChange={setShowPrice} />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/60 cursor-pointer">
              <span className="text-xs font-bold text-neutral-800">Mostrar Código</span>
              <Switch checked={showSku} onCheckedChange={setShowSku} />
            </label>
          </div>

          {/* Rotar 90 grados (opcional para impresoras verticales) */}
          <div className="flex items-center justify-between w-full px-3.5 py-2.5 bg-neutral-50/70 rounded-xl border border-neutral-200">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-neutral-800">
                Rotar 90° (Vertical)
              </Label>
              <p className="text-[11px] text-neutral-500">
                Actívalo solo si tu impresora alimenta el rollo de costado
              </p>
            </div>
            <Switch checked={rotate} onCheckedChange={setRotate} />
          </div>

          {/* Botón para abrir el generador masivo */}
          {onOpenBulkPrint && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenBulkPrint(product, safeCopies);
              }}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" />
              Abrir en Impresión Masiva de Etiquetas (varios productos)
            </button>
          )}
        </div>

        <DialogFooter className="pt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-black text-white hover:bg-neutral-800 gap-2 cursor-pointer font-bold"
          >
            <Printer className="h-4 w-4" />
            Imprimir {safeCopies > 1 ? `(${safeCopies} etiquetas)` : "Etiqueta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
