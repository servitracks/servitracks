"use client";

import Barcode from "react-barcode";

const BarcodeComponent = Barcode as any;

export interface LabelPreset {
  id: string;
  label: string;
  type: "sheet" | "roll";
  widthMm: number;
  heightMm: number;
  columns: number;
  rowsPerSheet?: number;
  perSheet?: number;
  gapXMm?: number;
  gapYMm?: number;
  pageMarginTopMm?: number;
  pageMarginSideMm?: number;
}

export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: "roll_50x25",
    label: "Rollo Térmico — 50 × 25 mm (Estándar)",
    type: "roll",
    widthMm: 50,
    heightMm: 25,
    columns: 1,
  },
  {
    id: "roll_50x30",
    label: "Rollo Térmico — 50 × 30 mm",
    type: "roll",
    widthMm: 50,
    heightMm: 30,
    columns: 1,
  },
  {
    id: "roll_40x30",
    label: "Rollo Térmico — 40 × 30 mm",
    type: "roll",
    widthMm: 40,
    heightMm: 30,
    columns: 1,
  },
  {
    id: "roll_60x40",
    label: "Rollo Térmico — 60 × 40 mm (Grande)",
    type: "roll",
    widthMm: 60,
    heightMm: 40,
    columns: 1,
  },
  {
    id: "sheet_24_63x33",
    label: "24 por hoja (A4) — 63.5 × 33.9 mm",
    type: "sheet",
    widthMm: 63.5,
    heightMm: 33.9,
    columns: 3,
    rowsPerSheet: 8,
    perSheet: 24,
    gapXMm: 2.5,
    gapYMm: 0,
    pageMarginTopMm: 12,
    pageMarginSideMm: 7,
  },
  {
    id: "sheet_30_66x25",
    label: "30 por hoja (Carta/A4) — 66.7 × 25.4 mm",
    type: "sheet",
    widthMm: 66.7,
    heightMm: 25.4,
    columns: 3,
    rowsPerSheet: 10,
    perSheet: 30,
    gapXMm: 2,
    gapYMm: 0,
    pageMarginTopMm: 12,
    pageMarginSideMm: 4,
  },
  {
    id: "sheet_40_52x29",
    label: "40 por hoja (A4) — 52.5 × 29.7 mm",
    type: "sheet",
    widthMm: 52.5,
    heightMm: 29.7,
    columns: 4,
    rowsPerSheet: 10,
    perSheet: 40,
    gapXMm: 0,
    gapYMm: 0,
    pageMarginTopMm: 0,
    pageMarginSideMm: 0,
  },
];

export interface BarcodeLabelDisplayOptions {
  showName: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showLocation: boolean;
}

export interface BarcodeLabelItemProps {
  name: string;
  code: string;
  sku?: string;
  price?: number;
  location?: string;
  widthMm?: number;
  heightMm?: number;
  options?: BarcodeLabelDisplayOptions;
  className?: string;
}

export function BarcodeLabelItem({
  name,
  code,
  sku,
  price = 0,
  location,
  widthMm = 50,
  heightMm = 25,
  options = {
    showName: true,
    showSku: true,
    showPrice: true,
    showBarcode: true,
    showLocation: false,
  },
  className = "",
}: BarcodeLabelItemProps) {
  const safeCode = (code || sku || "000000").trim();
  const displaySku = (sku || code || "").trim();
  const isCompactHeight = heightMm <= 26;
  const isCompactWidth = widthMm <= 42;

  // Escala tipográfica inteligente para que nombres largos pasen a la 2da línea y nunca empujen el código fuera de la etiqueta
  const nameLen = (name || "").trim().length;
  const nameFontSizePx = isCompactHeight
    ? nameLen > 38
      ? 7.5
      : nameLen > 22
      ? 8.5
      : 9.5
    : nameLen > 42
    ? 8.5
    : nameLen > 24
    ? 9.5
    : 10.5;

  const barcodeSvgMaxHeightMm = isCompactHeight
    ? nameLen > 22
      ? 6.4
      : 7.4
    : 9.2;

  const priceFontSizePx = isCompactHeight ? 10.5 : 12;

  const formattedPrice = `RD$ ${Number(price || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div
      className={`barcode-label-card ${className}`}
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: isCompactHeight ? "2.4mm" : "3mm",
        paddingBottom: isCompactHeight ? "1.6mm" : "2.2mm",
        paddingLeft: isCompactWidth ? "1.8mm" : "2.5mm",
        paddingRight: isCompactWidth ? "1.8mm" : "2.5mm",
        overflow: "hidden",
        textAlign: "center",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. Nombre del Producto (con margen superior y salto automático a 2da línea si es largo) */}
      {options.showName && (
        <div
          className="label-product-name"
          style={{
            fontSize: `${nameFontSizePx}px`,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#000000",
            width: "100%",
            textAlign: "center",
            whiteSpace: "normal",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: isCompactHeight ? "1mm" : "1.4mm",
            flexShrink: 0,
          }}
        >
          {name}
        </div>
      )}

      {/* 2. Barras del Código de Barras (sin texto interno de SVG para evitar cortes en impresoras térmicas) */}
      {options.showBarcode && (
        <div
          className="label-barcode-bars"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              maxWidth: "94%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            className="[&_svg]:w-auto [&_svg]:max-w-full [&_svg]:block"
          >
            <BarcodeComponent
              value={safeCode}
              width={isCompactWidth ? 1.2 : 1.45}
              height={isCompactHeight ? 26 : 32}
              margin={0}
              displayValue={false}
              background="#ffffff"
              lineColor="#000000"
              style={{
                maxHeight: `${barcodeSvgMaxHeightMm}mm`,
                width: "auto",
                maxWidth: "100%",
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Código / SKU debajo de las barras */}
      {options.showSku && displaySku && (
        <div
          className="label-sku-code"
          style={{
            fontSize: isCompactHeight ? "7.5px" : "8.5px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#111111",
            lineHeight: 1.1,
            marginTop: "0.6mm",
            width: "100%",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            flexShrink: 0,
          }}
        >
          {displaySku}
        </div>
      )}

      {/* 4. Precio del Producto destacado */}
      {options.showPrice && (
        <div
          className="label-product-price"
          style={{
            fontSize: `${priceFontSizePx}px`,
            fontWeight: 900,
            color: "#000000",
            lineHeight: 1.15,
            marginTop: isCompactHeight ? "0.7mm" : "1mm",
            width: "100%",
            textAlign: "center",
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}
        >
          {formattedPrice}
        </div>
      )}

      {/* 5. Ubicación en estante (opcional) */}
      {options.showLocation && location && (
        <div
          className="label-shelf-location"
          style={{
            fontSize: "7px",
            fontWeight: 600,
            color: "#333333",
            lineHeight: 1.1,
            marginTop: "0.4mm",
            width: "100%",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 0,
          }}
        >
          Ubic.: {location}
        </div>
      )}
    </div>
  );
}
