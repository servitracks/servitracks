import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BellRing, ShieldCheck, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { fetchEf2PrefixContinuity, type EF2TipoECF } from "@/lib/ecf";
import { toast } from "sonner";

interface EcfSequenceDialogProps {
  open: boolean;
  onClose: () => void;
  token?: string;
  tipos?: EF2TipoECF[];
  onSave: (data: {
    tipo_ecf_id: number;
    prefijo: string;
    desde: number;
    hasta: number;
    secuencia_actual: number;
    fecha_vencimiento?: string;
    alertThreshold?: number;
  }) => Promise<void>;
}

const DEFAULT_TIPOS: EF2TipoECF[] = [
  { id: 1, codigo: "31", nombre: "Factura de Crédito Fiscal", prefijo: "E31" },
  { id: 2, codigo: "32", nombre: "Factura de Consumo Electrónica", prefijo: "E32" },
  { id: 3, codigo: "33", nombre: "Nota de Débito Electrónica", prefijo: "E33" },
  { id: 4, codigo: "34", nombre: "Nota de Crédito Electrónica", prefijo: "E34" },
  { id: 5, codigo: "41", nombre: "Compras Electrónico", prefijo: "E41" },
  { id: 6, codigo: "43", nombre: "Gastos Menores Electrónico", prefijo: "E43" },
  { id: 7, codigo: "44", nombre: "Regímenes Especiales Electrónico", prefijo: "E44" },
  { id: 8, codigo: "45", nombre: "Gubernamental Electrónico", prefijo: "E45" },
  { id: 9, codigo: "46", nombre: "Comprobante de Exportaciones", prefijo: "E46" },
  { id: 10, codigo: "47", nombre: "Pagos al Exterior Electrónico", prefijo: "E47" },
];

