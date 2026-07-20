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

import { Supplier } from "@/store/types";

export type SourceType = "csv" | "pdf" | "image";

interface ImportWizardModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[], supplierId?: string, invoiceNumber?: string) => void;
  suppliers: Supplier[];
}

const STEP_LABELS = [
  "Fuente",
  "Proveedor",
  "Subir archivo",
  "Revisar & Editar",
  "Confirmar",
];

export default function ImportWizardModal({
  open,
  onClose,
  onImport,
  suppliers = [],
}: ImportWizardModalProps) {
  const tenantId = useStore(s => s.currentTenant?.id);
  const addSupplier = useStore(s => s.addSupplier);

  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType>("csv");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);

  const handleReset = () => {
    setStep(1);
    setSourceType("csv");
    setSelectedSupplierId("");
    setInvoiceNumber("");
    setIsSupplierModalOpen(false);
    setRows([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleConfirmImport = () => {
    const validRows = rows.filter((r) => r.name.trim() !== "");
    onImport(validRows, selectedSupplierId, invoiceNumber);
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className="sm:max-w-3xl rounded-2xl max-h-[92vh] overflow-hidden flex flex-col p-0"
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
        <div className="flex-1 overflow-y-auto flex flex-col px-6 py-4">
          {step === 1 && (
            <StepSourceSelect
              selected={sourceType}
              onSelect={(type) => {
                setSourceType(type);
              }}
            />
          )}
          {step === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <h2 className="text-2xl font-black text-neutral-900">¿A qué proveedor le compraste?</h2>
                <p className="text-neutral-500 text-sm max-w-sm mx-auto">Selecciona el proveedor para enlazar esta mercancía, así se registrará automáticamente en tus Cuentas por Pagar.</p>
              </div>
              <div className="w-full max-w-md">
                <div className="space-y-3">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-14 px-4 rounded-xl border border-neutral-200 bg-white shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                  >
                    <option value="" disabled>Selecciona un proveedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.commercialName}</option>
                    ))}
                    {suppliers.length === 0 && (
                      <option value="none" disabled>No tienes proveedores registrados</option>
                    )}
                  </select>
                  {selectedSupplierId && selectedSupplierId !== "none" && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-2 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider ml-1">
                        Número de Factura o Recibo (Opcional)
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Ej: FAC-100234 o NCF..."
                        className="w-full h-12 px-4 rounded-xl border border-neutral-200 bg-white shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 flex items-center justify-center w-full mt-2"
                  >
                    + Agregar un nuevo proveedor
                  </button>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="overflow-y-auto flex-1 h-full pr-2">
              <StepUploadProcess
                sourceType={sourceType}
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
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
              <StepConfirm rows={rows} />
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
            className="rounded-xl"
            disabled={step === 4 && rows.length > 0} // Si ya cargó filas, deshabilitar mientras procesa
          >
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>

          {step === 1 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800"
              onClick={() => setStep(2)}
            >
              Continuar →
            </Button>
          )}
          {step === 2 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800"
              onClick={() => setStep(3)}
              disabled={!selectedSupplierId}
            >
              Continuar →
            </Button>
          )}
          {step === 4 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800"
              onClick={() => setStep(5)}
              disabled={rows.filter((r) => r.name.trim()).length === 0}
            >
              Revisar Importación →
            </Button>
          )}
          {step === 5 && (
            <Button
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2"
              onClick={handleConfirmImport}
              disabled={rows.filter((r) => r.name.trim()).length === 0}
            >
              ✓ Confirmar e Importar
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Supplier Form Modal */}
      {tenantId && (
        <SupplierFormDialog
          open={isSupplierModalOpen}
          onOpenChange={setIsSupplierModalOpen}
          tenantId={tenantId}
          onSuccess={(id) => {
            setSelectedSupplierId(id);
            setIsSupplierModalOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
