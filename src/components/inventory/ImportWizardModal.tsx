"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StepSourceSelect from "./StepSourceSelect";
import StepUploadProcess from "./StepUploadProcess";
import StepPreviewEditor, { ImportRow } from "./StepPreviewEditor";
import StepConfirm from "./StepConfirm";
import { useStore } from "@/store/useStore";
import SupplierFormDialog from "@/components/proveedores/SupplierFormDialog";
import { cn } from "@/lib/utils";

import { Supplier } from "@/store/types";

export type SourceType = "csv" | "pdf" | "image";
export type ImportMode = "general" | "supplier";

interface ImportWizardModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[], supplierId?: string, invoiceNumber?: string, createPayable?: boolean) => void;
  suppliers: Supplier[];
  tenantId?: string;
}

const STEP_LABELS = [
  "Fuente",
  "Modalidad",
  "Subir archivo",
  "Revisar & Editar",
  "Confirmar",
];

export default function ImportWizardModal({
  open,
  onClose,
  onImport,
  suppliers = [],
  tenantId: tenantIdProp,
}: ImportWizardModalProps) {
  const storeTenant = useStore((s) => s.currentTenant);
  const effectiveTenantId = tenantIdProp || storeTenant?.id || "";
  const addSupplier = useStore((s) => s.addSupplier);

  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType>("csv");
  const [importMode, setImportMode] = useState<ImportMode>("general");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createPayable, setCreatePayable] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);

  const handleReset = () => {
    setStep(1);
    setSourceType("csv");
    setImportMode("general");
    setSelectedSupplierId("");
    setInvoiceNumber("");
    setCreatePayable(true);
    setIsSupplierModalOpen(false);
    setRows([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleConfirmImport = () => {
    const validRows = rows.filter((r) => r.name.trim() !== "");
    const finalSupplierId = importMode === "supplier" ? selectedSupplierId : undefined;
    const finalCreatePayable = importMode === "supplier" && createPayable;
    onImport(validRows, finalSupplierId, invoiceNumber, finalCreatePayable);
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className={cn(
          "rounded-2xl overflow-hidden flex flex-col p-0 transition-all duration-300",
          step === 4 
            ? "sm:max-w-6xl w-[96vw] max-w-[96vw] h-[92vh] max-h-[92vh]" 
            : "sm:max-w-3xl max-h-[92vh]"
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Importar Inventario
            </DialogTitle>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {STEP_LABELS.map((label, i) => {
              const num = i + 1;
              const isActive = num === step;
              const isDone = num < step;
              return (
                <div key={num} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {isDone ? "✓" : num}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        isActive ? "text-neutral-900" : "text-neutral-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`h-px w-6 sm:w-10 transition-colors ${
                        isDone ? "bg-emerald-400" : "bg-neutral-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-b border-neutral-100 mt-4" />
        </DialogHeader>

        {/* Step Content */}
        <div className={cn(
          "flex-1 flex flex-col px-6 py-4 min-h-0",
          step === 4 ? "overflow-hidden" : "overflow-y-auto"
        )}>
          {step === 1 && (
            <StepSourceSelect
              selected={sourceType}
              onSelect={(type) => {
                setSourceType(type);
              }}
            />
          )}
          {step === 2 && (
            <div className="flex-1 flex flex-col p-6 max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 overflow-y-auto">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-black text-neutral-900">¿Cómo deseas registrar esta importación?</h2>
                <p className="text-neutral-500 text-xs sm:text-sm max-w-md mx-auto">
                  Elige si es un catálogo/inventario inicial o una compra a crédito/contado a un proveedor específico.
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode("general")}
                  className={cn(
                    "relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between",
                    importMode === "general"
                      ? "border-neutral-900 bg-neutral-50/70 shadow-sm ring-1 ring-neutral-900"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  {importMode === "general" && (
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  )}
                  <div>
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 text-lg font-bold">
                      📦
                    </div>
                    <h3 className="font-bold text-sm text-neutral-900">Inventario Inicial / Catálogo</h3>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Carga masiva sin generar Cuentas por Pagar. Mantiene el proveedor individual de cada producto si viene en el archivo.
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                    Sin compromisos de pago
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("supplier")}
                  className={cn(
                    "relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between",
                    importMode === "supplier"
                      ? "border-neutral-900 bg-neutral-50/70 shadow-sm ring-1 ring-neutral-900"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  {importMode === "supplier" && (
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  )}
                  <div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 text-lg font-bold">
                      🏢
                    </div>
                    <h3 className="font-bold text-sm text-neutral-900">Compra a Proveedor</h3>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Vincula los productos a un proveedor registrado, con factura opcional y registro en Cuentas por Pagar.
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                    Orden & Factura
                  </span>
                </button>
              </div>

              {/* Supplier Details (only in supplier mode) */}
              {importMode === "supplier" && (
                <div className="space-y-3.5 bg-neutral-50/80 border border-neutral-200 p-4 rounded-2xl animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Proveedor *</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-neutral-300 bg-white shadow-xs font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="" disabled>Selecciona un proveedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.commercialName}</option>
                      ))}
                      {suppliers.length === 0 && (
                        <option value="none" disabled>No tienes proveedores registrados</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">
                      Número de Factura o Recibo (Opcional)
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej: FAC-100234 o NCF..."
                      className="w-full h-11 px-3 rounded-xl border border-neutral-300 bg-white shadow-xs font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="createPayableCheckbox"
                      checked={createPayable}
                      onChange={(e) => setCreatePayable(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                    />
                    <label htmlFor="createPayableCheckbox" className="text-xs font-medium text-neutral-700 cursor-pointer select-none">
                      Generar Orden de Compra y Cuenta por Pagar automáticamente
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 flex items-center pt-1 cursor-pointer"
                  >
                    + Registrar un nuevo proveedor
                  </button>
                </div>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="overflow-y-auto flex-1 h-full pr-2">
              <StepUploadProcess
                sourceType={sourceType}
                suppliers={suppliers}
                selectedSupplierId={importMode === "supplier" ? selectedSupplierId : ""}
                onParsed={(parsedRows) => {
                  setRows(parsedRows);
                  setStep(4);
                }}
              />
            </div>
          )}
          {step === 4 && (
            <StepPreviewEditor rows={rows} setRows={setRows} />
          )}
          {step === 5 && (
            <div className="overflow-y-auto flex-1 h-full pr-2">
              <StepConfirm
                rows={rows}
                importMode={importMode}
                supplierName={suppliers.find(s => s.id === selectedSupplierId)?.commercialName}
                invoiceNumber={invoiceNumber}
                createPayable={importMode === "supplier" && createPayable}
              />
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="border-t border-neutral-100 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) {
                handleClose();
              } else {
                setStep((s) => s - 1);
              }
            }}
            className="rounded-xl cursor-pointer"
            disabled={step === 4 && rows.length > 0} // Si ya cargó filas, deshabilitar mientras procesa
          >
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>

          {step === 1 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800 cursor-pointer"
              onClick={() => setStep(2)}
            >
              Continuar →
            </Button>
          )}
          {step === 2 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800 cursor-pointer"
              onClick={() => setStep(3)}
              disabled={importMode === "supplier" && (!selectedSupplierId || selectedSupplierId === "none")}
            >
              Continuar →
            </Button>
          )}
          {step === 4 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800 cursor-pointer"
              onClick={() => setStep(5)}
              disabled={rows.filter((r) => r.name.trim()).length === 0}
            >
              Revisar Importación →
            </Button>
          )}
          {step === 5 && (
            <Button
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2 cursor-pointer font-bold"
              onClick={handleConfirmImport}
              disabled={rows.filter((r) => r.name.trim()).length === 0}
            >
              ✓ Confirmar e Importar
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Supplier Form Modal */}
      {effectiveTenantId && (
        <SupplierFormDialog
          open={isSupplierModalOpen}
          onOpenChange={setIsSupplierModalOpen}
          tenantId={effectiveTenantId}
          onSuccess={(id) => {
            setSelectedSupplierId(id);
            setIsSupplierModalOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
