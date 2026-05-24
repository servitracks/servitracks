"use client";

import { ImportRow } from "./StepPreviewEditor";
import { Package, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepConfirmProps {
  rows: ImportRow[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Lubricantes: "bg-amber-100 text-amber-700",
  Filtros: "bg-blue-100 text-blue-700",
  Frenos: "bg-red-100 text-red-700",
  "Suspensión": "bg-purple-100 text-purple-700",
  "Eléctrico": "bg-yellow-100 text-yellow-700",
  "Neumáticos": "bg-slate-100 text-slate-700",
  "Transmisión": "bg-orange-100 text-orange-700",
  Otros: "bg-neutral-100 text-neutral-600",
};

export default function StepConfirm({ rows }: StepConfirmProps) {
  const validRows = rows.filter((r) => r.name.trim() !== "");
  const invalidRows = rows.filter((r) => !r.name.trim());
  const totalCostValue = validRows.reduce(
    (acc, r) => acc + r.costPrice * r.stock,
    0
  );
  const totalSaleValue = validRows.reduce(
    (acc, r) => acc + r.salePrice * r.stock,
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
    <div className="space-y-5 py-2">
      <div>
        <h2 className="text-base font-bold text-neutral-900">
          Resumen de importación
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Revisa el resumen antes de confirmar. Una vez importados, los
          productos aparecerán en tu inventario.
        </p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Productos a importar",
            value: validRows.length,
            icon: Package,
            color: "text-neutral-700",
            bg: "bg-neutral-50",
          },
          {
            label: "Valor de costo",
            value: `RD$ ${totalCostValue.toLocaleString("es-DO")}`,
            icon: TrendingUp,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Valor de venta",
            value: `RD$ ${totalSaleValue.toLocaleString("es-DO")}`,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Margen promedio",
            value: `${margin}%`,
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-neutral-100 bg-white p-4 flex flex-col gap-2"
          >
            <div
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center",
                kpi.bg
              )}
            >
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{kpi.label}</p>
              <p className="text-lg font-black text-neutral-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {sortedCategories.length > 0 && (
        <div className="rounded-xl border border-neutral-100 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
            Por categoría
          </p>
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map(([cat, count]) => (
              <div
                key={cat}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  CATEGORY_COLORS[cat] || "bg-neutral-100 text-neutral-600"
                )}
              >
                <span>{cat}</span>
                <span className="bg-white/60 rounded-full px-1.5 py-0.5 font-black text-[10px]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {invalidRows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {invalidRows.length} fila{invalidRows.length > 1 ? "s" : ""} omitida{invalidRows.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Las filas sin nombre de producto no se importarán. Puedes volver
              atrás para completarlas o continuarlas omitiendo.
            </p>
          </div>
        </div>
      )}

      {/* Preview list (first 5) */}
      <div className="rounded-xl border border-neutral-100 overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Vista previa (primeros {Math.min(5, validRows.length)})
          </p>
        </div>
        <div className="divide-y divide-neutral-50">
          {validRows.slice(0, 5).map((row) => (
            <div
              key={row._id}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">
                    {row.name}
                  </p>
                  {row.sku && (
                    <p className="text-xs text-neutral-400 font-mono">
                      {row.sku}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    CATEGORY_COLORS[row.category] ||
                      "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {row.category || "Otros"}
                </span>
                <div className="text-right">
                  <p className="text-xs font-bold text-neutral-900">
                    RD$ {row.salePrice.toLocaleString("es-DO")}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Stock: {row.stock}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {validRows.length > 5 && (
            <div className="px-4 py-2.5 text-center text-xs text-neutral-400">
              y {validRows.length - 5} productos más...
            </div>
          )}
        </div>
      </div>

      {/* Final confirmation message */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Listo para importar {validRows.length} producto{validRows.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Haz clic en &quot;Confirmar e Importar&quot; para agregar todos los productos a
            tu inventario. Esta acción se puede deshacer eliminando los
            productos individualmente.
          </p>
        </div>
      </div>
    </div>
  );
}
