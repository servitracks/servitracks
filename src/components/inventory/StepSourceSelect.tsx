"use client";

import { SourceType } from "./ImportWizardModal";
import { FileSpreadsheet, FileText, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepSourceSelectProps {
  selected: SourceType;
  onSelect: (type: SourceType) => void;
}

const OPTIONS: {
  type: SourceType;
  icon: React.ElementType;
  title: string;
  description: string;
  examples: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  iconColor: string;
}[] = [
  {
    type: "csv",
    icon: FileSpreadsheet,
    title: "CSV / Excel",
    description:
      "Sube un archivo de hoja de cálculo con tus productos. Perfecto si tienes el inventario exportado de otro sistema.",
    examples: ".csv, .xlsx, .xls",
    badge: "Instantáneo",
    badgeColor: "bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-50 to-teal-50",
    iconColor: "text-emerald-600 bg-emerald-100",
  },
  {
    type: "pdf",
    icon: FileText,
    title: "PDF",
    description:
      "Sube una factura, cotización o lista de precios en PDF. La IA leerá y extraerá los productos automáticamente.",
    examples: "Facturas, cotizaciones, catálogos",
    badge: "IA Vision",
    badgeColor: "bg-blue-100 text-blue-700",
    gradient: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600 bg-blue-100",
  },
  {
    type: "image",
    icon: Camera,
    title: "Imagen / Foto",
    description:
      "Fotografía una lista de precios impresa, un catálogo físico o cualquier documento. La IA extrae los datos por ti.",
    examples: ".jpg, .png, .webp, .heic",
    badge: "OCR con IA",
    badgeColor: "bg-purple-100 text-purple-700",
    gradient: "from-purple-50 to-pink-50",
    iconColor: "text-purple-600 bg-purple-100",
  },
];

export default function StepSourceSelect({
  selected,
  onSelect,
}: StepSourceSelectProps) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <h2 className="text-base font-bold text-neutral-900">
          ¿De dónde viene tu inventario?
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Elige el tipo de archivo que deseas importar. Todos los formatos
          terminan en la misma tabla editable antes de confirmar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map(
          ({
            type,
            icon: Icon,
            title,
            description,
            examples,
            badge,
            badgeColor,
            gradient,
            iconColor,
          }) => {
            const isSelected = selected === type;
            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className={cn(
                  "relative text-left rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md",
                  isSelected
                    ? "border-neutral-900 shadow-md ring-2 ring-neutral-900 ring-offset-2"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-neutral-900 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">✓</span>
                  </div>
                )}

                {/* Gradient background */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl opacity-40 bg-gradient-to-br",
                    gradient
                  )}
                />

                <div className="relative space-y-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl flex items-center justify-center",
                      iconColor
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Title + badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-neutral-900">
                      {title}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        badgeColor
                      )}
                    >
                      {badge}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {description}
                  </p>

                  <p className="text-[10px] text-neutral-400 font-mono">
                    {examples}
                  </p>
                </div>
              </button>
            );
          }
        )}
      </div>

      {/* Info callout */}
      <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4 flex gap-3">
        <span className="text-xl">💡</span>
        <div>
          <p className="text-xs font-semibold text-neutral-700">
            Siempre puedes editar antes de importar
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Sin importar el formato, el paso siguiente te mostrará una tabla
            donde podrás revisar, corregir y eliminar filas antes de que
            cualquier dato entre al inventario.
          </p>
        </div>
      </div>
    </div>
  );
}
