"use client";

import { useRef, useState, useCallback } from "react";
import { SourceType } from "./ImportWizardModal";
import { ImportRow } from "./StepPreviewEditor";
import { Upload, FileSpreadsheet, FileText, Camera, Loader2, AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { extractProductsWithAI } from "@/lib/import-ai";
import { Supplier } from "@/store/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function downloadInventoryTemplate() {
  const templateHeaders = [
    "Codigo", "Nombre", "Referencia", "Inv. Total", "Costo", "Con_Itbis", "Precio", "Beneficio"
  ];
  const sampleData = [
    ["00-000023", "5W-30 ACEITE GULF CX FORMULA SYNTHETICO", "", 3, 342.63, 404.30, 675.00, 270.69],
    ["00-000025", "FILTRO DE ACEITE HYUNDAI / KIA GENUINE 26300-3505", "2630035505 GA", 27, 252.02, 297.38, 750.00, 452.61],
    ["00-000113", "GENUINE ESCOBILLA SILICONE X1 N.28", "7467180000000", 4, 109.88, 129.65, 250.00, 120.34],
  ];

  const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "Plantilla_Inventario_ServiTracks.xlsx");
}

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

function parseNumber(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/[^0-9.,-]/g, "").trim();
  if (!str) return 0;

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatBarcodeOrRef(val: unknown): string {
  if (!val) return "";
  const s = String(val).trim();
  // Expand scientific notation if Excel formatted long number (e.g. 7.46718E+12)
  if (/^[0-9]+(\.[0-9]+)?e\+[0-9]+$/i.test(s)) {
    try {
      return BigInt(Math.round(Number(s))).toString();
    } catch {
      return s;
    }
  }
  return s;
}

function getVal(raw: Record<string, unknown>, keyAliases: string[], excludeKeywords: string[] = []): unknown {
  const keys = Object.keys(raw);
  const cleanKeyMap = new Map<string, unknown>();
  for (const k of keys) {
    cleanKeyMap.set(k.toLowerCase().replace(/[^a-z0-9]/g, ""), raw[k]);
  }

  // 1. Exact match
  for (const alias of keyAliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanKeyMap.has(cleanAlias)) {
      const val = cleanKeyMap.get(cleanAlias);
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return val;
      }
    }
  }

  // 2. Partial match: check if cleanKey contains alias, respecting exclusions
  for (const alias of keyAliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanAlias.length < 3) continue;

    for (const [k, val] of cleanKeyMap.entries()) {
      if (excludeKeywords.some(ex => k.includes(ex))) {
        continue;
      }
      if (k.includes(cleanAlias)) {
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
  }

  return undefined;
}

function autoDetectCategory(name: string, rawCategory?: string): string {
  if (rawCategory && CATEGORIES.includes(rawCategory.trim())) {
    return rawCategory.trim();
  }
  const upper = name.toUpperCase();
  if (upper.includes("FRENO") || upper.includes("BANDA") || upper.includes("DISCO") || upper.includes("PASTILLA")) return "Frenos";
  if (upper.includes("ACEITE") || upper.includes("LUBRICANTE") || upper.includes("VALVULINA") || upper.includes("GRASA")) return "Lubricantes";
  if (upper.includes("FILTRO")) return "Filtros";
  if (upper.includes("ROTULA") || upper.includes("RÓTULA") || upper.includes("TERMINAL") || upper.includes("SUSPENSION") || upper.includes("SUSPENSIÓN") || upper.includes("AMORTIGUADOR")) return "Suspensión";
  if (upper.includes("NEUMATICO") || upper.includes("NEUMÁTICO") || upper.includes("GOMA") || upper.includes("LLANTA")) return "Neumáticos";
  if (upper.includes("BATERIA") || upper.includes("BATERÍA") || upper.includes("BUJIA") || upper.includes("BUJÍA") || upper.includes("ELECTRICO") || upper.includes("ELÉCTRICO") || upper.includes("FUSIBLE")) return "Eléctrico";
  if (upper.includes("TRANSMISION") || upper.includes("TRANSMISIÓN") || upper.includes("EMBRAGUE") || upper.includes("CLUTCH")) return "Transmisión";
  return "Otros";
}

