"use client";

import { ImportRow } from "./StepPreviewEditor";
import { Package, TrendingUp, CheckCircle2, AlertCircle, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepConfirmProps {
  rows: ImportRow[];
  supplierName?: string;
  invoiceNumber?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Lubricantes: "bg-amber-50 text-amber-700 border-amber-200",
  Filtros: "bg-blue-50 text-blue-700 border-blue-200",
  Frenos: "bg-red-50 text-red-700 border-red-200",
  "Suspensión": "bg-purple-50 text-purple-700 border-purple-200",
  "Eléctrico": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Neumáticos": "bg-slate-100 text-slate-700 border-slate-200",
  "Transmisión": "bg-orange-50 text-orange-700 border-orange-200",
  Otros: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export default function StepConfirm({ rows, supplierName, invoiceNumber }: StepConfirmProps) {
  const validRows = rows.filter((r) => {
    const n = (r.name || "").trim().toUpperCase();
    const s = (r.sku || "").trim();
    return (
      n !== "" &&
      n !== "TOTALES" &&
      n !== "TOTAL" &&
      n !== "SUBTOTAL" &&
      n !== "TOTAL GENERAL" &&
      n !== "RESUMEN" &&
      !((n.startsWith("TOTAL ") || n.startsWith("TOTALES ")) && !s)
    );
  });
  const invalidRows = rows.filter((r) => !r.name.trim());
  const totalUnits = validRows.reduce((acc, r) => acc + (Number(r.stock) || 0), 0);
  const totalCostValue = validRows.reduce(
    (acc, r) => acc + (Number(r.costPrice) || 0) * (Number(r.stock) || 0),
    0
  );
  const totalSaleValue = validRows.reduce(
    (acc, r) => acc + (Number(r.salePrice) || 0) * (Number(r.stock) || 0),
    0
  );

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  validRows.forEach((r) => {
    const cat = r.category || "Otros";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1]
  );

  const margin =
    totalSaleValue > 0
      ? Math.round(
          ((totalSaleValue - totalCostValue) / totalSaleValue) * 100
        )
      : 0;

  return (
    <div className="space-y-4 py-1 flex flex-col h-full min-h-0">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">
              Resumen de Importación
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {validRows.length.toLocaleString("es-DO")} productos validados
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Revisa los totales financieros y la tabla de muestra antes de confirmar la sincronización en base de datos.
          </p>
        </div>

        {supplierName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-800 shrink-0">
            <span className="font-bold">Proveedor:</span>
            <span className="font-semibold">{supplierName}</span>
            {invoiceNumber && (
              <>
                <span className="text-blue-300">•</span>
                <span className="font-mono text-blue-700 font-bold">{invoiceNumber}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main KPI Cards — Modern compact Linear/Stripe styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Total Artículos */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Productos a Importar
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60 flex items-center justify-center shrink-0">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-xl xl:text-2xl font-black tracking-tight text-neutral-900 font-mono whitespace-nowrap">
              {validRows.length.toLocaleString("es-DO")}{" "}
              <span className="text-xs font-normal text-neutral-400 font-sans">ítems</span>
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate font-medium">
              {totalUnits.toLocaleString("es-DO")} unidades físicas de stock
            </p>
          </div>
        </div>

        {/* Valor de Costo */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Valor de Costo
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-neutral-400">RD$</span>
              <span className="text-xl xl:text-2xl font-black tracking-tight text-neutral-900 font-mono whitespace-nowrap">
                {totalCostValue.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate font-medium">
              Costo prom: RD$ {(totalCostValue / (totalUnits || 1)).toLocaleString("es-DO", { maximumFractionDigits: 1 })} / ud
            </p>
          </div>
        </div>

        {/* Valor de Venta */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Valor de Venta
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-neutral-400">RD$</span>
              <span className="text-xl xl:text-2xl font-black tracking-tight text-emerald-600 font-mono whitespace-nowrap">
                {totalSaleValue.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-emerald-700/80 mt-0.5 font-bold truncate">
              Ganancia est: +RD$ {(totalSaleValue - totalCostValue).toLocaleString("es-DO", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Margen Promedio */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Margen Promedio
            </span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-xl xl:text-2xl font-black tracking-tight text-neutral-900 font-mono whitespace-nowrap">
              {margin}%
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate font-medium">
              Rentabilidad bruta sobre venta
            </p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {sortedCategories.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Distribución por Categoría ({sortedCategories.length} categorías detectadas)
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {sortedCategories.map(([cat, count]) => (
              <div
                key={cat}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all",
                  CATEGORY_COLORS[cat] || "bg-neutral-50 border-neutral-200 text-neutral-700"
                )}
              >
                <span>{cat}</span>
                <span className="bg-white/90 rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-2xs text-neutral-800">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview table (Matches Step 4 appearance) */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[170px]">
        <div className="px-4 py-2 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
            Muestra de Productos a Importar (Primeros {Math.min(6, validRows.length)} de {validRows.length})
          </span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            ✓ Datos Listos
          </span>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-neutral-50/50 border-b border-neutral-200/80 text-neutral-600 font-bold">
              <tr>
                <th className="text-left py-2 px-3">Producto</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-center py-2 px-3">Categoría</th>
                <th className="text-right py-2 px-3">Stock</th>
                <th className="text-right py-2 px-3">Costo Unit.</th>
                <th className="text-right py-2 px-3">Precio Venta</th>
                <th className="text-right py-2 px-3">Margen</th>
                <th className="text-right py-2 px-3">Subtotal Venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {validRows.slice(0, 6).map((row) => {
                const cost = Number(row.costPrice) || 0;
                const sale = Number(row.salePrice) || 0;
                const stock = Number(row.stock) || 0;
                const rowMargin = sale > 0 ? Math.round(((sale - cost) / sale) * 100) : 0;
                return (
                  <tr key={row._id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-2 px-3 font-semibold text-neutral-900 truncate max-w-[260px]">
                      {row.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-neutral-500 text-[11px]">
                      {row.sku || "—"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        CATEGORY_COLORS[row.category] || "bg-neutral-50 text-neutral-600 border-neutral-200"
                      )}>
                        {row.category || "Otros"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-neutral-900 font-mono">
                      {stock}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-neutral-600">
                      RD$ {cost.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                      RD$ {sale.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 font-mono">
                      {rowMargin}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                      RD$ {(sale * stock).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {validRows.length > 6 && (
          <div className="px-4 py-1.5 bg-neutral-50 border-t border-neutral-100 text-center text-xs text-neutral-400 font-medium shrink-0">
            ...y {validRows.length - 6} productos más listos para registrarse en la base de datos
          </div>
        )}
      </div>

      {/* Warnings & Alerts */}
      {invalidRows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-center gap-3 shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800">
            <span className="font-bold">{invalidRows.length} fila{invalidRows.length > 1 ? "s" : ""} sin nombre</span> fueron omitidas automáticamente.
          </p>
        </div>
      )}

      {/* Confirmation hint */}
      <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 flex items-center gap-3 shrink-0">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800">
          Presiona <strong>&quot;Confirmar e Importar&quot;</strong> abajo para registrar los {validRows.length.toLocaleString("es-DO")} productos y sus movimientos de entrada de stock en Supabase.
        </p>
      </div>
    </div>
  );
}
