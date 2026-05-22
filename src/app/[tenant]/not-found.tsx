import { FileQuestion, LayoutDashboard } from "lucide-react";

export default function TenantNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center">
          <FileQuestion className="h-7 w-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-neutral-200">404</h1>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">
            Módulo no encontrado
          </h2>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            Esta sección no existe. Puede que la URL sea incorrecta o que el
            módulo haya sido movido.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
