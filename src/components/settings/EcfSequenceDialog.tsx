import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BellRing, ShieldCheck } from "lucide-react";

export function EcfSequenceDialog({ open, onClose, onSave }: { open: boolean, onClose: () => void, onSave: (data: any) => Promise<void> }) {
  const [tipo, setTipo] = useState("E32");
  const [desde, setDesde] = useState(1);
  const [hasta, setHasta] = useState(100);
  const [actual, setActual] = useState(0);
  const [vencimiento, setVencimiento] = useState("");
  const [alerta, setAlerta] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        sequenceType: tipo,
        from: desde,
        to: hasta,
        currentNumber: actual,
        expirationDate: vencimiento,
        alertThreshold: alerta ? 50 : 0
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex bg-white">
          {/* Sidebar azul */}
          <div className="hidden sm:block w-[240px] bg-[#1B2B4D] text-white p-8 shrink-0 relative">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="font-bold mb-3 text-sm leading-tight">Autorización DGII</h3>
            <p className="text-[10px] text-blue-200/80 mb-6 leading-relaxed">
              Configura tus comprobantes fiscales Electrónicos (e-CF) de acuerdo con la resolución aprobada por la DGII.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/40 text-[9px] font-bold">1</div>
                <span className="text-[11px] leading-tight text-blue-100">Prefijo "E" para e-CF</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/40 text-[9px] font-bold">2</div>
                <span className="text-[11px] leading-tight text-blue-100">Establece el rango desde/hasta</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/40 text-[9px] font-bold">3</div>
                <span className="text-[11px] leading-tight text-blue-100">Define alertas de bajo inventario</span>
              </div>
            </div>
            
            <div className="absolute bottom-6 left-6 flex items-center gap-1.5 text-[9px] text-blue-300 font-medium">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Conexión cifrada
            </div>
          </div>
          
          {/* Contenido principal */}
          <div className="flex-1 p-8 space-y-6 relative">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">Nueva Secuencia e-CF</DialogTitle>
              <p className="text-sm text-neutral-500 mt-1">Establece los rangos de comprobantes autorizados.</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-neutral-700">Tipo de Comprobante</Label>
                <Select value={tipo} onValueChange={(val) => val && setTipo(val)}>
                  <SelectTrigger className="h-11 rounded-xl bg-neutral-50/50 border-neutral-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="E31">E31 - CRÉDITO FISCAL</SelectItem>
                    <SelectItem value="E32">E32 - CONSUMIDOR FINAL</SelectItem>
                    <SelectItem value="E33">E33 - NOTA DE DÉBITO</SelectItem>
                    <SelectItem value="E34">E34 - NOTA DE CRÉDITO</SelectItem>
                    <SelectItem value="E44">E44 - REGÍMENES ESPECIALES</SelectItem>
                    <SelectItem value="E45">E45 - GUBERNAMENTAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-neutral-700">Desde</Label>
                  <Input 
                    type="number" 
                    value={desde} 
                    onChange={e => setDesde(Number(e.target.value))}
                    className="h-11 rounded-xl border-neutral-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-bold text-neutral-700">Hasta</Label>
                  <Input 
                    type="number" 
                    value={hasta} 
                    onChange={e => setHasta(Number(e.target.value))}
                    className="h-11 rounded-xl border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-bold text-neutral-700">Valor Actual (Último emitido)</Label>
                <Input 
                  type="number" 
                  value={actual} 
                  onChange={e => setActual(Number(e.target.value))}
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-bold text-neutral-700">Fecha de Vencimiento</Label>
                <Input 
                  type="date" 
                  value={vencimiento} 
                  onChange={e => setVencimiento(e.target.value)}
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 mt-2">
                <BellRing className="h-5 w-5 text-neutral-400 shrink-0" />
                <div className="flex-1">
                  <Label className="text-sm font-bold text-neutral-900 block mb-0.5">Recibir alertas</Label>
                  <p className="text-xs text-neutral-500">Aviso por WhatsApp al quedar {alerta ? 50 : "pocos"}</p>
                </div>
                <Checkbox checked={alerta} onCheckedChange={(c) => setAlerta(!!c)} />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-3 sm:justify-end">
              <Button onClick={onClose} variant="ghost" className="h-11 px-6 rounded-xl text-neutral-600 font-bold hover:bg-neutral-100">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading} className="h-11 px-8 rounded-xl bg-[#1B2B4D] hover:bg-[#121c32] text-white font-bold shadow-sm">
                {loading ? "Creando..." : "Crear Secuencia"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