export function EcfSequenceDialog({ open, onClose, token, tipos, onSave }: EcfSequenceDialogProps) {
  const activeTipos = tipos && tipos.length > 0 ? tipos : DEFAULT_TIPOS;
  const [prefijo, setPrefijo] = useState("E32");
  const [desde, setDesde] = useState(1);
  const [hasta, setHasta] = useState(100);
  const [actual, setActual] = useState(0);
  const [vencimiento, setVencimiento] = useState("");
  const [alerta, setAlerta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingContinuity, setIsCheckingContinuity] = useState(false);
  const [continuityNotice, setContinuityNotice] = useState<string | null>(null);

  // Al cambiar el prefijo, consultar la continuidad en EF2 para sugerir el número inicial correcto
  useEffect(() => {
    if (!open || !prefijo || !token) return;

    let isSubscribed = true;
    const checkContinuity = async () => {
      setIsCheckingContinuity(true);
      setContinuityNotice(null);
      try {
        const res = await fetchEf2PrefixContinuity(token, prefijo);
        if (isSubscribed && res?.data?.max_hasta !== undefined) {
          const maxHasta = Number(res.data.max_hasta || 0);
          if (maxHasta > 0) {
            const nextDesde = maxHasta + 1;
            setDesde(nextDesde);
            setHasta(nextDesde + 99);
            setActual(maxHasta);
            setContinuityNotice(`Rango anterior terminó en ${maxHasta}. El nuevo rango debe iniciar en ${nextDesde} por regla de continuidad DGII.`);
          } else {
            setDesde(1);
            setHasta(100);
            setActual(0);
            setContinuityNotice("Primer rango para este tipo de comprobante. Inicia en 1.");
          }
        }
      } catch {
        // En caso de que no haya rangos previos
      } finally {
        if (isSubscribed) setIsCheckingContinuity(false);
      }
    };

    checkContinuity();

    return () => {
      isSubscribed = false;
    };
  }, [prefijo, open, token]);

  const handleSave = async () => {
    if (hasta <= desde) {
      toast.error("El número final ('Hasta') debe ser mayor que el número inicial ('Desde')");
      return;
    }
    if (prefijo !== "E32" && !vencimiento) {
      toast.error("La fecha de vencimiento es obligatoria para comprobantes con crédito fiscal");
      return;
    }

    const tipoObj = activeTipos.find((t) => t.prefijo === prefijo);
    const tipoEcfId = Number(tipoObj?.id || 2);

    setLoading(true);
    try {
      await onSave({
        tipo_ecf_id: tipoEcfId,
        prefijo,
        desde: Number(desde),
        hasta: Number(hasta),
        secuencia_actual: Number(actual || 0),
        fecha_vencimiento: prefijo === "E32" ? undefined : vencimiento,
        alertThreshold: alerta ? 50 : 0,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar secuencia en EF2");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex bg-white">
          {/* Sidebar informativo */}
          <div className="hidden sm:block w-[240px] bg-gradient-to-b from-[#001D3D] via-[#003566] to-[#0051A8] text-white p-7 shrink-0 relative">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-7 w-7 text-sky-400" />
            </div>
            <h3 className="font-bold mb-2 text-sm leading-tight">Secuencias EF2 / DGII</h3>
            <p className="text-[10px] text-sky-100/80 mb-5 leading-relaxed">
              Registra los rangos autorizados por la DGII. El sistema EF2 asignará el e-NCF automáticamente al facturar.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-400/30 text-[9px] font-bold text-sky-200">1</div>
                <span className="text-[10.5px] leading-tight text-sky-100">Prefijo "E" con código DGII</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-400/30 text-[9px] font-bold text-sky-200">2</div>
                <span className="text-[10.5px] leading-tight text-sky-100">Continuidad obligatoria (Desde = Último + 1)</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-400/30 text-[9px] font-bold text-sky-200">3</div>
                <span className="text-[10.5px] leading-tight text-sky-100">E32 no requiere vencimiento</span>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 flex items-center gap-1.5 text-[9.5px] text-sky-300 font-medium">
              <Sparkles className="h-3 w-3 text-emerald-400" /> Sincronización Directa EF2
            </div>
          </div>

          {/* Formulario principal */}
          <div className="flex-1 p-7 space-y-5 relative">
            <DialogHeader className="mb-1">
              <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">
                Registrar Secuencia e-NCF en EF2
              </DialogTitle>
              <p className="text-xs text-neutral-500 mt-0.5">
                Crea un nuevo rango autorizado directamente en la plataforma EF2.
              </p>
            </DialogHeader>

            <div className="space-y-3.5">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-neutral-700">Tipo de Comprobante e-CF</Label>
                <Select value={prefijo} onValueChange={(val) => val && setPrefijo(val)}>
                  <SelectTrigger className="h-10 rounded-xl bg-neutral-50/70 border-neutral-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[300]">
                    {activeTipos.map((t) => (
                      <SelectItem key={t.prefijo} value={t.prefijo} className="text-xs font-medium">
                        <span className="font-bold text-[#0051A8]">{t.prefijo}</span> — {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCheckingContinuity && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0078D4]" />
                  <span>Consultando continuidad con EF2...</span>
                </div>
              )}

              {continuityNotice && !isCheckingContinuity && (
                <div className="flex items-start gap-2 text-[11px] text-[#003D7A] bg-[#EBF5FC] p-2.5 rounded-lg border border-[#BDE0FE]">
                  <AlertCircle className="h-3.5 w-3.5 text-[#0078D4] shrink-0 mt-0.5" />
                  <span className="leading-snug">{continuityNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-neutral-700">Desde (Inicio del Rango)</Label>
                  <Input
                    type="number"
                    value={desde}
                    onChange={(e) => setDesde(Number(e.target.value))}
                    className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-neutral-700">Hasta (Fin del Rango)</Label>
                  <Input
                    type="number"
                    value={hasta}
                    onChange={(e) => setHasta(Number(e.target.value))}
                    className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-neutral-700">Secuencia Actual (Último número consumido)</Label>
                <Input
                  type="number"
                  value={actual}
                  onChange={(e) => setActual(Number(e.target.value))}
                  placeholder="0 para rango nuevo sin consumir"
                  className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
                />
                <span className="text-[10px] text-neutral-400">
                  Deja en 0 si es una secuencia nueva. EF2 emitirá la primera factura con el número siguiente ({desde}).
                </span>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-neutral-700">Fecha de Vencimiento</Label>
                  {prefijo === "E32" && (
                    <span className="text-[10px] text-emerald-600 font-bold">Opcional para Consumidor Final</span>
                  )}
                </div>
                <Input
                  type="date"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                  className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <BellRing className="h-4 w-4 text-neutral-400 shrink-0" />
                <div className="flex-1">
                  <Label className="text-xs font-bold text-neutral-900 block mb-0.5">Alerta de secuencias bajas</Label>
                  <p className="text-[10px] text-neutral-500">Notificar al quedar menos de 50 comprobantes disponibles</p>
                </div>
                <Checkbox checked={alerta} onCheckedChange={(c) => setAlerta(!!c)} />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 sm:justify-end">
              <Button
                onClick={onClose}
                variant="ghost"
                className="h-10 px-5 rounded-xl text-neutral-600 font-bold hover:bg-neutral-100 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#0051A8] to-[#0078D4] hover:from-[#003d7e] hover:to-[#005ea6] text-white font-bold shadow-sm text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Registrando en EF2...
                  </>
                ) : (
                  "Registrar en EF2"
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
