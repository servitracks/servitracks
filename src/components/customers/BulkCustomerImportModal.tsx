"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Upload, FileSpreadsheet, AlertCircle, Loader2, Download, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useStore } from "@/store/useStore";
import type { Customer, Vehicle } from "@/store/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
}

interface ParsedRow {
  nombre: string;
  telefono: string;
  correo: string;
  rnc: string;
  direccion: string;
  marcaVehiculo: string;
  modeloVehiculo: string;
  anoVehiculo: string;
  placaVehiculo: string;
}

export default function BulkCustomerImportModal({ open, onClose, tenantId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { addCustomer, addVehicle } = useStore();

  const handleReset = () => {
    setStep(1);
    setParsedRows([]);
    setError(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Nombre_Completo: "Juan Perez",
        Telefono: "809-555-1234",
        Correo: "juan@ejemplo.com",
        RNC: "101010101",
        Direccion: "Av. Principal #123",
        Marca_Vehiculo: "Toyota",
        Modelo_Vehiculo: "Corolla",
        Ano_Vehiculo: "2018",
        Placa_Vehiculo: "A123456"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "Plantilla_Clientes_ServiTracks.csv", { bookType: "csv" });
  };

  const processFile = (file: File) => {
    setError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Defval empty string prevents undefined
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, string>[];
        
        const mappedRows: ParsedRow[] = jsonData.map(row => ({
          nombre: row.Nombre_Completo || row.Nombre || row.name || "",
          telefono: row.Telefono || row.telefono || row.phone || "",
          correo: row.Correo || row.correo || row.email || "",
          rnc: row.RNC || row.rnc || row.cedula || "",
          direccion: row.Direccion || row.direccion || row.address || "",
          marcaVehiculo: row.Marca_Vehiculo || row.Marca || row.marca || "",
          modeloVehiculo: row.Modelo_Vehiculo || row.Modelo || row.modelo || "",
          anoVehiculo: row.Ano_Vehiculo || row["Año"] || row.año || "",
          placaVehiculo: row.Placa_Vehiculo || row.Placa || row.placa || ""
        }));

        const validRows = mappedRows.filter(r => r.nombre.trim() !== "");

        if (validRows.length === 0) {
          throw new Error("No se encontraron clientes con Nombre en el archivo.");
        }

        setParsedRows(validRows);
        setStep(2);
      } catch (err: any) {
        setError(err.message || "Error procesando el archivo. Verifica el formato.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("No se pudo leer el archivo.");
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const executeImport = () => {
    try {
      let customersCreated = 0;
      let vehiclesCreated = 0;

      parsedRows.forEach(row => {
        // Create Customer
        const customerId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const customer: Customer = {
          id: customerId,
          tenantId,
          name: row.nombre,
          phone: row.telefono,
          email: row.correo || undefined,
          rnc: row.rnc || undefined,
          address: row.direccion || undefined,
          createdAt: new Date().toISOString(),
        };
        addCustomer(customer);
        customersCreated++;

        // Create Vehicle if plate or make/model is present
        if (row.placaVehiculo || row.marcaVehiculo || row.modeloVehiculo) {
          const vehicleId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const vehicle: Vehicle = {
            id: vehicleId,
            tenantId,
            customerId: customerId,
            plate: row.placaVehiculo || "SIN PLACA",
            brand: row.marcaVehiculo || "No especificada",
            model: row.modeloVehiculo || "No especificado",
            year: row.anoVehiculo ? Number(row.anoVehiculo) : new Date().getFullYear(),
          };
          addVehicle(vehicle);
          vehiclesCreated++;
        }
      });

      setStep(3); // Show Success Step
    } catch (err) {
      toast.error("Ocurrió un error al importar. Intenta nuevamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Importación Masiva de Clientes
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <div>
                  <h3 className="font-bold text-blue-900 text-sm">Paso 1: Descargar Plantilla</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Descarga nuestra plantilla en CSV, llénala con los datos de tus clientes y guárdala sin cambiar los nombres de las columnas.
                  </p>
                </div>
                <Button onClick={downloadTemplate} size="sm" className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg whitespace-nowrap">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar CSV
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 text-sm">Paso 2: Subir Archivo (.csv o .xlsx)</h3>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !isProcessing && fileRef.current?.click()}
                  className={cn(
                    "rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 py-12 px-4",
                    isDragging ? "border-emerald-500 bg-emerald-50" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
                    isProcessing && "pointer-events-none opacity-70"
                  )}
                >
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                  
                  {isProcessing ? (
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                      <p className="text-sm font-bold">Procesando archivo...</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">Haz clic para buscar o arrastra tu archivo aquí</p>
                        <p className="text-xs text-neutral-500">Soporta .CSV y .XLSX</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-900 text-sm">Archivo leído correctamente</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Se encontraron <strong>{parsedRows.length}</strong> clientes listos para importar. Revisa la tabla de abajo para confirmar.
                  </p>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 sticky top-0 z-10 border-b border-neutral-200 text-xs text-neutral-500">
                      <tr>
                        <th className="px-4 py-2">Cliente</th>
                        <th className="px-4 py-2">Teléfono</th>
                        <th className="px-4 py-2">Vehículo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-4 py-2">
                            <p className="font-medium text-neutral-900">{row.nombre}</p>
                            {row.correo && <p className="text-[10px] text-neutral-500">{row.correo}</p>}
                          </td>
                          <td className="px-4 py-2 text-neutral-600">{row.telefono || "-"}</td>
                          <td className="px-4 py-2">
                            {row.marcaVehiculo || row.placaVehiculo ? (
                              <div>
                                <p className="text-xs font-medium text-neutral-900">{row.marcaVehiculo} {row.modeloVehiculo}</p>
                                <p className="text-[10px] text-neutral-500">{row.placaVehiculo}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-neutral-400">Sin vehículo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 10 && (
                  <div className="bg-neutral-50 p-2 text-center text-xs text-neutral-500 border-t border-neutral-200">
                    Mostrando 10 de {parsedRows.length} registros...
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 text-center space-y-4">
              <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-neutral-900">¡Importación Exitosa!</h2>
              <p className="text-neutral-500">
                Se han registrado {parsedRows.length} clientes en la base de datos de tu sucursal.
              </p>
              <div className="pt-6">
                <Button onClick={handleClose} className="rounded-xl bg-black text-white hover:bg-neutral-800">
                  Cerrar y Ver Clientes
                </Button>
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <DialogFooter className="px-6 py-4 border-t border-neutral-100 bg-white flex-shrink-0">
            <Button variant="outline" onClick={handleReset} className="rounded-xl">Cancelar</Button>
            <Button onClick={executeImport} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <CheckCircle2 className="h-4 w-4" /> Confirmar e Importar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
