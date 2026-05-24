"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Revisar y editar productos
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Haz clic en cualquier celda para editar. Elimina las filas que no
            quieras importar.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">
              {validCount} listos
            </span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-100 px-3 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              <span className="text-xs font-bold text-rose-700">
                {errorCount} sin nombre
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar en la lista..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 rounded-xl border-neutral-200 text-sm"
      />

      {/* Table */}
      <div className="rounded-xl border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-neutral-50 sticky top-0 z-10">
              <tr>
                {[
                  "Nombre del Producto *",
                  "SKU / Código",
                  "Marca",
                  "Categoría",
                  "Precio Costo",
                  "Precio Venta",
                  "Stock",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-neutral-500 border-b border-neutral-100"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-neutral-400 text-sm"
                  >
                    No hay filas que mostrar
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => {
                  const hasNameError = !row.name.trim();
                  return (
                    <tr
                      key={row._id}
                      className={cn(
                        "group transition-colors",
                        hasNameError
                          ? "bg-rose-50/50"
                          : i % 2 === 0
                          ? "bg-white"
                          : "bg-neutral-50/30",
                        "hover:bg-blue-50/30"
                      )}
                    >
                      {/* Name */}
                      <td className="px-2 py-1.5">
                        <div className="relative">
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              updateRow(row._id, "name", e.target.value)
                            }
                            placeholder="Nombre del producto"
                            className={cn(
                              "h-8 rounded-lg text-xs border",
                              hasNameError
                                ? "border-rose-300 bg-rose-50 focus:border-rose-500"
                                : "border-transparent hover:border-neutral-200 focus:border-neutral-400 bg-transparent"
                            )}
                          />
                          {hasNameError && (
                            <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-400" />
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-2 py-1.5">
                        <Input
                          value={row.sku}
                          onChange={(e) =>
                            updateRow(row._id, "sku", e.target.value)
                          }
                          placeholder="SKU"
                          className="h-8 rounded-lg text-xs border border-transparent hover:border-neutral-200 focus:border-neutral-400 bg-transparent font-mono"
                        />
                      </td>

                      {/* Brand */}
                      <td className="px-2 py-1.5">
                        <Input
                          value={row.brand}
                          onChange={(e) =>
                            updateRow(row._id, "brand", e.target.value)
                          }
                          placeholder="Marca"
                          className="h-8 rounded-lg text-xs border border-transparent hover:border-neutral-200 focus:border-neutral-400 bg-transparent"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-2 py-1.5">
                        <Select
                          value={row.category || "Otros"}
                          onValueChange={(v) => updateRow(row._id, "category", v ?? "Otros")}
                        >
                          <SelectTrigger className="h-8 rounded-lg text-xs border border-transparent hover:border-neutral-200 bg-transparent w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Cost Price */}
                      <td className="px-2 py-1.5">
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
                          placeholder="0"
                          className="h-8 rounded-lg text-xs border border-transparent hover:border-neutral-200 focus:border-neutral-400 bg-transparent w-24"
                        />
                      </td>

                      {/* Sale Price */}
                      <td className="px-2 py-1.5">
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
                          placeholder="0"
                          className="h-8 rounded-lg text-xs border border-transparent hover:border-neutral-200 focus:border-neutral-400 bg-transparent w-24"
                        />
                      </td>

                      {/* Stock */}
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={row.stock || ""}
                          onChange={(e) =>
                            updateRow(
                              row._id,
                              "stock",
                              Number(e.target.value)
                            )
                          }
                          placeholder="0"
                          className="h-8 rounded-lg text-xs border border-transparent hover:border-neutral-200 focus:border-neutral-400 bg-transparent w-20"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => deleteRow(row._id)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600 text-neutral-400 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
      <p className="text-xs text-neutral-400 text-center">
        {rows.length} filas en total · Pasa el cursor sobre una fila para ver el botón de eliminar
      </p>
    </div>
  );
}
