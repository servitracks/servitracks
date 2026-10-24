"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useStore } from "@/store/useStore";
import { 
  Trash2, Edit2, User as UserIcon, Car as CarIcon, UserCog, Save, X, 
  PackageOpen, Plus, Minus, Shield, FileText, Building2, Search, Check, ChevronsUpDown,
  Wrench, Calendar, Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { WorkOrder } from "@/store/types";
import { cn } from "@/lib/utils";

const LazyInspectionDialog = lazy(() => import("./InspectionDialog"));

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkOrder;
}

export default function OrderDetailDialog({ open, onOpenChange, order }: OrderDetailDialogProps) {
  const allOrders = useStore((s) => s.orders);
  const currentOrder = allOrders.find((o) => o.id === order.id) || order;
  const customers = useStore((s) => s.customers);
  const vehicles = useStore((s) => s.vehicles);
  const technicians = useStore((s) => s.technicians);
  const products = useStore((s) => s.products);
  const services = useStore((s) => s.services);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const updateOrder = useStore((s) => s.updateOrder);
  const updateProduct = useStore((s) => s.updateProduct);
  const addMovement = useStore((s) => s.addMovement);

  const [isEditing, setIsEditing] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);

  const inspections = useStore((s) => s.inspections);
  const existingInspection = inspections.find(
    (i) => i.workOrderId === currentOrder.id && i.tenantId === currentOrder.tenantId
  );
  const [editForm, setEditForm] = useState({
    description: currentOrder.description,
    km: currentOrder.km?.toString() || "",
    kmUnit: currentOrder.kmUnit || "km",
    notes: currentOrder.notes || "",
    mechanicId: currentOrder.mechanicId || "",
    customerType: currentOrder.customerType || "consumidor_final",
    ncfType: currentOrder.ncfType || "E32",
    customerRnc: currentOrder.customerRnc || "",
    customerBusinessName: currentOrder.customerBusinessName || ""
  });

  interface PendingDispatchItem {
    productId: string;
    quantity: number;
  }

  const [showPartSelector, setShowPartSelector] = useState(false);
  const [pendingParts, setPendingParts] = useState<PendingDispatchItem[]>([]);
  const [isPartPopoverOpen, setIsPartPopoverOpen] = useState(false);
  const [partSearch, setPartSearch] = useState("");

  const availableProducts = useMemo(() => {
    return products.filter((p) => p.tenantId === currentOrder.tenantId && p.stock > 0);
  }, [products, currentOrder.tenantId]);

  const filteredAvailableProducts = useMemo(() => {
    if (!partSearch.trim()) return availableProducts;
    const q = partSearch.toLowerCase().trim();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [availableProducts, partSearch]);

  useEffect(() => {
    setEditForm({
      description: currentOrder.description,
      km: currentOrder.km?.toString() || "",
      kmUnit: currentOrder.kmUnit || "km",
      notes: currentOrder.notes || "",
      mechanicId: currentOrder.mechanicId || "",
      customerType: currentOrder.customerType || "consumidor_final",
      ncfType: currentOrder.ncfType || "E32",
      customerRnc: currentOrder.customerRnc || "",
      customerBusinessName: currentOrder.customerBusinessName || ""
    });
    setIsEditing(false);
    setIsInspectionOpen(false);
    setPendingParts([]);
    setIsPartPopoverOpen(false);
    setPartSearch("");
  }, [currentOrder.id, open]);

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.name || "Desconocido";
  const getVehicleInfo = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.brand} ${v.model} (${v.plate})` : "Desconocido";
  };

  // Cálculo financiero unificado de la Orden (Subtotal + ITBIS 18% sobre orden completa + Total)
  const computeOrderFinancials = (partsList = currentOrder.parts || []) => {
    let subtotal = 0;

    // 1. Servicios del catálogo asociados a la orden (precio base neto)
    const orderServiceIds = currentOrder.serviceIds || [];
    orderServiceIds.forEach((sid) => {
      const itemOverride = currentOrder.items?.find((it) => it.serviceId === sid);
      const svc = services.find((s) => s.id === sid);
      const price = itemOverride ? Number(itemOverride.unitPrice || 0) : Number(svc?.price || 0);
      subtotal += price;
    });

    // 2. Servicios personalizados (customServices)
    (currentOrder.customServices || []).forEach((cs) => {
      const price = Number(cs.price || 0);
      subtotal += price;
    });

    // 3. Repuestos despachados de almacén (parts)
    partsList.forEach((part) => {
      const prod = products.find((p) => p.id === part.productId);
      const unitPrice = Number((part as any).price ?? prod?.salePrice ?? 0);
      const qty = Number(part.quantity || 1);
      subtotal += unitPrice * qty;
    });

    // 4. Repuestos externos (customParts)
    (currentOrder.customParts || []).forEach((cp) => {
      const unitPrice = Number(cp.price || 0);
      const qty = Number(cp.quantity || 1);
      subtotal += unitPrice * qty;
    });

    const roundedSubtotal = Math.round(subtotal * 100) / 100;

    // El ITBIS del 18% se aplica sobre la orden completa, no ítem por ítem
    let tax = 0;
    if (currentOrder.applyItbis === false) {
      tax = 0;
    } else if (currentOrder.applyItbis === true) {
      tax = Math.round(roundedSubtotal * 0.18 * 100) / 100;
    } else if (typeof currentOrder.tax === "number" && currentOrder.tax > 0) {
      tax = currentOrder.tax;
    } else if (typeof currentOrder.total === "number" && currentOrder.total > roundedSubtotal) {
      tax = Math.round((currentOrder.total - roundedSubtotal) * 100) / 100;
    } else if (typeof currentOrder.total === "number" && currentOrder.total > 0 && Math.abs(currentOrder.total - roundedSubtotal) < 0.01) {
      tax = 0;
    } else {
      tax = Math.round(roundedSubtotal * 0.18 * 100) / 100;
    }

    const roundedTotal = Math.round((roundedSubtotal + tax) * 100) / 100;

    return {
      subtotal: roundedSubtotal,
      tax,
      total: roundedTotal,
    };
  };

  const orderFinancials = computeOrderFinancials(currentOrder.parts || []);

  const handleSaveChanges = () => {
    if (!editForm.description) {
      toast.error("La descripción del servicio es obligatoria");
      return;
    }
    updateOrder(currentOrder.id, {
      description: editForm.description,
      km: editForm.km ? Number(editForm.km) : undefined,
      kmUnit: editForm.km ? (editForm.kmUnit as "km" | "mi") : undefined,
      notes: editForm.notes || undefined,
      mechanicId: editForm.mechanicId === "none" || !editForm.mechanicId ? undefined : editForm.mechanicId,
      customerType: editForm.customerType as any,
      ncfType: editForm.ncfType,
      customerRnc: editForm.customerRnc || undefined,
      customerBusinessName: editForm.customerBusinessName || undefined
    });
    toast.success("Orden de servicio actualizada correctamente");
    setIsEditing(false);
  };

  const handleSelectProductToDispatch = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) {
      toast.error(`El repuesto ${product.name} no tiene stock disponible.`);
      return;
    }

    setPendingParts((prev) => {
      const idx = prev.findIndex((item) => item.productId === productId);
      if (idx >= 0) {
        if (prev[idx].quantity < product.stock) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
          toast.info(`Cantidad de "${product.name}" aumentada a ${updated[idx].quantity}`);
          return updated;
        } else {
          toast.warning(`Ya tienes la cantidad máxima disponible (${product.stock}) de "${product.name}"`);
          return prev;
        }
      } else {
        toast.success(`"${product.name}" agregado a la lista a despachar`);
        return [...prev, { productId, quantity: 1 }];
      }
    });

    setIsPartPopoverOpen(false);
    setPartSearch("");
  };

  const handleUpdatePendingQuantity = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const clamped = Math.max(1, Math.min(product.stock, quantity));
    setPendingParts((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: clamped } : item))
    );
  };

  const handleRemovePendingPart = (productId: string) => {
    setPendingParts((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleConfirmBatchDispatch = () => {
    if (pendingParts.length === 0) {
      toast.error("Selecciona al menos una pieza para despachar");
      return;
    }

    for (const item of pendingParts) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod || prod.stock < item.quantity) {
        toast.error(`Stock insuficiente para ${prod?.name || "un repuesto"}. Stock actual: ${prod?.stock || 0}`);
        return;
      }
    }

    const currentParts = currentOrder.parts || [];
    let newParts = [...currentParts];

    for (const item of pendingParts) {
      const existingIdx = newParts.findIndex((p) => p.productId === item.productId);
      if (existingIdx >= 0) {
        newParts[existingIdx] = {
          ...newParts[existingIdx],
          quantity: newParts[existingIdx].quantity + item.quantity,
        };
      } else {
        newParts.push({ productId: item.productId, quantity: item.quantity });
      }

      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        updateProduct(prod.id, { stock: prod.stock - item.quantity });

        addMovement({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          tenantId: currentOrder.tenantId,
          productId: prod.id,
          productName: prod.name,
          type: "out",
          quantity: item.quantity,
          reason: `Despacho a Orden #${currentOrder.id.slice(-6).toUpperCase()}`,
          date: new Date().toISOString(),
          customerId: currentOrder.customerId,
          technicianId: currentOrder.mechanicId,
        });
      }
    }

    const nextFinancials = computeOrderFinancials(newParts);
    updateOrder(currentOrder.id, { 
      parts: newParts, 
      subtotal: nextFinancials.subtotal, 
      tax: nextFinancials.tax, 
      total: nextFinancials.total 
    });

    const totalUnits = pendingParts.reduce((acc, p) => acc + p.quantity, 0);
    toast.success(`Se despacharon ${pendingParts.length} repuestos (${totalUnits} unidades) a la orden`);

    setPendingParts([]);
    setShowPartSelector(false);
    setIsPartPopoverOpen(false);
    setPartSearch("");
  };

  const handleIncreasePart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock < 1) {
      toast.error("No hay más unidades en stock disponibles en almacén");
      return;
    }

    // Descontar 1 del inventario
    updateProduct(product.id, { stock: product.stock - 1 });

    // Registrar movimiento
    addMovement({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenantId: currentOrder.tenantId,
      productId: product.id,
      productName: product.name,
      type: "out",
      quantity: 1,
      reason: `Despacho adicional (+1) a Orden #${currentOrder.id.slice(-6).toUpperCase()}`,
      date: new Date().toISOString(),
      customerId: currentOrder.customerId,
      technicianId: currentOrder.mechanicId,
    });

    // Actualizar orden
    const currentParts = currentOrder.parts || [];
    const newParts = currentParts.map(p => 
      p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p
    );
    const nextFinancials = computeOrderFinancials(newParts);
    updateOrder(currentOrder.id, { 
      parts: newParts, 
      subtotal: nextFinancials.subtotal, 
      tax: nextFinancials.tax, 
      total: nextFinancials.total 
    });
    toast.success(`+1 ${product.name} agregado`);
  };

  const handleDecreasePart = (productId: string) => {
    const currentParts = currentOrder.parts || [];
    const part = currentParts.find(p => p.productId === productId);
    if (!part) return;

    if (part.quantity > 1) {
      // Retornar 1 al inventario
      const product = products.find(p => p.id === productId);
      if (product) {
        updateProduct(product.id, { stock: product.stock + 1 });
      }

      // Registrar movimiento
      addMovement({
        id: `mov-rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        tenantId: currentOrder.tenantId,
        productId: productId,
        productName: product?.name || "Pieza",
        type: "in",
        quantity: 1,
        reason: `Devolución de 1 unidad - Orden #${currentOrder.id.slice(-6).toUpperCase()}`,
        date: new Date().toISOString(),
        customerId: currentOrder.customerId,
        technicianId: currentOrder.mechanicId,
      });

      // Actualizar orden
      const newParts = currentParts.map(p => 
        p.productId === productId ? { ...p, quantity: p.quantity - 1 } : p
      );
      const nextFinancials = computeOrderFinancials(newParts);
      updateOrder(currentOrder.id, { parts: newParts, total: nextFinancials.total });
      toast.success(`1 unidad retornada al almacén (quedan ${part.quantity - 1})`);
    } else {
      // Si la cantidad es 1, eliminarla completamente
      handleRemovePart(productId, 1);
    }
  };

  const handleRemovePart = (productId: string, quantityToRemove: number) => {
    const product = products.find(p => p.id === productId);
    
    // 1. Quitar de la orden
    const currentParts = currentOrder.parts || [];
    const newParts = currentParts.filter(p => p.productId !== productId);
    const nextFinancials = computeOrderFinancials(newParts);
    updateOrder(currentOrder.id, { 
      parts: newParts, 
      subtotal: nextFinancials.subtotal, 
      tax: nextFinancials.tax, 
      total: nextFinancials.total 
    });

    // 2. Reversar inventario si el producto existe
    if (product) {
      updateProduct(product.id, { stock: product.stock + quantityToRemove });
      addMovement({
        id: `mov-rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        tenantId: currentOrder.tenantId,
        productId: product.id,
        productName: product.name,
        type: "in",
        quantity: quantityToRemove,
        reason: `Reversión de despacho (${quantityToRemove}x) - Orden #${currentOrder.id.slice(-6).toUpperCase()}`,
        date: new Date().toISOString(),
        customerId: currentOrder.customerId,
        technicianId: currentOrder.mechanicId,
      });
    }

    toast.success("Pieza retornada al inventario exitosamente");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] rounded-3xl p-0 overflow-hidden bg-white border border-neutral-200/90 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header Ejecutivo */}
        <div className="flex-shrink-0 border-b border-neutral-100 bg-neutral-50/70 p-5 sm:p-6 pr-14 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs ring-4 ring-neutral-100 shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-neutral-900 tracking-tight">
                  {isEditing ? "Editar Orden de Servicio" : "Registro de Mantenimiento"}
                </DialogTitle>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-neutral-200/70 text-neutral-800">
                  #{currentOrder.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-normal mt-0.5 flex items-center gap-2">
                <span>{new Date(currentOrder.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="text-neutral-300">•</span>
                <span className="font-medium text-neutral-700">{getCustomerName(currentOrder.customerId)}</span>
              </p>
            </div>
          </div>

          {existingInspection && (
            <div className="hidden sm:flex items-center">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs",
                existingInspection.status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                <Shield className="h-3.5 w-3.5" />
                <span>{existingInspection.status === "completed" ? "Inspección Aprobada" : "Inspección Borrador"}</span>
              </span>
            </div>
          )}
        </div>

        {isEditing ? (
          /* Formulario de Edición Compacto & Equilibrado */
          <>
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 custom-scrollbar">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-700">Descripción del Servicio *</Label>
                <Input 
                  placeholder="Ej: Cambio de aceite y filtros..." 
                  className="h-10 rounded-xl border-neutral-200 text-sm shadow-2xs"
                  value={editForm.description} 
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-neutral-700">Kilometraje</Label>
                    <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200/80">
                      {(["km", "mi"] as const).map(u => (
                        <button 
                          key={u} 
                          type="button" 
                          onClick={() => setEditForm({ ...editForm, kmUnit: u })}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
                            editForm.kmUnit === u ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input 
                    type="number" 
                    placeholder="Ej: 45000" 
                    className="h-10 rounded-xl border-neutral-200 text-sm font-mono shadow-2xs"
                    value={editForm.km} 
                    onChange={e => setEditForm({ ...editForm, km: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-neutral-700">Técnico Asignado</Label>
                  <Select 
                    value={editForm.mechanicId || "none"} 
                    onValueChange={(val) => setEditForm({ ...editForm, mechanicId: (val === "none" || !val) ? "" : val })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white text-xs font-semibold shadow-2xs">
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
                <Label className="text-xs font-bold text-neutral-700">Notas Adicionales</Label>
                <Input 
                  placeholder="Observaciones del cliente o técnico..." 
                  className="h-10 rounded-xl border-neutral-200 text-sm shadow-2xs"
                  value={editForm.notes} 
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })} 
                />
              </div>

              {/* Tipo de Cliente / Comprobante e-CF */}
              <div className="space-y-2.5 p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/80">
                <Label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Tipo de Cliente / Comprobante Fiscal
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "consumidor_final", label: "Consumidor Final", sub: "E32 / B02" },
                    { id: "credito_fiscal", label: "Crédito Fiscal", sub: "E31 / B01" },
                    { id: "gubernamental", label: "Gubernamental", sub: "E45 / B15" },
                    { id: "regimen_especial", label: "Rég. Especial", sub: "E44 / B14" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const ncfMap: Record<string, string> = {
                          consumidor_final: "E32",
                          credito_fiscal: "E31",
                          gubernamental: "E45",
                          regimen_especial: "E44",
                        };
                        setEditForm({
                          ...editForm,
                          customerType: t.id as any,
                          ncfType: ncfMap[t.id] || "E32",
                        });
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all",
                        editForm.customerType === t.id
                          ? "bg-white border-blue-600 shadow-2xs ring-1 ring-blue-600"
                          : "bg-white/60 border-neutral-200 hover:bg-white text-neutral-600"
                      )}
                    >
                      <p className="text-xs font-bold text-neutral-900">{t.label}</p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{t.sub}</p>
                    </button>
                  ))}
                </div>

                {editForm.customerType !== "consumidor_final" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-neutral-200/60 mt-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-neutral-600">RNC / Cédula</Label>
                      <Input
                        placeholder="Ej: 132596161"
                        className="h-9 rounded-xl border-neutral-200 text-xs font-mono bg-white"
                        value={editForm.customerRnc}
                        onChange={(e) => setEditForm({ ...editForm, customerRnc: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-neutral-600">Razón Social</Label>
                      <Input
                        placeholder="Nombre comercial o empresa"
                        className="h-9 rounded-xl border-neutral-200 text-xs bg-white"
                        value={editForm.customerBusinessName}
                        onChange={(e) => setEditForm({ ...editForm, customerBusinessName: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer de Edición */}
            <div className="flex-shrink-0 border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 flex items-center justify-end gap-3 rounded-b-3xl">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 h-10 px-5 font-bold text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              <Button 
                onClick={handleSaveChanges}
                className="rounded-xl bg-black hover:bg-neutral-900 text-white h-10 px-6 font-bold text-xs sm:text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Guardar Cambios
              </Button>
            </div>
          </>
        ) : (
          /* Vista de Detalles Ejecutiva & Estéticamente Compacta */
          <>
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 custom-scrollbar">
              {/* Servicio Realizado Hero Card */}
              <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Servicio Realizado
                  </span>
                  <p className="text-base font-bold text-neutral-900 leading-snug">
                    {order.description}
                  </p>
                </div>

                {/* Fiscal info pill */}
                {(order.customerType || order.ncfType || order.customerRnc) && (
                  <div className="shrink-0 flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200/80 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
                    <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="font-semibold">
                      {order.customerType === "credito_fiscal" || order.ncfType === "E31"
                        ? "Crédito Fiscal (E31)"
                        : order.customerType === "gubernamental" || order.ncfType === "E45"
                        ? "Gubernamental (E45)"
                        : order.customerType === "regimen_especial" || order.ncfType === "E44"
                        ? "Rég. Especial (E44)"
                        : "Consumidor Final (E32)"}
                    </span>
                    {order.customerRnc && (
                      <span className="font-mono text-[10px] text-blue-700 bg-white/90 px-1.5 py-0.5 rounded border border-blue-200 font-bold ml-1">
                        RNC: {order.customerRnc}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Grid 2 Columnas de Información Equilibrada */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Columna 1: Cliente y Vehículo */}
                <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/70 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200/60">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-neutral-400" /> Cliente
                    </span>
                    <span className="text-xs font-bold text-neutral-900 text-right">
                      {getCustomerName(order.customerId)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200/60">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CarIcon className="h-3.5 w-3.5 text-neutral-400" /> Vehículo
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 text-right">
                      {getVehicleInfo(order.vehicleId)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-neutral-400" /> Kilometraje
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-800 bg-white px-2 py-0.5 rounded-lg border border-neutral-200 shadow-2xs">
                      {order.km !== undefined
                        ? `${order.km.toLocaleString("es-DO")} ${order.kmUnit || "km"}`
                        : (() => { const v = vehicles.find(v => v.id === order.vehicleId); return v && v.km !== undefined && v.km > 0 ? `${v.km.toLocaleString("es-DO")} km` : "—"; })()}
                    </span>
                  </div>
                </div>

                {/* Columna 2: Taller, Fecha y Técnico */}
                <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/70 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200/60">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" /> Fecha
                    </span>
                    <span className="text-xs font-semibold text-neutral-800">
                      {new Date(order.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCog className="h-3.5 w-3.5 text-neutral-400" /> Técnico Asignado
                    </span>
                    <Select 
                      value={order.mechanicId || "none"} 
                      onValueChange={(val) => {
                        updateOrder(order.id, { mechanicId: val === "none" || !val ? undefined : val });
                        toast.success("Técnico actualizado con éxito");
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-neutral-200 bg-white text-xs font-medium shadow-2xs hover:border-neutral-300">
                        <span className="truncate">
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
                    <div className="pt-1 text-[11px] text-neutral-600 italic bg-white/70 p-2.5 rounded-xl border border-neutral-200/60 leading-snug">
                      "{order.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN DE ALMACÉN / REPUESTOS */}
              <div className="border border-neutral-200/80 rounded-2xl overflow-hidden">
                <div className="bg-neutral-50/80 p-3.5 border-b border-neutral-200/70 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-neutral-600" />
                    <span className="text-xs font-bold text-neutral-800">Repuestos Despachados</span>
                    <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-neutral-200/70 text-neutral-700">
                      {currentOrder.parts?.length || 0}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 shadow-2xs gap-1 cursor-pointer"
                    onClick={() => {
                      const next = !showPartSelector;
                      setShowPartSelector(next);
                      if (next) {
                        setIsPartPopoverOpen(true);
                      } else {
                        setIsPartPopoverOpen(false);
                        setPendingParts([]);
                        setPartSearch("");
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Despachar Piezas
                  </Button>
                </div>

                {showPartSelector && (
                  <div className="p-3.5 bg-blue-50/40 border-b border-blue-100/60 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-blue-600" /> Añadir Repuestos para Despacho
                        </Label>
                        {pendingParts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPendingParts([])}
                            className="text-[10px] text-neutral-400 hover:text-rose-600 font-medium transition-colors"
                          >
                            Limpiar lista
                          </button>
                        )}
                      </div>

                      <Popover open={isPartPopoverOpen} onOpenChange={setIsPartPopoverOpen}>
                        <PopoverTrigger className="flex w-full items-center justify-between px-3 h-10 rounded-xl border border-neutral-200 bg-white text-xs hover:border-blue-400 transition-colors focus:outline-none shadow-2xs text-left">
                          <span className="text-neutral-500 flex items-center gap-2 truncate">
                            <Plus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            Buscar y añadir pieza por nombre, SKU o marca...
                          </span>
                          <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400 shrink-0 ml-1.5" />
                        </PopoverTrigger>

                        <PopoverContent 
                          className="w-[var(--anchor-width,360px)] min-w-[300px] max-w-[90vw] p-2.5 z-[250] shadow-2xl rounded-xl border border-neutral-200 bg-white" 
                          align="start"
                        >
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                            <Input 
                              placeholder="Escribe el nombre o código de la pieza..." 
                              value={partSearch}
                              onChange={(e) => setPartSearch(e.target.value)}
                              className="pl-8 pr-7 h-9 text-xs rounded-lg border-neutral-200 focus-visible:ring-blue-500"
                              autoFocus
                            />
                            {partSearch && (
                              <button
                                type="button"
                                onClick={() => setPartSearch("")}
                                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                            {filteredAvailableProducts.map((p) => {
                              const inPending = pendingParts.find(item => item.productId === p.id);
                              return (
                                <button 
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectProductToDispatch(p.id)}
                                  className={cn(
                                    "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between gap-2 border",
                                    inPending 
                                      ? "bg-blue-50/70 border-blue-200 text-blue-900" 
                                      : "border-transparent hover:bg-neutral-50 hover:border-neutral-100"
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-neutral-800 truncate flex items-center gap-1.5">
                                      {p.name}
                                      {inPending && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">
                                          En lista (x{inPending.quantity})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                                      {p.sku && <span>SKU: {p.sku}</span>}
                                      {p.brand && <span>• {p.brand}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={cn(
                                      "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                      p.stock <= p.minStock 
                                        ? "bg-amber-100 text-amber-800" 
                                        : "bg-emerald-100 text-emerald-800"
                                    )}>
                                      Stock: {p.stock}
                                    </span>
                                    {p.salePrice > 0 && (
                                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                        RD${p.salePrice.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}

                            {filteredAvailableProducts.length === 0 && (
                              <div className="py-6 text-center">
                                <p className="text-xs font-medium text-neutral-500">
                                  {availableProducts.length === 0 
                                    ? "No hay repuestos con stock disponible en almacén" 
                                    : "No se encontraron repuestos con ese nombre o código"}
                                </p>
                                {partSearch && (
                                  <p className="text-[10px] text-neutral-400 mt-1">
                                    Intente buscando con otra palabra o código
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Lista de piezas en preparación para despachar */}
                    {pendingParts.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                            Piezas a despachar ({pendingParts.length}):
                          </p>
                          <span className="text-[11px] font-semibold text-neutral-500">
                            Total: <strong className="text-neutral-900">{pendingParts.reduce((acc, i) => acc + i.quantity, 0)} unidades</strong>
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-0.5">
                          {pendingParts.map((item) => {
                            const p = products.find((prod) => prod.id === item.productId);
                            if (!p) return null;
                            return (
                              <div
                                key={item.productId}
                                className="p-2.5 bg-white border border-neutral-200 rounded-xl space-y-1.5 shadow-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-neutral-800 truncate">{p.name}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono">
                                      {p.sku && <span>SKU: {p.sku}</span>}
                                      {p.brand && <span>• {p.brand}</span>}
                                      <span className="text-emerald-700 font-semibold">• Stock disp: {p.stock}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePendingPart(item.productId)}
                                    className="text-neutral-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                                    title="Quitar pieza"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                                  <span className="text-[10px] font-medium text-neutral-500">Cantidad:</span>
                                  
                                  <div className="flex items-center gap-1.5">
                                    {p.stock >= 4 && (
                                      <div className="hidden sm:flex items-center gap-1">
                                        {[1, 2, 4, 10].filter(n => n <= p.stock).map(n => (
                                          <button
                                            key={n}
                                            type="button"
                                            onClick={() => handleUpdatePendingQuantity(item.productId, n)}
                                            className={cn(
                                              "h-6 px-1.5 text-[10px] font-bold rounded border transition-colors",
                                              item.quantity === n
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                                            )}
                                          >
                                            {n}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdatePendingQuantity(item.productId, item.quantity - 1)}
                                        className="px-2 h-7 text-neutral-600 hover:bg-neutral-200 border-r border-neutral-200 transition-colors"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        max={p.stock}
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (!isNaN(val)) {
                                            handleUpdatePendingQuantity(item.productId, val);
                                          }
                                        }}
                                        className="h-7 w-12 text-center text-xs font-bold bg-white focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleUpdatePendingQuantity(item.productId, item.quantity + 1)}
                                        disabled={item.quantity >= p.stock}
                                        className="px-2 h-7 text-neutral-600 hover:bg-neutral-200 border-l border-neutral-200 disabled:opacity-30 transition-colors"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Botones de acción de despacho */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
                            onClick={() => {
                              setShowPartSelector(false);
                              setPendingParts([]);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 shadow-sm flex items-center gap-1.5"
                            onClick={handleConfirmBatchDispatch}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Despachar {pendingParts.length} {pendingParts.length === 1 ? "Repuesto" : "Repuestos"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-center rounded-xl bg-white/70 border border-dashed border-blue-200">
                        <p className="text-xs text-neutral-500">
                          Selecciona repuestos en el buscador superior para agregarlos aquí a la lista de despacho múltiple.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-0">
                  {(!currentOrder.parts || currentOrder.parts.length === 0) ? (
                    <div className="p-3 text-center text-xs text-neutral-400 italic">
                      No se han despachado piezas para esta orden.
                    </div>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {currentOrder.parts.map((part, idx) => {
                        const p = products.find(prod => prod.id === part.productId);
                        return (
                          <li key={idx} className="flex items-center justify-between p-3 hover:bg-neutral-50/80 transition-colors gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-neutral-800 truncate">{p?.name || "Pieza desconocida"}</p>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono mt-0.5">
                                {p?.sku && <span>SKU: {p.sku}</span>}
                                {p?.brand && <span>• {p.brand}</span>}
                                {p?.salePrice ? <span>• RD${p.salePrice.toLocaleString()} c/u</span> : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                                <button
                                  type="button"
                                  onClick={() => handleDecreasePart(part.productId)}
                                  className="h-6 w-6 rounded-md hover:bg-white text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors"
                                  title="Disminuir 1 unidad (-1)"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-black text-neutral-800 px-2 min-w-[28px] text-center">
                                  {part.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleIncreasePart(part.productId)}
                                  disabled={!p || p.stock <= 0}
                                  className="h-6 w-6 rounded-md hover:bg-white text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                                  title={p && p.stock > 0 ? `Aumentar 1 unidad (+1, stock en almacén: ${p.stock})` : "Sin stock adicional en almacén"}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              <button 
                                type="button"
                                onClick={() => handleRemovePart(part.productId, part.quantity)}
                                className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                                title={`Eliminar todas las unidades (${part.quantity}) y retornar al almacén`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* RESUMEN FINANCIERO DE LA ORDEN (Subtotal + ITBIS 18% + Total) */}
              {orderFinancials.subtotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-neutral-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-6 text-xs w-full sm:w-auto justify-between sm:justify-start">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">Subtotal</span>
                      <span className="font-mono font-semibold text-neutral-200">
                        RD$ {orderFinancials.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-neutral-800 hidden sm:block" />
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">ITBIS (18%)</span>
                      <span className="font-mono font-semibold text-neutral-200">
                        RD$ {orderFinancials.tax.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto flex items-center justify-between sm:block border-t border-neutral-800 sm:border-0 pt-2 sm:pt-0">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">Total General</span>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      RD$ {orderFinancials.total.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Botones Ejecutivos */}
            <div className="flex-shrink-0 border-t border-neutral-100 bg-neutral-50/60 px-6 py-3.5 flex items-center justify-between gap-3 rounded-b-3xl">
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 px-3 gap-1.5 cursor-pointer"
                onClick={() => { deleteOrder(order.id); toast.success("Registro de mantenimiento eliminado"); onOpenChange(false); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className={cn(
                    "rounded-xl text-xs font-semibold h-9 px-3.5 gap-1.5 border shadow-2xs cursor-pointer",
                    existingInspection?.status === "completed"
                      ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                      : existingInspection?.status === "draft"
                      ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                      : "text-neutral-700 border-neutral-200 bg-white hover:bg-neutral-50"
                  )}
                  onClick={() => setIsInspectionOpen(true)}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>
                    {existingInspection?.status === "completed"
                      ? "Ver Inspección"
                      : existingInspection?.status === "draft"
                      ? "Continuar Insp."
                      : "Inspección"}
                  </span>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-2xs cursor-pointer"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Editar</span>
                </Button>

                <Button 
                  type="button" 
                  size="sm"
                  onClick={() => onOpenChange(false)} 
                  className="rounded-xl bg-black hover:bg-neutral-900 text-white text-xs font-bold h-9 px-5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {/* Inspection Dialog - RENDERIZADO AFUERA PARA EVITAR COLISIÓN DE MODALES */}
      <Suspense fallback={null}>
        {isInspectionOpen && (
          <LazyInspectionDialog
            open={isInspectionOpen}
            onOpenChange={setIsInspectionOpen}
            vehicleId={order.vehicleId}
            customerId={order.customerId}
            workOrderId={order.id}
            tenantId={order.tenantId}
            existingInspection={existingInspection}
          />
        )}
      </Suspense>
    </Dialog>
  );
}
