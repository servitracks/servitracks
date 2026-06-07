"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Trash2, Edit2, User as UserIcon, Car as CarIcon, UserCog, Save, X, PackageOpen, Plus, Minus } from "lucide-react";
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
  const products = useStore((s) => s.products);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const updateOrder = useStore((s) => s.updateOrder);
  const updateProduct = useStore((s) => s.updateProduct);
  const addMovement = useStore((s) => s.addMovement);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: order.description,
    km: order.km?.toString() || "",
    kmUnit: order.kmUnit || "km",
    notes: order.notes || "",
    mechanicId: order.mechanicId || ""
  });

  const [showPartSelector, setShowPartSelector] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);

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

  const handleAddPart = () => {
    if (!selectedPartId || partQuantity < 1) return;
    const product = products.find(p => p.id === selectedPartId);
    if (!product) return;

    if (product.stock < partQuantity) {
      toast.error(`Stock insuficiente. Solo quedan ${product.stock} unidades de ${product.name}`);
      return;
    }

    // 1. Añadir a la orden
    const currentParts = order.parts || [];
    const existingPartIndex = currentParts.findIndex(p => p.productId === selectedPartId);
    let newParts = [...currentParts];
    if (existingPartIndex >= 0) {
      newParts[existingPartIndex].quantity += partQuantity;
    } else {
      newParts.push({ productId: selectedPartId, quantity: partQuantity });
    }
    
    updateOrder(order.id, { parts: newParts });

    // 2. Descontar inventario
    updateProduct(product.id, { stock: product.stock - partQuantity });

    // 3. Registrar movimiento
    addMovement({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenantId: order.tenantId,
      productId: product.id,
      productName: product.name,
      type: "out",
      quantity: partQuantity,
      reason: `Despacho a Orden #${order.id.slice(-6).toUpperCase()}`,
      date: new Date().toISOString()
    });

    toast.success(`${partQuantity}x ${product.name} despachado(s) a la orden`);
    setShowPartSelector(false);
    setSelectedPartId("");
    setPartQuantity(1);
  };

  const handleRemovePart = (productId: string, quantityToRemove: number) => {
    const product = products.find(p => p.id === productId);
    
    // 1. Quitar de la orden
    const currentParts = order.parts || [];
    const newParts = currentParts.filter(p => p.productId !== productId);
    updateOrder(order.id, { parts: newParts });

    // 2. Reversar inventario si el producto existe
    if (product) {
      updateProduct(product.id, { stock: product.stock + quantityToRemove });
      addMovement({
        id: `mov-rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        tenantId: order.tenantId,
        productId: product.id,
        productName: product.name,
        type: "in",
        quantity: quantityToRemove,
        reason: `Reversión de despacho - Orden #${order.id.slice(-6).toUpperCase()}`,
        date: new Date().toISOString()
      });
    }

    toast.success("Pieza retornada al inventario exitosamente");
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

            {/* SECCIÓN DE ALMACÉN / REPUESTOS */}
            <div className="border border-neutral-100 rounded-xl overflow-hidden mt-4">
              <div className="bg-neutral-50 p-3 border-b border-neutral-100 flex justify-between items-center">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <PackageOpen className="h-3.5 w-3.5" /> Repuestos Despachados
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold rounded-lg"
                  onClick={() => setShowPartSelector(!showPartSelector)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Despachar Pieza
                </Button>
              </div>

              {showPartSelector && (
                <div className="p-3 bg-blue-50/30 border-b border-neutral-100 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-neutral-600">Buscar Pieza en Inventario</Label>
                    <Select value={selectedPartId} onValueChange={(v) => setSelectedPartId(v || "")}>
                      <SelectTrigger className="h-9 rounded-lg bg-white text-xs">
                        {selectedPartId ? products.find(p => p.id === selectedPartId)?.name : "Seleccione una pieza..."}
                      </SelectTrigger>
                      <SelectContent className="max-h-48 z-[200]">
                        {products.filter(p => p.tenantId === order.tenantId && p.stock > 0).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} <span className="text-neutral-400 ml-1">(Stock: {p.stock})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-bold text-neutral-600">Cantidad</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        className="h-9 rounded-lg text-xs" 
                        value={partQuantity} 
                        onChange={(e) => setPartQuantity(Number(e.target.value))} 
                      />
                    </div>
                    <Button 
                      className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4"
                      onClick={handleAddPart}
                      disabled={!selectedPartId}
                    >
                      Añadir
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-0">
                {(!order.parts || order.parts.length === 0) ? (
                  <div className="p-4 text-center text-xs text-neutral-400 italic">
                    No se han despachado piezas para esta orden.
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-50">
                    {order.parts.map((part, idx) => {
                      const p = products.find(prod => prod.id === part.productId);
                      return (
                        <li key={idx} className="flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-neutral-800">{p?.name || "Pieza desconocida"}</p>
                            <p className="text-[10px] text-neutral-500 font-mono">{p?.sku || ""}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black bg-neutral-100 text-neutral-700 px-2 py-1 rounded-md">
                              x{part.quantity}
                            </span>
                            <button 
                              onClick={() => handleRemovePart(part.productId, part.quantity)}
                              className="text-rose-400 hover:text-rose-600 p-1 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                              title="Retornar a inventario"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

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
