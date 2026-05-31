"use client";

import { useState, useEffect } from "react";
import { useStore, Service, Vehicle } from "@/store/useStore";
import { Search, CheckCircle2, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { WorkOrder } from "@/store/types";
import { useSearchParams, useParams } from "@/lib/next-compat";

type KmUnit = "km" | "mi";
type FormData = {
  customerId: string;
  vehicleId: string;
  description: string;
  notes: string;
  currentKm: string;
  kmUnit: KmUnit;
  serviceIds: string[];
  mechanicId: string;
};
const emptyForm: FormData = {
  customerId: "", vehicleId: "", description: "", notes: "", currentKm: "", kmUnit: "km", serviceIds: [], mechanicId: ""
};

interface OrderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderCreateDialog({ open, onOpenChange }: OrderCreateDialogProps) {
  const { tenant } = useParams();
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allCustomers = useStore((s) => s.customers);
  const allVehicles = useStore((s) => s.vehicles);
  const allServices = useStore((s) => s.services);
  const allTechnicians = useStore((s) => s.technicians);

  const customers = tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [];
  const vehicles = tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : [];
  const services = tenantId ? allServices.filter((s) => s.tenantId === tenantId) : [];
  const technicians = tenantId ? allTechnicians.filter((t) => t.tenantId === tenantId) : [];

  const addOrder = useStore((s) => s.addOrder);
  const updateVehicle = useStore((s) => s.updateVehicle);
  const addVehicle = useStore((s) => s.addVehicle);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [isServicePicker, setIsServicePicker] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    brand: "", model: "", plate: "", year: new Date().getFullYear().toString(), color: ""
  });

  const handleQuickAddVehicle = () => {
    if (!newVehicleForm.brand || !newVehicleForm.model || !newVehicleForm.plate) {
      toast.error("Por favor completa los campos obligatorios (*)");
      return;
    }
    const newVId = `v${Date.now()}`;
    const newV: Vehicle = {
      id: newVId,
      customerId: form.customerId,
      tenantId: tenantId,
      brand: newVehicleForm.brand,
      model: newVehicleForm.model,
      year: Number(newVehicleForm.year) || new Date().getFullYear(),
      plate: newVehicleForm.plate.toUpperCase(),
      color: newVehicleForm.color || undefined,
      lastService: new Date().toISOString()
    };
    addVehicle(newV);
    toast.success("Vehículo registrado correctamente");
    setForm(f => ({ ...f, vehicleId: newVId }));
    setIsAddingVehicle(false);
    setNewVehicleForm({ brand: "", model: "", plate: "", year: new Date().getFullYear().toString(), color: "" });
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    if (open) {
      const cId = searchParams.get("customerId");
      const vId = searchParams.get("vehicleId");
      const category = searchParams.get("category");
      if (cId && vId) {
        let initialServiceIds: string[] = [];
        let desc = "";
        
        if (category) {
          const CATEGORY_REVERSE_MAP: Record<string, string> = {
            engine: "Motor",
            brakes: "Frenos",
            tires: "Neumáticos",
            battery: "Sistema Eléctrico",
            suspension: "Suspensión",
            transmission: "Transmisión",
            cooling: "Enfriamiento",
            ac: "Aire Acondicionado",
            steering: "Dirección"
          };
          const rawCat = CATEGORY_REVERSE_MAP[category] || category;
          const service = services.find(s => s.category === rawCat);
          if (service) {
            initialServiceIds = [service.id];
            desc = `Mantenimiento de ${rawCat}`;
          } else {
            desc = `Mantenimiento de ${rawCat}`;
          }
        }
        
        setForm({
          customerId: cId,
          vehicleId: vId,
          description: desc || "Mantenimiento preventivo",
          notes: "Creado automáticamente desde Alerta de Mantenimiento",
          currentKm: "",
          kmUnit: "km",
          serviceIds: initialServiceIds,
          mechanicId: ""
        });
      } else {
        setForm(emptyForm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const availableVehicles = vehicles.filter((v) => v.customerId === form.customerId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId || !form.description) {
      toast.error("Cliente, vehículo y descripción son obligatorios");
      return;
    }
    if (!form.mechanicId || form.mechanicId === "none") {
      toast.error("Debe asignar un técnico a la orden de trabajo");
      return;
    }
    const newOrder: WorkOrder = {
      id: `o${Date.now()}`,
      tenantId: tenantId,
      customerId: form.customerId,
      vehicleId: form.vehicleId,
      mechanicId: form.mechanicId || undefined,
      km: form.currentKm ? Number(form.currentKm) : undefined,
      kmUnit: form.currentKm ? form.kmUnit : undefined,
      status: "pending",
      description: form.description,
      serviceIds: form.serviceIds,
      total: 0,
      notes: form.notes || undefined,
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addOrder(newOrder);
    if (form.currentKm) {
      const kmValue = Number(form.currentKm);
      const kmInKm = form.kmUnit === "mi" ? Math.round(kmValue * 1.60934) : kmValue;
      updateVehicle(form.vehicleId, { km: kmInKm });
    }
    toast.success("Orden de trabajo creada");
    onOpenChange(false);
    setForm(emptyForm);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6 bg-white overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-neutral-900">Nueva Orden de Trabajo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              {/* Cliente */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Cliente *</Label>
                <Select 
                  value={form.customerId || undefined} 
                  onValueChange={(v) => setForm(prev => ({ ...prev, customerId: v || "", vehicleId: "" }))}
                  items={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.phone}` }))}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{`${c.name} — ${c.phone}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehículo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-neutral-600">Vehículo *</Label>
                  {form.customerId && (
                    <button type="button" onClick={() => setIsAddingVehicle(true)}
                      className="text-[10px] font-bold text-neutral-900 hover:underline cursor-pointer">
                      + Registrar Nuevo
                    </button>
                  )}
                </div>
                <Select 
                  value={form.vehicleId || undefined} 
                  onValueChange={(v) => setForm(prev => ({ ...prev, vehicleId: v || "" }))} 
                  disabled={!form.customerId}
                  items={availableVehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} — ${v.plate}` }))}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                    <SelectValue placeholder={form.customerId ? "Seleccionar vehículo" : "Primero selecciona cliente"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {availableVehicles.map((v) => <SelectItem key={v.id} value={v.id}>{`${v.brand} ${v.model} — ${v.plate}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción del Servicio (col-span-2) */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Descripción del Servicio *</Label>
                <button type="button"
                  onClick={() => { setServiceSearch(""); setActiveCategory("Todos"); setIsServicePicker(true); }}
                  className={cn(
                    "w-full h-10 px-3 rounded-xl border text-sm text-left flex items-center justify-between transition-colors",
                    form.serviceIds.length > 0 ? "border-neutral-300 text-neutral-900 bg-white font-medium" : "border-neutral-200 text-neutral-400 bg-white hover:border-neutral-300"
                  )}>
                  <span className="truncate">
                    {form.serviceIds.length > 0
                      ? `${form.serviceIds.length} servicios seleccionados`
                      : "Seleccionar servicios..."}
                  </span>
                  <ChevronDown className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                </button>
                {form.description && (
                  <p className="text-xs text-neutral-500 mt-1 italic line-clamp-1">{form.description}</p>
                )}
              </div>

              {/* Kilometraje Actual */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-neutral-600">Kilometraje Actual</Label>
                  <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
                    {(["km", "mi"] as const).map(u => (
                      <button key={u} type="button" onClick={() => setForm({ ...form, kmUnit: u })}
                        className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
                          form.kmUnit === u ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <Input type="number" placeholder={`Ej: 45000 ${form.kmUnit}`}
                    className="h-10 rounded-xl border-neutral-200 pr-12 text-sm"
                    value={form.currentKm} onChange={(e) => setForm({ ...form, currentKm: e.target.value })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">{form.kmUnit}</span>
                </div>
                {form.currentKm && form.kmUnit === "mi" && (
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    ≈ {Math.round(Number(form.currentKm) * 1.60934).toLocaleString("es-DO")} km
                  </p>
                )}
              </div>

              {/* Técnico Asignado */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Técnico Asignado *</Label>
                <Select 
                  value={form.mechanicId || undefined} 
                  onValueChange={(v) => setForm(prev => ({ ...prev, mechanicId: v === "none" ? "" : (v || "") }))}
                  items={[
                    { value: "none", label: "Sin asignar" },
                    ...technicians.filter(t => t.status === "active").map((t) => ({ value: t.id, label: t.name }))
                  ]}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {technicians.filter((t) => t.status === "active").map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notas Adicionales (col-span-2) */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Notas Adicionales</Label>
                <Input placeholder="Observaciones del cliente o técnico" className="h-10 rounded-xl border-neutral-200"
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-neutral-100 flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-4 font-bold text-neutral-700">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800 h-10 px-5 font-bold">Crear Orden</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service Picker Modal */}
      <Dialog open={isServicePicker} onOpenChange={setIsServicePicker}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-bold mb-3">Seleccionar Tipo de Servicio</DialogTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                placeholder="Buscar servicio..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
          </div>

          {!serviceSearch && (
            <div className="flex gap-1.5 px-6 pt-3 pb-2 overflow-x-auto flex-shrink-0 no-scrollbar">
              {["Todos", ...Array.from(new Set(services.map(s => s.category)))].map(cat => (
                <button key={cat as string} onClick={() => setActiveCategory(cat as string)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                    activeCategory === cat
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                  )}>
                  {cat as string}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-y-auto flex-1 px-6 pb-6 pt-3 space-y-5">
            {Array.from(new Set(services.map(s => s.category)))
              .filter(cat => (activeCategory === "Todos" || cat === activeCategory))
              .map(cat => {
                const catServices = services.filter(s =>
                  s.category === cat &&
                  (!serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                );
                if (catServices.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-neutral-400" />
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{cat}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catServices.map(svc => {
                        const isSelected = form.serviceIds.includes(svc.id);
                        return (
                          <button key={svc.id} type="button"
                            onClick={() => {
                              const newIds = isSelected
                                ? form.serviceIds.filter(id => id !== svc.id)
                                : [...form.serviceIds, svc.id];
                              const newDesc = services
                                .filter(s => newIds.includes(s.id))
                                .map(s => s.name)
                                .join(", ");
                              setForm(prev => ({ ...prev, serviceIds: newIds, description: newDesc }));
                            }}
                            className={cn(
                              "text-left p-3 rounded-xl border-2 transition-all hover:shadow-sm",
                              isSelected
                                ? "border-neutral-950 bg-neutral-50 ring-2 ring-neutral-950 ring-offset-1"
                                : "border-neutral-100 bg-white hover:border-neutral-300"
                            )}>
                            <div className="flex justify-between items-start gap-2">
                              <p className={cn("text-sm font-semibold leading-snug", isSelected ? "text-neutral-950" : "text-neutral-900")}>
                                {svc.name}
                              </p>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-neutral-950 flex-shrink-0" />}
                            </div>
                            {svc.duration && (
                              <p className="text-[10px] text-neutral-400 mt-1 font-medium flex items-center gap-1">
                                ⏱ {svc.duration}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="border-t border-neutral-100 px-6 py-4 bg-neutral-50/50 flex-shrink-0">
            <p className="text-xs text-neutral-500 mb-2">O escribe un servicio personalizado:</p>
            <div className="flex gap-2">
              <input
                placeholder="Ej: Revisión general + diagnóstico..."
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="flex-1 h-9 px-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              />
              <button type="button"
                onClick={() => { if (form.description.trim()) setIsServicePicker(false); }}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors">
                Confirmar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Vehicle Dialog */}
      <Dialog open={isAddingVehicle} onOpenChange={setIsAddingVehicle}>
        <DialogContent className="sm:max-w-md rounded-2xl z-[250] bg-white p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-neutral-900">Registrar Vehículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-600">Marca *</Label>
              <Input placeholder="Ej: Toyota" className="h-10 rounded-xl border-neutral-200"
                value={newVehicleForm.brand} onChange={e => setNewVehicleForm({ ...newVehicleForm, brand: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-600">Modelo *</Label>
              <Input placeholder="Ej: Hilux" className="h-10 rounded-xl border-neutral-200"
                value={newVehicleForm.model} onChange={e => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-600">Placa *</Label>
              <Input placeholder="Ej: G123456" className="h-10 rounded-xl border-neutral-200 font-mono uppercase"
                value={newVehicleForm.plate} onChange={e => setNewVehicleForm({ ...newVehicleForm, plate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Año</Label>
                <Input type="number" placeholder="Ej: 2022" className="h-10 rounded-xl border-neutral-200"
                  value={newVehicleForm.year} onChange={e => setNewVehicleForm({ ...newVehicleForm, year: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Color</Label>
                <Input placeholder="Ej: Blanco" className="h-10 rounded-xl border-neutral-200"
                  value={newVehicleForm.color} onChange={e => setNewVehicleForm({ ...newVehicleForm, color: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t border-neutral-100 flex justify-end">
            <Button variant="outline" className="rounded-xl h-10 px-4 font-bold text-neutral-700" onClick={() => setIsAddingVehicle(false)}>Cancelar</Button>
            <Button className="rounded-xl bg-black text-white hover:bg-neutral-800 h-10 px-5 font-bold" onClick={handleQuickAddVehicle}>Guardar Vehículo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
