"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "@/lib/next-compat";
import {
  LABEL_PRESETS,
  BarcodeLabelItem,
  type BarcodeLabelDisplayOptions,
} from "@/components/inventory/BarcodeLabelItem";
import {
  BULK_LABELS_STORAGE_KEY,
  type BulkLabelsPrintPayload,
  type BulkLabelQueueItem,
} from "@/components/inventory/BulkPrintLabelsSection";
import { ArrowLeft, Printer } from "lucide-react";

export default function BulkPrintLabelsPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const tenant = (params?.tenant as string) || "";

  const [payload, setPayload] = useState<BulkLabelsPrintPayload | null>(null);
  const [presetId, setPresetId] = useState<string>("sheet_24_63x33");
  const [options, setOptions] = useState<BarcodeLabelDisplayOptions>({
    showName: true,
    showSku: true,
    showPrice: true,
    showBarcode: true,
    showLocation: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(BULK_LABELS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BulkLabelsPrintPayload;
        setPayload(parsed);
        if (parsed.presetId) setPresetId(parsed.presetId);
        if (parsed.options) setOptions(parsed.options);
      }
    } catch (e) {
      console.error("Error al leer etiquetas para imprimir:", e);
    }
  }, []);

  const activePreset = useMemo(
    () => LABEL_PRESETS.find((p) => p.id === presetId) || LABEL_PRESETS[0],
    [presetId]
  );

  // Expandir cada producto según la cantidad (QTY) solicitada
  const expandedLabels = useMemo(() => {
    if (!payload?.items) return [];
    const list: (BulkLabelQueueItem & { instanceKey: string })[] = [];
    payload.items.forEach((item) => {
      const count = Math.max(0, Math.min(1000, Number(item.quantity) || 0));
      for (let i = 0; i < count; i++) {
        list.push({
          ...item,
          instanceKey: `${item.productId}_${i}`,
        });
      }
    });
    return list;
  }, [payload]);

  // Agrupar en páginas cuando el formato es Hoja A4/Carta
  const sheetPages = useMemo(() => {
    if (activePreset.type !== "sheet") return [];
    const perPage = activePreset.perSheet || 24;
    const pages: (typeof expandedLabels)[] = [];
    for (let i = 0; i < expandedLabels.length; i += perPage) {
      pages.push(expandedLabels.slice(i, i + perPage));
    }
    return pages;
  }, [expandedLabels, activePreset]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.opener) {
      window.close();
      return;
    }
    router.push(`/${tenant}/inventory?tab=labels`);
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.focus();
    window.print();
  };

  const isRoll = activePreset.type === "roll";

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex flex-col">
      {/* Estilos dinámicos de impresión según sea Hoja A4 o Rollo Térmico */}
      <style>{`
        @media print {
          @page {
            size: ${
              isRoll
                ? `${activePreset.widthMm}mm ${activePreset.heightMm}mm`
                : "A4 portrait"
            };
            margin: 0mm !important;
          }
          .no-print {
            display: none !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0mm !important;
            padding: 0mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-canvas-wrapper {
            background: #ffffff !important;
            padding: 0mm !important;
            margin: 0mm !important;
            gap: 0mm !important;
            display: block !important;
          }
          .label-sheet-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .label-sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .thermal-roll-sticker-page {
            width: ${activePreset.widthMm}mm !important;
            height: ${activePreset.heightMm}mm !important;
            margin: 0mm !important;
            padding: 0mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
          }
          .thermal-roll-sticker-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Barra Superior Independiente (idéntica a la Imagen 5) */}
      <header className="no-print sticky top-0 z-50 h-14 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="h-9 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-semibold text-neutral-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>

          {/* Selector rápido de formato en la misma barra */}
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="hidden sm:block h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            {LABEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm font-medium text-neutral-600">
            {expandedLabels.length}{" "}
            {expandedLabels.length === 1 ? "etiqueta" : "etiquetas"}
          </span>

          <button
            type="button"
            onClick={handlePrint}
            disabled={expandedLabels.length === 0}
            className="h-9 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </header>

      {/* Lienzo Central de Etiquetas */}
      <main className="print-canvas-wrapper flex-1 py-6 sm:py-8 px-4 flex flex-col items-center gap-8 overflow-x-auto">
        {expandedLabels.length === 0 ? (
          <div className="no-print bg-white rounded-2xl border border-neutral-200 p-10 text-center max-w-md my-auto shadow-xs space-y-3">
            <p className="text-base font-bold text-neutral-900">
              No hay etiquetas generadas para mostrar
            </p>
            <p className="text-xs text-neutral-500">
              Vuelve al módulo de inventario y selecciona los productos y la cantidad de etiquetas que deseas imprimir.
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 h-10 px-5 rounded-xl bg-neutral-900 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Inventario
            </button>
          </div>
        ) : isRoll ? (
          /* Vista de Rollo Térmico (1 etiqueta por sticker físico, ej. 50x25mm) */
          <div className="flex flex-col items-center gap-4">
            {expandedLabels.map((item) => (
              <div
                key={item.instanceKey}
                className="thermal-roll-sticker-page bg-white shadow-md rounded-xs border border-neutral-300/80 overflow-hidden"
                style={{
                  width: `${activePreset.widthMm}mm`,
                  height: `${activePreset.heightMm}mm`,
                }}
              >
                <BarcodeLabelItem
                  name={item.name}
                  code={item.barcode || item.sku || "000000"}
                  sku={item.sku || item.barcode}
                  price={item.salePrice}
                  location={item.location}
                  widthMm={activePreset.widthMm}
                  heightMm={activePreset.heightMm}
                  options={options}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Vista de Hojas A4 / Carta (múltiples etiquetas por página, idéntica a la Imagen 5) */
          sheetPages.map((pageItems, pageIdx) => (
            <div
              key={pageIdx}
              className="label-sheet-page bg-white shadow-md"
              style={{
                width: "210mm",
                minHeight: "297mm",
                paddingTop: `${activePreset.pageMarginTopMm ?? 10}mm`,
                paddingBottom: `${activePreset.pageMarginTopMm ?? 10}mm`,
                paddingLeft: `${activePreset.pageMarginSideMm ?? 6}mm`,
                paddingRight: `${activePreset.pageMarginSideMm ?? 6}mm`,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${activePreset.columns}, ${activePreset.widthMm}mm)`,
                  columnGap: `${activePreset.gapXMm ?? 2}mm`,
                  rowGap: `${activePreset.gapYMm ?? 0}mm`,
                  justifyContent: "center",
                  alignContent: "start",
                }}
              >
                {pageItems.map((item) => (
                  <BarcodeLabelItem
                    key={item.instanceKey}
                    name={item.name}
                    code={item.barcode || item.sku || "000000"}
                    sku={item.sku || item.barcode}
                    price={item.salePrice}
                    location={item.location}
                    widthMm={activePreset.widthMm}
                    heightMm={activePreset.heightMm}
                    options={options}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
