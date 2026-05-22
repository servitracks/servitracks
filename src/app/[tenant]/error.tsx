"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { useParams } from "@/lib/next-compat";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const tenantSlug = params?.tenant as string;

  useEffect(() => {
    console.error("[ServiTracks Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-100 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Error en el módulo
          </h1>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            Ocurrió un error al cargar esta sección. Los demás módulos del
            dashboard siguen funcionando normalmente.
          </p>
          {error?.message && (
            <p className="mt-2 text-xs text-neutral-400 bg-neutral-50 rounded-lg p-2 font-mono break-all">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <a
            href={`/${tenantSlug || ""}`}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Ir al Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
