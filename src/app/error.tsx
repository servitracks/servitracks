"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ServiTracks Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Algo salió mal
          </h1>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            Ha ocurrido un error inesperado. Puedes intentar recargar la página
            o volver al inicio.
          </p>
          {error?.digest && (
            <p className="mt-1 text-xs text-neutral-400 font-mono">
              Código: {error.digest}
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
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Ir al Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
