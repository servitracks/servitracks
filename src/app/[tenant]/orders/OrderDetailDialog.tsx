"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Trash2, Edit2, User as UserIcon, Car as CarIcon, UserCog, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { WorkOrder } from "@/store/types";
import { cn } from "@/lib/utils";

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkOrder;
}

export default function OrderDetailDialog({ open, onOpenChange, order }: OrderDetailDialogProps) {
  const customers = useStore((s) => s.customers);
  const vehicles = useStore((s) => s.vehicles);
  const technicians = useStore((s) => s.technicians);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const updateOrder = useStore((s) => s.updateOrder);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: order.description,
    km: order.km?.toString() || "",
    kmUnit: order.kmUnit || "km",
    notes: order.notes || "",
    mechanicId: order.mechanicId || ""
  });

  useEffect(() => {
    setEditForm({
      description: order.description,
      km: order.km?.toString() || "",
      kmUnit: order.kmUnit || "km",
      notes: order.notes || "",
      mechanicId: order.mechanicId || ""
    });
    setIsEditing(false);
  }, [order, open]);

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.name || "Desconocido";
  const getVehicleInfo = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.brand} ${v.model} (${v.plate})` : "Desconocido";
  };

  const handleSaveChanges = () => {
    if (!editForm.description) {
      toast.error("La descripción del servicio es obligatoria");
      return;
    }
    updateOrder(order.id, {
      description: editForm.description,
      km: editForm.km ? Number(editForm.km) : undefined,
      kmUnit: editForm.km ? (editForm.kmUnit as "km" | "mi") : undefined,
      notes: editForm.notes || undefined,
      mechanicId: editForm.mechanicId === "none" || !editForm.mechanicId ? undefined : editForm.mechanicId
    });
    toast.success("Orden de trabajo actualizada correctamente");
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-neutral-900">
            {isEditing ? "Editar Orden de Trabajo" : "Registro de Mantenimiento"}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          /* Formulario de Edición */
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-600">Descripción del Servicio *</Label>
              <Input 
                placeholder="Ej: Cambio de aceite..." 
                className="h-10 rounded-xl border-neutral-200 text-sm"
                value={editForm.description} 
                onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-neutral-600">Kilometraje</Label>
                  <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
                    {(["km", "mi"] as const).map(u => (
                      <button 
                        key={u} 
                        type="button" 
                        onClick={() => setEditForm({ ...editForm, kmUnit: u })}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold transition-all",
                          editForm.kmUnit === u ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <Input 
                  type="number" 
                  placeholder={`Ej: 45000`} 
                  className="h-10 rounded-xl border-neutral-200 text-sm"
                  value={editForm.km} 
                  onChange={e => setEditForm({ ...editForm, km: e.target.value })} 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Técnico Asignado</Label>
                <Select 
                  value={editForm.mechanicId || "none"} 
                  onValueChange={(val) => setEditForm({ ...editForm, mechanicId: (val === "none" || !val) ? "" : val })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white text-sm">
                    <span className="truncate">
                      {editForm.mechanicId
                        ? technicians.find((t) => t.id === editForm.mechanicId)?.name ?? "Técnico"
                        : "Sin asignar"}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {technicians.filter((t) => t.status === "active" || t.id === order.mechanicId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-600">Notas Adicionales</Label>
              <Input 
                placeholder="Observaciones del cliente o técnico" 
                className="h-10 rounded-xl border-neutral-200 text-sm"
                value={editForm.notes} 
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })} 
              />
            </div>

            <div className="flex gap-2 pt-4 border-t border-neutral-100 flex justify-end">
              <Button 
                variant="outline" 
                className="rounded-xl h-10 px-4 font-bold text-neutral-700 gap-1.5"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button 
                className="rounded-xl bg-black text-white hover:bg-neutral-800 h-10 px-5 font-bold gap-1.5"
                onClick={handleSaveChanges}
              >
                <Save className="h-4 w-4" /> Guardar Cambios
              </Button>
            </div>
          </div>
        ) : (
          /* Vista de Detalles Estática */
          <div className="space-y-4 py-2">
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Servicio Realizado</p>
              <p className="text-base font-bold text-neutral-900 leading-snug">{order.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-sm font-semibold text-neutral-900 flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5 text-neutral-400" />
                  {getCustomerName(order.customerId)}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Vehículo</p>
                <p className="text-sm font-semibold text-neutral-900 flex items-center gap-1">
                  <CarIcon className="h-3.5 w-3.5 text-neutral-400" />
                  {getVehicleInfo(order.vehicleId)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {new Date(order.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Kilometraje</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {order.km !== undefined
                    ? `${order.km.toLocaleString("es-DO")} ${order.kmUnit || "km"}`
                    : (() => { const v = vehicles.find(v => v.id === order.vehicleId); return v && v.km !== undefined && v.km > 0 ? `${v.km.toLocaleString("es-DO")} km` : "—"; })()}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <UserCog className="h-3.5 w-3.5 text-neutral-400" /> Técnico Asignado
              </p>
              <Select 
                value={order.mechanicId || "none"} 
                onValueChange={(val) => {
                  updateOrder(order.id, { mechanicId: val === "none" || !val ? undefined : val });
                  toast.success("Técnico actualizado con éxito");
                }}
              >
                <SelectTrigger className="h-9 rounded-lg border-neutral-200 bg-white text-xs font-semibold">
                  <span>
                    {order.mechanicId
                      ? technicians.find((t) => t.id === order.mechanicId)?.name ?? "Técnico"
                      : "Sin asignar"}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {technicians.filter((t) => t.status === "active" || t.id === order.mechanicId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {order.notes && (
              <div className="bg-neutral-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Notas</p>
                <p className="text-sm text-neutral-600 italic leading-snug">{order.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-neutral-100">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl text-xs font-bold gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-100"
                onClick={() => { deleteOrder(order.id); toast.success("Registro de mantenimiento eliminado"); onOpenChange(false); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl text-xs font-bold gap-1 text-neutral-700 hover:bg-neutral-50"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3.5 w-3.5 text-neutral-500" /> Editar
              </Button>
              <Button 
                className="flex-1 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
