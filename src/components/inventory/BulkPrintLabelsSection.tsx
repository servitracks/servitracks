"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { type Product } from "@/store/useStore";
import {
  LABEL_PRESETS,
  type BarcodeLabelDisplayOptions,
  BarcodeLabelItem,
} from "./BarcodeLabelItem";
import {
  Search,
  Trash2,
  Printer,
  ChevronDown,
  Package,
  Plus,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface BulkLabelQueueItem {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  salePrice: number;
  location?: string;
  quantity: number;
}

export interface BulkLabelsPrintPayload {
  tenantSlug: string;
  tenantName?: string;
  presetId: string;
  options: BarcodeLabelDisplayOptions;
  items: BulkLabelQueueItem[];
  createdAt: string;
}

export const BULK_LABELS_STORAGE_KEY = "servitracks_bulk_labels_payload";

interface BulkPrintLabelsSectionProps {
  products: Product[];
  tenantSlug: string;
  tenantName?: string;
  initialProduct?: { product: Product; qty: number } | null;
  onClearInitialProduct?: () => void;
}

export default function BulkPrintLabelsSection({
  products,
  tenantSlug,
  tenantName,
  initialProduct,
  onClearInitialProduct,
}: BulkPrintLabelsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const [queue, setQueue] = useState<BulkLabelQueueItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(BULK_LABELS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as BulkLabelsPrintPayload;
          if (parsed?.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
            return parsed.items;
          }
        }
      } catch {}
    }
    return [];
  });

  const [presetId, setPresetId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(BULK_LABELS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as BulkLabelsPrintPayload;
          if (parsed?.presetId) return parsed.presetId;
        }
      } catch {}
    }
    return "sheet_24_63x33";
  });

  const [options, setOptions] = useState<BarcodeLabelDisplayOptions>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(BULK_LABELS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as BulkLabelsPrintPayload;
          if (parsed?.options) return parsed.options;
        }
      } catch {}
    }
    return {
      showName: true,
      showSku: true,
      showPrice: true,
      showBarcode: true,
      showLocation: false,
    };
  });

  // Si viene un producto preseleccionado desde el diálogo individual, agregarlo a la cola
  useEffect(() => {
    if (!initialProduct?.product) return;
    const p = initialProduct.product;
    const qty = Math.max(1, initialProduct.qty || 1);
    setQueue((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === p.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + qty,
        };
        return updated;
      }
      return [
        {
          productId: p.id,
          name: p.name,
          sku: p.sku || "",
          barcode: p.barcode || p.sku || "000000",
          salePrice: Number(p.salePrice) || 0,
          location: p.location || "",
          quantity: qty,
        },
        ...prev,
      ];
    });
    if (onClearInitialProduct) onClearInitialProduct();
  }, [initialProduct, onClearInitialProduct]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar productos por nombre, SKU o código de barras
  const matchingProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const eligible = products.filter((p) => !p.isCombo);
    if (!q) return eligible.slice(0, 40);
    return eligible
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [products, searchQuery]);

  const handleAddProduct = (product: Product, defaultQty = 10) => {
    setQueue((prev) => {
      const idx = prev.findIndex((item) => item.productId === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + 1,
        };
        toast.success(`Cantidad incrementada para "${product.name}"`);
        return updated;
      }
      toast.success(`"${product.name}" agregado a la lista de etiquetas`);
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku || "",
          barcode: product.barcode || product.sku || "000000",
          salePrice: Number(product.salePrice) || 0,
          location: product.location || "",
          quantity: defaultQty,
        },
      ];
    });
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleUpdateQty = (productId: string, rawVal: string) => {
    const parsed = parseInt(rawVal, 10);
    const qty = isNaN(parsed) ? 0 : Math.max(0, Math.min(1000, parsed));
    setQueue((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setQueue((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleAddAllInStock = () => {
    const inStock = products.filter((p) => !p.isCombo && Number(p.stock) > 0);
    if (inStock.length === 0) {
      toast.info("No hay productos con stock positivo para agregar.");
      return;
    }
    const existingIds = new Set(queue.map((q) => q.productId));
    const newItems: BulkLabelQueueItem[] = inStock
      .filter((p) => !existingIds.has(p.id))
      .slice(0, 30)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku || "",
        barcode: p.barcode || p.sku || "000000",
        salePrice: Number(p.salePrice) || 0,
        location: p.location || "",
        quantity: Math.max(1, Math.min(50, Number(p.stock) || 1)),
      }));

    if (newItems.length === 0) {
      toast.info("Los productos con stock ya están en la lista.");
      return;
    }
    setQueue((prev) => [...prev, ...newItems]);
    toast.success(`Se agregaron ${newItems.length} productos con su cantidad en stock.`);
  };

  const totalLabels = useMemo(
    () => queue.reduce((acc, item) => acc + Math.max(0, Number(item.quantity) || 0), 0),
    [queue]
  );

  const selectedPreset = useMemo(
    () => LABEL_PRESETS.find((p) => p.id === presetId) || LABEL_PRESETS[0],
    [presetId]
  );

  const toggleOption = (key: keyof BarcodeLabelDisplayOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleGenerateSheet = () => {
    const validItems = queue.filter((item) => item.quantity > 0);
    if (validItems.length === 0 || totalLabels <= 0) {
      toast.error("Agrega al menos un producto con cantidad mayor a 0 para generar las etiquetas.");
      return;
    }

    const payload: BulkLabelsPrintPayload = {
      tenantSlug,
      tenantName,
      presetId,
      options,
      items: validItems,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(BULK_LABELS_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Error guardando configuración de etiquetas:", e);
    }

    const printUrl = `/${tenantSlug}/inventory/print-labels`;
    const newWin = window.open(printUrl, "_blank");
    if (!newWin) {
      window.location.href = printUrl;
    }
  };

  const sampleItem = queue[0] || {
    name: products[0]?.name || "Filtro de Aceite Sintético",
    sku: products[0]?.sku || "SKU-000135",
    barcode: products[0]?.barcode || products[0]?.sku || "00-000135",
    salePrice: products[0]?.salePrice || 450,
    location: products[0]?.location || "Estante A-2",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Encabezado estilo Print labels */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Imprimir etiquetas
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Genera una hoja o rollo imprimible de etiquetas de productos con códigos de barras y precios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddAllInStock}
            className="h-9 px-3.5 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Cargar productos con stock
          </Button>
          {queue.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setQueue([])}
              className="h-9 px-3 rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar lista
            </Button>
          )}
        </div>
      </div>

      {/* Layout de 2 Columnas (Idéntico a las capturas de referencia) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Productos y Cantidades */}
        <div className="lg:col-span-8 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs overflow-visible">
          <div className="p-5 sm:p-6 border-b border-neutral-100">
            <h3 className="text-base font-bold text-neutral-900">Productos</h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Agrega los productos a etiquetar y define cuántas etiquetas imprimir de cada uno.
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Buscador ADD A PRODUCT */}
            <div ref={dropdownContainerRef} className="space-y-2 relative">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                AGREGAR UN PRODUCTO
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar productos por nombre, SKU o código de barras..."
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matchingProducts.length > 0) {
                      e.preventDefault();
                      handleAddProduct(matchingProducts[0], 10);
                    }
                  }}
                  className="h-12 pl-10 pr-10 rounded-xl border-neutral-200 bg-white text-sm font-medium focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((o) => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-1"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Lista desplegable de productos */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-2xl border border-neutral-200 shadow-2xl max-h-72 overflow-y-auto p-1.5 divide-y divide-neutral-100">
                  {matchingProducts.length === 0 ? (
                    <div className="py-8 px-4 text-center text-xs text-neutral-400">
                      No se encontraron productos con &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    matchingProducts.map((prod) => {
                      const alreadyInQueue = queue.some((q) => q.productId === prod.id);
                      const codeLabel = prod.barcode || prod.sku || "S/C";
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProduct(prod, 10)}
                          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-neutral-50 rounded-xl text-left transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-neutral-900 truncate">
                                {prod.name}
                              </span>
                              <span className="text-xs font-mono text-neutral-500 shrink-0">
                                ({codeLabel})
                              </span>
                              {alreadyInQueue && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  En lista
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-3 mt-0.5">
                              <span>
                                Precio:{" "}
                                <strong className="text-neutral-800">
                                  RD${" "}
                                  {Number(prod.salePrice || 0).toLocaleString("es-DO", {
                                    minimumFractionDigits: 2,
                                  })}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>Stock: {prod.stock}</span>
                            </div>
                          </div>
                          <div className="h-8 px-2.5 rounded-lg bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-700 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Lista de productos seleccionados con su cantidad (QTY) */}
            {queue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-4 text-center space-y-2">
                <div className="h-11 w-11 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-neutral-800">
                  Aún no has seleccionado productos para etiquetar
                </p>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Usa el buscador de arriba para buscar artículos por nombre, SKU o código de barras y definir la cantidad de etiquetas a imprimir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => {
                  const codeDisplay = item.barcode || item.sku;
                  return (
                    <div
                      key={item.productId}
                      className="rounded-2xl border border-neutral-200/90 bg-white px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-300 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-neutral-900 break-words leading-snug">
                          {item.name}{" "}
                          {codeDisplay && (
                            <span className="font-bold text-neutral-800">
                              ({codeDisplay})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Precio en etiqueta:{" "}
                          <strong className="text-neutral-800">
                            RD${" "}
                            {Number(item.salePrice || 0).toLocaleString("es-DO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-3 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          CANT.
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(item.productId, e.target.value)}
                          className="w-24 h-11 rounded-xl border-neutral-200 text-center font-bold text-sm text-neutral-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="h-10 w-10 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Quitar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Opciones de hoja / etiqueta */}
        <div className="lg:col-span-4 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h3 className="text-base font-bold text-neutral-900">
              Opciones de etiqueta
            </h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Selector de tamaño de papel / etiqueta */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                TAMAÑO DE PAPEL / ETIQUETA
              </label>
              <select
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
                className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                {LABEL_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Elige una hoja A4/Carta para impresoras láser o de tinta, o el tamaño de tu rollo para impresoras térmicas de etiquetas.
              </p>
            </div>

            {/* Checkboxes: MOSTRAR EN CADA ETIQUETA */}
            <div className="space-y-2.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                MOSTRAR EN CADA ETIQUETA
              </label>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
                {(
                  [
                    { key: "showName", label: "Nombre del producto" },
                    { key: "showSku", label: "SKU / Código" },
                    { key: "showPrice", label: "Precio" },
                    { key: "showBarcode", label: "Código de barras" },
                    { key: "showLocation", label: "Ubicación" },
                  ] as const
                ).map((chk) => {
                  const checked = options[chk.key];
                  return (
                    <button
                      key={chk.key}
                      type="button"
                      onClick={() => toggleOption(chk.key)}
                      className="flex items-center gap-2.5 text-left cursor-pointer group py-0.5"
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          checked
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "border-neutral-300 bg-white group-hover:border-neutral-400"
                        )}
                      >
                        {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-neutral-700">
                        {chk.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vista previa en vivo de 1 etiqueta */}
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                VISTA PREVIA DE LA ETIQUETA ({selectedPreset.widthMm} × {selectedPreset.heightMm} mm)
              </span>
              <div className="bg-neutral-100/80 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-center overflow-hidden">
                <div className="bg-white border border-neutral-300 shadow-xs rounded-xs overflow-hidden">
                  <BarcodeLabelItem
                    name={sampleItem.name}
                    code={sampleItem.barcode || sampleItem.sku || "00-000135"}
                    sku={sampleItem.sku || sampleItem.barcode || "00-000135"}
                    price={sampleItem.salePrice}
                    location={sampleItem.location}
                    widthMm={Math.min(64, selectedPreset.widthMm)}
                    heightMm={Math.min(35, selectedPreset.heightMm)}
                    options={options}
                  />
                </div>
              </div>
            </div>

            {/* Contador total + Botón Generar Hoja */}
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900">
                  {totalLabels} {totalLabels === 1 ? "etiqueta" : "etiquetas"}
                </span>
                <span className="text-xs text-neutral-500">
                  {queue.length} {queue.length === 1 ? "producto" : "productos"}
                </span>
              </div>

              <Button
                type="button"
                onClick={handleGenerateSheet}
                disabled={totalLabels <= 0}
                className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                <span>Generar etiquetas</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </Button>

              <p className="text-xs text-neutral-400 text-center">
                Abre una página lista para imprimir en una pestaña independiente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
