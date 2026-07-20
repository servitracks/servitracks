"use client";

import { useRef, useState, useCallback } from "react";
import { SourceType } from "./ImportWizardModal";
import { ImportRow } from "./StepPreviewEditor";
import { Upload, FileSpreadsheet, FileText, Camera, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { extractProductsWithAI } from "@/lib/import-ai";
import { Supplier } from "@/store/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  "Lubricantes",
  "Filtros",
  "Frenos",
  "Suspensión",
  "Eléctrico",
  "Neumáticos",
  "Transmisión",
  "Otros",
];

const SOURCE_CONFIG = {
  csv: {
    icon: FileSpreadsheet,
    label: "CSV o Excel",
    accept: ".csv,.xlsx,.xls",
    hint: "Arrastra tu archivo aquí o haz clic para seleccionar",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  pdf: {
    icon: FileText,
    label: "PDF",
    accept: ".pdf",
    hint: "Arrastra tu factura o lista de precios en PDF",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  image: {
    icon: Camera,
    label: "Imagen o Foto",
    accept: "image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp",
    hint: "Arrastra la foto del catálogo o factura física",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
};

interface StepUploadProcessProps {
  sourceType: SourceType;
  onParsed: (rows: ImportRow[]) => void;
  suppliers?: Supplier[];
  selectedSupplierId: string;
}

function toImportRow(raw: Record<string, unknown>, index: number): ImportRow {
  return {
    _id: `row-${index}-${Date.now()}`,
    name: String(raw.name ?? raw.Nombre ?? raw.NOMBRE ?? raw.producto ?? raw.Producto ?? ""),
    sku: String(raw.sku ?? raw.SKU ?? raw.Codigo ?? raw.codigo ?? raw.código ?? raw.CODIGO ?? raw["Código"] ?? ""),
    brand: String(raw.brand ?? raw.Marca ?? raw.marca ?? raw.MARCA ?? ""),
    category: CATEGORIES.includes(String(raw.category ?? raw.Categoria ?? raw.categoria ?? raw.Categoría ?? raw["Categoría"] ?? "").trim())
      ? String(raw.category ?? raw.Categoria ?? raw.categoria ?? raw.Categoría ?? raw["Categoría"] ?? "").trim()
      : "Otros",
    supplier: String(raw.supplier ?? raw.Proveedor ?? raw.proveedor ?? raw.PROVEEDOR ?? ""),
    costPrice: Number(raw.costPrice ?? raw["Precio Costo"] ?? raw["precio costo"] ?? raw["Precio de Costo"] ?? raw.costo ?? raw.precio ?? raw.Precio ?? 0) || 0,
    salePrice: Number(raw.salePrice ?? raw["Precio Venta"] ?? raw["precio venta"] ?? raw["Precio de Venta"] ?? 0) || 0,
    quantity: Number(raw.quantity ?? raw.Quantity ?? raw.Cantidad ?? raw.cantidad ?? raw.CANTIDAD ?? raw.qty ?? 0) || 0,
    stock: Number(raw.stock ?? raw.Stock ?? raw.STOCK ?? 0) || 0,
    minStock: Number(raw.minStock ?? raw["Stock Minimo"] ?? raw["Stock Mínimo"] ?? 5) || 5,
    tax: Number(raw.tax ?? raw.Impuesto ?? raw.ITBIS ?? 18) || 18,
    location: String(raw.location ?? raw.Ubicacion ?? raw.Ubicación ?? raw.ubicacion ?? ""),
    _hasError: false,
  };
}

function parseCSVtoRows(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];
        const rows = jsonData.map((row, i) => toImportRow(row, i));
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Strip the "data:...;base64," prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processWithAI(file: File, mimeType: string): Promise<ImportRow[]> {
  const base64 = await fileToBase64(file);
  const products = await extractProductsWithAI(base64, mimeType, file.name);
  return products.map((p, i) => toImportRow(p as unknown as Record<string, unknown>, i));
}

export default function StepUploadProcess({
  sourceType,
  onParsed,
  suppliers = [],
  selectedSupplierId,
}: StepUploadProcessProps) {
  const config = SOURCE_CONFIG[sourceType];
  const Icon = config.icon;
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [aiStage, setAiStage] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setIsProcessing(true);
      try {
        let rows: ImportRow[];
        if (sourceType === "csv") {
          setAiStage("Leyendo hoja de cálculo...");
          rows = await parseCSVtoRows(file);
        } else {
          setAiStage("Enviando documento a la IA...");
          const mimeType =
            sourceType === "pdf" ? "application/pdf" : file.type || "image/jpeg";
          setAiStage("La IA está analizando tu documento...");
          rows = await processWithAI(file, mimeType);
          setAiStage(`¡Listo! ${rows.length} productos encontrados`);
        }

        if (rows.length === 0) {
          setError(
            "No se encontraron productos en el documento. Intenta con otro archivo o formato."
          );
          setIsProcessing(false);
          return;
        }

        const supplierObj = suppliers.find(s => s.id === selectedSupplierId);
        const supplierName = supplierObj ? supplierObj.commercialName : "";
        rows = rows.map(r => ({ ...r, supplier: supplierName }));

        setTimeout(() => onParsed(rows), 300);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error procesando el archivo"
        );
        setIsProcessing(false);
      }
    },
    [sourceType, onParsed]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-4 py-2">
      <div>
        <h2 className="text-base font-bold text-neutral-900">
          Sube tu {config.label}
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          {sourceType === "csv"
            ? "El archivo se procesará localmente en tu dispositivo de forma instantánea."
            : "El archivo se enviará de forma segura a la IA para extraer los productos."}
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { 
          e.preventDefault(); 
          if (!isProcessing) setIsDragging(true); 
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (isProcessing) return;
          fileRef.current?.click();
        }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-[240px] flex flex-col items-center justify-center gap-4 p-8",
          isDragging
            ? cn(config.border, config.bg)
            : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
          isProcessing && "opacity-50"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept={config.accept}
          className="hidden"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", config.bg)}>
              <Loader2 className={cn("h-8 w-8 animate-spin", config.color)} />
            </div>
            <div>
              <p className="font-bold text-neutral-900 text-sm">{aiStage || "Procesando..."}</p>
              {fileName && (
                <p className="text-xs text-neutral-400 mt-1 font-mono truncate max-w-xs">
                  {fileName}
                </p>
              )}
            </div>
            {sourceType !== "csv" && (
              <div className="text-xs text-neutral-400 space-y-1 bg-neutral-50 rounded-xl px-4 py-3 max-w-sm">
                <p className="font-semibold text-neutral-600">🤖 Gemini Vision está:</p>
                <p>• Analizando el contenido del documento</p>
                <p>• Identificando nombres, códigos y precios</p>
                <p>• Estructurando los datos para el inventario</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", config.bg)}>
              <Icon className={cn("h-8 w-8", config.color)} />
            </div>
            <div className="text-center">
              <p className="font-bold text-neutral-900 text-sm">
                {config.hint}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {config.accept}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-12 bg-neutral-200" />
              <span className="text-xs text-neutral-400">o</span>
              <div className="h-px w-12 bg-neutral-200" />
            </div>
            <button
              type="button"
              disabled={isProcessing}
              className={cn(
                "rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors border-2",
                config.border,
                config.bg,
                config.color,
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Seleccionar archivo
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">
              Error al procesar el archivo
            </p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tips */}
      {!isProcessing && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4">
          <p className="text-xs font-semibold text-neutral-600 mb-2">
            💡 Consejos para mejores resultados
          </p>
          {sourceType === "csv" && (
            <ul className="text-xs text-neutral-500 space-y-1">
              <li>• La primera fila debe ser el encabezado (Nombre, Precio, Cantidad...)</li>
              <li>• Los precios deben ser números sin símbolos de moneda</li>
              <li>• Puedes exportar directamente desde Excel o Google Sheets</li>
            </ul>
          )}
          {sourceType === "pdf" && (
            <ul className="text-xs text-neutral-500 space-y-1">
              <li>• Funciona mejor con PDFs de texto (no escaneados)</li>
              <li>• Facturas, cotizaciones y listas de precios de proveedores</li>
              <li>• Máximo recomendado: 10MB</li>
            </ul>
          )}
          {sourceType === "image" && (
            <ul className="text-xs text-neutral-500 space-y-1">
              <li>• Asegúrate de que el texto sea legible y la imagen esté bien iluminada</li>
              <li>• Funciona con fotos de celular, capturas de pantalla y escaneos</li>
              <li>• Cuanto más nítida la imagen, más precisa la extracción</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