function autoExtractSku(name: string, explicitSku?: string): string {
  if (explicitSku && explicitSku.trim() !== "") return explicitSku.trim();
  
  // Try to find code patterns like 8615-MD1447-TK or 58101-D7A10-TK-C or 56820-C1000
  const match = name.match(/([A-Z0-9]{3,}(?:-[A-Z0-9]+)+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return "";
}

function toImportRow(raw: Record<string, unknown>, index: number): ImportRow {
  // 1. Nombre
  const nameVal = String(getVal(raw, [
    "name", "nombre", "producto", "descripcion", "descripción", 
    "articulo", "artículo", "item", "detalle"
  ], ["codigo", "cod", "sku", "ref", "referencia", "costo", "precio", "total"]) ?? "").trim();

  // 2. Codigo (SKU / Código interno)
  const explicitCode = String(getVal(raw, [
    "codigo", "código", "cod", "sku", "id"
  ], ["barcode", "barra", "barras", "nombre", "descripcion"]) ?? "").trim();

  // 3. Referencia (OEM / Fabricante / Código de barras)
  const rawRef = getVal(raw, [
    "referencia", "ref", "noparte", "no.parte", "numparte", "parte", "barcode", "codigobarras"
  ]);
  const explicitRef = formatBarcodeOrRef(rawRef);

  let sku = explicitCode;
  if (!sku) {
    sku = autoExtractSku(nameVal, explicitRef);
  }
  if (!sku && explicitRef) {
    sku = explicitRef;
  }

  const barcode = explicitRef || (explicitCode && explicitCode !== sku ? explicitCode : "");

  // 4. Marca
  const brand = String(getVal(raw, [
    "brand", "marca", "fabricante"
  ]) ?? "").trim();

  // 5. Categoría
  const rawCat = String(getVal(raw, [
    "category", "categoria", "categoría", "grupo", "linea", "línea"
  ]) ?? "");
  const category = autoDetectCategory(nameVal, rawCat);

  // 6. Proveedor
  const supplier = String(getVal(raw, [
    "supplier", "proveedor", "distribuidor", "suplidor"
  ]) ?? "").trim();

  // 7. Costo
  const rawCost = getVal(raw, [
    "costo", "costPrice", "costounit", "costounitario", "preciocosto", "costodecosto"
  ], ["itbis", "total"]);
  let costPrice = rawCost !== undefined && rawCost !== null && String(rawCost).trim() !== ""
    ? parseNumber(rawCost)
    : 0;

  const rawConItbis = getVal(raw, [
    "conitbis", "con_itbis", "conitbisunit", "costoconitbis"
  ]);
  const conItbis = parseNumber(rawConItbis);

  if (costPrice === 0 && conItbis > 0) {
    costPrice = Math.round((conItbis / 1.18) * 100) / 100;
  }

  // 8. Precio de Venta
  const rawSale = getVal(raw, [
    "precio", "salePrice", "precioventa", "preciodeventa", "preciounit", "preciounitario", "pvp"
  ], ["costo", "itbis", "total"]);
  let salePrice = rawSale !== undefined && rawSale !== null && String(rawSale).trim() !== ""
    ? parseNumber(rawSale)
    : 0;

  const rawBeneficio = getVal(raw, ["beneficio", "margen", "ganancia", "utilidad"], ["total"]);
  if (salePrice === 0 && rawBeneficio !== undefined) {
    const beneficio = parseNumber(rawBeneficio);
    if (beneficio > 0 && costPrice > 0) {
      salePrice = Math.round((costPrice + beneficio) * 100) / 100;
    }
  }

  // 9. Cantidad / Stock
  const rawQty = getVal(raw, [
    "invtotal", "invtotal.", "inv total", "inventariototal", "cantidad", "quantity", 
    "qty", "stock", "existencia", "existencias", "unidades", "cant"
  ]);
  const quantity = rawQty !== undefined && rawQty !== null && String(rawQty).trim() !== ""
    ? parseNumber(rawQty)
    : 0;

  const rawStock = getVal(raw, ["stock", "existencia"]);
  const stock = rawStock !== undefined && rawStock !== null && String(rawStock).trim() !== ""
    ? parseNumber(rawStock)
    : quantity;

  const minStock = parseNumber(getVal(raw, ["minstock", "stockminimo", "stockmínimo"])) || 5;
  const tax = parseNumber(getVal(raw, ["tax", "impuesto", "itbis", "iva"])) || 18;
  const location = String(getVal(raw, ["location", "ubicacion", "ubicación", "estante", "tramo"]) ?? "").trim();

  return {
    _id: `row-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: nameVal,
    sku: sku,
    barcode: barcode,
    reference: explicitRef,
    brand: brand,
    category: category,
    supplier: supplier,
    costPrice: costPrice,
    salePrice: salePrice,
    quantity: quantity,
    stock: stock,
    minStock: minStock,
    tax: tax,
    location: location,
    _hasError: false,
  };
}

function scoreHeaderRow(row: unknown[]): number {
  if (!Array.isArray(row)) return -1;
  const nonEmptyCells = row.filter(c => c !== undefined && c !== null && String(c).trim() !== "");
  if (nonEmptyCells.length <= 1) return -1; // Single cell is likely a banner or title

  let score = 0;
  const joined = row.map(c => String(c).toLowerCase().replace(/[^a-z0-9]/g, "")).join(" ");

  const hasCode = /codigo|c[oó]digo|sku|cod|ref|referencia/i.test(joined);
  const hasName = /nombre|descripcion|descripci[oó]n|producto|articulo|art[ií]culo|detalle|item/i.test(joined);
  const hasStock = /inv|inventario|cantidad|cant|stock|existencia|qty/i.test(joined);
  const hasCost = /costo|cost/i.test(joined);
  const hasPrice = /precio|price|pvp|venta/i.test(joined);
  const hasTax = /itbis|iva|tax/i.test(joined);
  const hasBenefit = /beneficio|margen|ganancia|utilidad/i.test(joined);

  if (hasName) score += 4;
  if (hasCode) score += 3;
  if (hasStock) score += 3;
  if (hasCost) score += 3;
  if (hasPrice) score += 3;
  if (hasTax) score += 2;
  if (hasBenefit) score += 2;

  return score;
}

function parseWorksheet(worksheet: XLSX.WorkSheet): ImportRow[] {
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false }) as unknown[][];
  if (!rawRows || rawRows.length === 0) return [];

  // Find header row with scoring
  let bestHeaderIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
    const row = rawRows[i];
    const s = scoreHeaderRow(row);
    if (s > bestScore) {
      bestScore = s;
      bestHeaderIndex = i;
    }
  }

  // If score is reasonable (>= 4, meaning at least 2 distinct column keywords matched)
  if (bestScore >= 4) {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: bestHeaderIndex, defval: "", raw: false }) as Record<string, unknown>[];
    const parsed = jsonData
      .map((row, idx) => toImportRow(row, idx))
      .filter((r) => r.name.trim() !== "");

    if (parsed.length > 0) return parsed;
  }

  // Positional fallback if header scoring yielded nothing or 0 products:
  // Layout matching typical format: Col 0: Codigo, Col 1: Nombre, Col 2: Ref, Col 3: Inv. Total, Col 4: Costo, Col 6: Con_Itbis, Col 8: Precio, Col 10: Beneficio
  const dataRows = rawRows.slice(bestScore >= 0 ? bestHeaderIndex + 1 : 0);
  const positionalRows: ImportRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    if (!Array.isArray(r) || r.length < 2) continue;
    const col0 = String(r[0] ?? "").trim();
    const col1 = String(r[1] ?? "").trim();
    if (!col1) continue;

    const col1Lower = col1.toLowerCase();
    if (col1Lower === "nombre" || col1Lower.includes("total general") || col1Lower.includes("subtotal") || col1Lower.includes("reporte de")) continue;

    const explicitCode = col0;
    const name = col1;
    const explicitRef = formatBarcodeOrRef(r[2]);
    const quantity = parseNumber(r[3]);
    let costPrice = parseNumber(r[4]);
    const conItbis = parseNumber(r[6]);
    if (costPrice === 0 && conItbis > 0) costPrice = Math.round((conItbis / 1.18) * 100) / 100;
    let salePrice = parseNumber(r[8]);
    const beneficio = parseNumber(r[10]);
    if (salePrice === 0 && beneficio > 0 && costPrice > 0) salePrice = Math.round((costPrice + beneficio) * 100) / 100;

    let sku = explicitCode;
    if (!sku) sku = autoExtractSku(name, explicitRef);
    if (!sku && explicitRef) sku = explicitRef;

    positionalRows.push({
      _id: `row-pos-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      sku: sku || `SKU-${i + 1}`,
      barcode: explicitRef,
      reference: explicitRef,
      brand: "",
      category: autoDetectCategory(name),
      supplier: "",
      costPrice,
      salePrice,
      quantity,
      stock: quantity,
      minStock: 5,
      tax: 18,
      location: "",
      _hasError: false,
    });
  }

  return positionalRows;
}

function parseCSVtoRows(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        
        let bestRows: ImportRow[] = [];
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;
          const rows = parseWorksheet(worksheet);
          if (rows.length > bestRows.length) {
            bestRows = rows;
          }
        }

        console.log(`[ServiTracks Import] Total de productos reconocidos: ${bestRows.length}`);
        resolve(bestRows);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
        {sourceType === "csv" && !isProcessing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadInventoryTemplate}
            className="text-xs font-bold gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 rounded-xl cursor-pointer shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Descargar Plantilla Excel
          </Button>
        )}
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
