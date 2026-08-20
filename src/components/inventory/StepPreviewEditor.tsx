"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Trash2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ImportRow {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  supplier: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  stock: number;
  minStock: number;
  tax: number;
  location: string;
  _hasError: boolean;
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

interface StepPreviewEditorProps {
  rows: ImportRow[];
  setRows: (rows: ImportRow[]) => void;
}

function validateRow(row: ImportRow): boolean {
  return !row.name.trim();
}

export default function StepPreviewEditor({
  rows,
  setRows,
}: StepPreviewEditorProps) {
  const [search, setSearch] = useState("");
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTable = (direction: "left" | "right") => {
    if (tableContainerRef.current) {
      const scrollAmount = direction === "left" ? -350 : 350;
      tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const updateRow = (id: string, field: keyof ImportRow, value: string | number) => {
    setRows(
      rows.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, [field]: value };
        updated._hasError = validateRow(updated);
        return updated;
      })
    );
  };

  const deleteRow = (id: string) => {
    setRows(rows.filter((r) => r._id !== id));
  };

  const filteredRows = rows.filter(
    (r) =>
      search === "" ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase())
  );

  const errorCount = rows.filter((r) => !r.name.trim()).length;
  const validCount = rows.filter((r) => r.name.trim()).length;

  return (
    <div className="space-y-3 flex flex-col h-full flex-1 min-h-0 overflow-hidden">
      {/* Summary & Search bar & Horizontal Scroll Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-black text-neutral-900">
            Revisar y Editar Productos ({rows.length})
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Vista previa editable de tu inventario. Usa las flechas ◀ ▶ o la tecla Tab para desplazarte.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Scroll Navigation Buttons */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-2xs text-neutral-700"
              onClick={() => scrollTable("left")}
              title="Desplazar tabla a la izquierda"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-extrabold uppercase text-neutral-500 px-1">Ver Columnas</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-2xs text-neutral-700"
              onClick={() => scrollTable("right")}
              title="Desplazar tabla a la derecha"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-52 rounded-xl border-neutral-200 text-xs bg-white shadow-2xs"
          />
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
              {validCount} listos
            </span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="text-xs font-bold text-rose-700 whitespace-nowrap">
                {errorCount} sin nombre
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Table Container - Fits exact available height without overflow underneath */}
      <div className="rounded-2xl border border-neutral-200 overflow-hidden flex-1 flex flex-col min-h-0 bg-white shadow-2xs">
        <div 
          ref={tableContainerRef} 
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#a3a3a3 #f5f5f5' }}
          className="overflow-auto flex-1 h-full min-h-0 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-neutral-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100"
        >
          <table className="w-full text-xs min-w-[980px] border-collapse">
            <thead className="bg-neutral-900 text-white sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-neutral-300 w-10 border-r border-neutral-800">
                  #
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[240px] border-r border-neutral-800">
                  Nombre del Producto *
                </th>
                <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-wider text-neutral-300 w-[140px] border-r border-neutral-800">
                  SKU / Código
                </th>
                <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-wider text-neutral-300 w-[110px] border-r border-neutral-800">
                  Marca
                </th>
                <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-wider text-neutral-300 w-[130px] border-r border-neutral-800">
                  Categoría
                </th>
                <th className="px-2 py-3 text-right text-[10px] font-black uppercase tracking-wider text-neutral-300 w-[110px] border-r border-neutral-800">
                  Costo (RD$)
                </th>
                <th className="px-2 py-3 text-right text-[10px] font-black uppercase tracking-wider text-emerald-400 w-[110px] border-r border-neutral-800">
                  Venta (RD$)
                </th>
                <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-neutral-300 w-[85px] border-r border-neutral-800">
                  Cantidad
                </th>
                <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-neutral-300 w-[80px] border-r border-neutral-800">
                  Min. Stock
                </th>
                <th className="px-1 py-3 text-center text-[10px] font-black uppercase tracking-wider text-neutral-400 w-10">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-16 text-neutral-400 text-sm font-medium"
                  >
                    No se encontraron productos coincidentes
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => {
                  const hasNameError = !row.name.trim();
                  return (
                    <tr
                      key={row._id}
                      className={cn(
                        "group transition-colors hover:bg-neutral-50/80",
                        hasNameError ? "bg-rose-50/70" : i % 2 === 0 ? "bg-white" : "bg-neutral-50/30"
                      )}
                    >
                      {/* Index */}
                      <td className="px-1.5 py-2 text-center text-[11px] font-mono text-neutral-400 font-bold border-r border-neutral-100">
                        {i + 1}
                      </td>

                      {/* Name */}
                      <td className="px-2 py-2 border-r border-neutral-100 min-w-[240px]">
                        <div className="relative">
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              updateRow(row._id, "name", e.target.value)
                            }
                            placeholder="Nombre del producto"
                            className={cn(
                              "h-9 text-xs font-medium rounded-xl transition-all border",
                              hasNameError
                                ? "border-rose-300 bg-rose-50 focus:border-rose-500 font-bold text-rose-900"
                                : "border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-white"
                            )}
                          />
                          {hasNameError && (
                            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[140px]">
                        <Input
                          value={row.sku}
                          onChange={(e) =>
                            updateRow(row._id, "sku", e.target.value)
                          }
                          placeholder="SKU / Código"
                          className="h-9 text-xs font-mono font-bold tracking-wide rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-neutral-50/50 uppercase"
                        />
                      </td>

                      {/* Brand */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[110px]">
                        <Input
                          value={row.brand}
                          onChange={(e) =>
                            updateRow(row._id, "brand", e.target.value)
                          }
                          placeholder="Marca"
                          className="h-9 text-xs rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-white"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[130px]">
                        <Select
                          value={row.category || "Otros"}
                          onValueChange={(v) => updateRow(row._id, "category", v ?? "Otros")}
                        >
                          <SelectTrigger className="h-9 text-xs rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs font-medium">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Cost Price */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[110px]">
                        <Input
                          type="number"
                          value={row.costPrice || ""}
                          onChange={(e) =>
                            updateRow(
                              row._id,
                              "costPrice",
                              Number(e.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="h-9 text-xs text-right font-mono font-bold rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-white"
                        />
                      </td>

                      {/* Sale Price */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[110px]">
                        <Input
                          type="number"
                          value={row.salePrice || ""}
                          onChange={(e) =>
                            updateRow(
                              row._id,
                              "salePrice",
                              Number(e.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="h-9 text-xs text-right font-mono font-bold text-emerald-700 rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-emerald-50/30"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[85px]">
                        <Input
                          type="number"
                          value={row.quantity || ""}
                          onChange={(e) =>
                            updateRow(
                              row._id,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          placeholder="0"
                          className="h-9 text-xs text-center font-mono font-black rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-white"
                        />
                      </td>

                      {/* Min Stock */}
                      <td className="px-2 py-2 border-r border-neutral-100 w-[80px]">
                        <Input
                          type="number"
                          value={row.minStock || ""}
                          onChange={(e) =>
                            updateRow(
                              row._id,
                              "minStock",
                              Number(e.target.value)
                            )
                          }
                          placeholder="5"
                          className="h-9 text-xs text-center font-mono rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 bg-neutral-50/50"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-1 py-2 text-center w-10">
                        <button
                          onClick={() => deleteRow(row._id)}
                          className="h-8 w-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-100 transition-all mx-auto"
                          title="Eliminar fila"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1 pt-1 shrink-0">
        <span>Mostrando {filteredRows.length} de {rows.length} productos a importar</span>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => scrollTable("left")} 
            className="hover:text-neutral-900 font-semibold"
          >
            ◀ Izquierda
          </button>
          <span>•</span>
          <button 
            type="button" 
            onClick={() => scrollTable("right")} 
            className="hover:text-neutral-900 font-semibold"
          >
            Derecha ▶
          </button>
        </div>
      </div>
    </div>
  );
}
