import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <FileQuestion className="h-8 w-8 text-amber-600" />
        </div>
        <div>
          <h1 className="text-6xl font-black text-neutral-200">404</h1>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">
            Página no encontrada
          </h2>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            La página que buscas no existe o ha sido movida. Verifica la URL o
            regresa al inicio.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 transition-colors"
          >
            <Home className="h-4 w-4" />
            Ir al Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
