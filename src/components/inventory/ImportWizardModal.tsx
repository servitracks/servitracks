"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StepSourceSelect from "./StepSourceSelect";
import StepUploadProcess from "./StepUploadProcess";
import StepPreviewEditor, { ImportRow } from "./StepPreviewEditor";
import StepConfirm from "./StepConfirm";

export type SourceType = "csv" | "pdf" | "image";

interface ImportWizardModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => void;
}

const STEP_LABELS = [
  "Fuente",
  "Subir archivo",
  "Revisar & Editar",
  "Confirmar",
];

export default function ImportWizardModal({
  open,
  onClose,
  onImport,
}: ImportWizardModalProps) {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType>("csv");
  const [rows, setRows] = useState<ImportRow[]>([]);

  const handleReset = () => {
    setStep(1);
    setSourceType("csv");
    setRows([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleConfirmImport = () => {
    const validRows = rows.filter((r) => r.name.trim() !== "");
    onImport(validRows);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Importar Inventario
            </DialogTitle>
            <button
              onClick={handleClose}
              className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <StepSourceSelect
              selected={sourceType}
              onSelect={(type) => {
                setSourceType(type);
              }}
            />
          )}
          {step === 2 && (
            <StepUploadProcess
              sourceType={sourceType}
              onParsed={(parsedRows) => {
                setRows(parsedRows);
                setStep(3);
              }}
            />
          )}
          {step === 3 && (
            <StepPreviewEditor rows={rows} setRows={setRows} />
          )}
          {step === 4 && (
            <StepConfirm rows={rows} />
          )}
        </div>

        {/* Footer Nav */}
        <div className="border-t border-neutral-100 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? handleClose() : setStep((s) => s - 1))}
            className="rounded-xl"
            disabled={step === 2}
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
          {step === 3 && (
            <Button
              className="rounded-xl bg-black text-white hover:bg-neutral-800"
              onClick={() => setStep(4)}
              disabled={rows.filter((r) => r.name.trim()).length === 0}
            >
              Revisar Importación →
            </Button>
          )}
          {step === 4 && (
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
    </Dialog>
  );
}
