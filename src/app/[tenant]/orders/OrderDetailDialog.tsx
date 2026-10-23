"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useStore } from "@/store/useStore";
import { 
  Trash2, Edit2, User as UserIcon, Car as CarIcon, UserCog, Save, X, 
  PackageOpen, Plus, Minus, Shield, FileText, Building2, Search, Check, ChevronsUpDown 
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

  // Cálculo financiero unificado de la Orden (Subtotal + ITBIS 18% + Total)
  const computeOrderFinancials = (partsList = currentOrder.parts || []) => {
    let subtotal = 0;
    let tax = 0;

    // 1. Servicios del catálogo asociados a la orden
    const orderServiceIds = currentOrder.serviceIds || [];
    orderServiceIds.forEach((sid) => {
      // Si viene en currentOrder.items con tasa explícita, respetarla
      const itemOverride = currentOrder.items?.find((it) => it.serviceId === sid);
      const svc = services.find((s) => s.id === sid);
      const price = itemOverride ? Number(itemOverride.unitPrice || 0) : Number(svc?.price || 0);
      const taxRate = itemOverride && typeof itemOverride.taxPercentage === "number"
        ? itemOverride.taxPercentage
        : (typeof svc?.tax === "number" ? svc.tax : 18);
      subtotal += price;
      tax += price * (taxRate / 100);
    });

    // 2. Servicios personalizados (customServices)
    (currentOrder.customServices || []).forEach((cs) => {
      const price = Number(cs.price || 0);
      const taxRate = typeof cs.tax === "number" ? cs.tax : 0;
      subtotal += price;
      tax += price * (taxRate / 100);
    });

    // 3. Repuestos despachados de almacén (parts) — 18% ITBIS
    partsList.forEach((part) => {
      const prod = products.find((p) => p.id === part.productId);
      const unitPrice = Number((part as any).price ?? prod?.salePrice ?? 0);
      const qty = Number(part.quantity || 1);
      const taxRate = typeof (part as any).tax === "number"
        ? (part as any).tax
        : (typeof prod?.tax === "number" ? prod.tax : 18);
      const lineSub = unitPrice * qty;
      subtotal += lineSub;
      tax += lineSub * (taxRate / 100);
    });

    // 4. Repuestos externos (customParts) — 18% ITBIS
    (currentOrder.customParts || []).forEach((cp) => {
      const unitPrice = Number(cp.price || 0);
      const qty = Number(cp.quantity || 1);
      const taxRate = typeof cp.tax === "number" ? cp.tax : 18;
      const lineSub = unitPrice * qty;
      subtotal += lineSub;
      tax += lineSub * (taxRate / 100);
    });

    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedTax = Math.round(tax * 100) / 100;
    const roundedTotal = Math.round((roundedSubtotal + roundedTax) * 100) / 100;

    return {
      subtotal: roundedSubtotal,
      tax: roundedTax,
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
    toast.success("Orden de trabajo actualizada correctamente");
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
    updateOrder(currentOrder.id, { parts: newParts, total: nextFinancials.total });

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
    updateOrder(currentOrder.id, { parts: newParts, total: nextFinancials.total });
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
    updateOrder(currentOrder.id, { parts: newParts, total: nextFinancials.total });

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

            {/* Tipo de Cliente / Comprobante e-CF */}
            <div className="space-y-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <Label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                Tipo de Cliente / Comprobante Fiscal
              </Label>
              <div className="grid grid-cols-2 gap-2">
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
                      "p-2 rounded-lg border text-left transition-all",
                      editForm.customerType === t.id
                        ? "bg-white border-blue-600 shadow-xs ring-1 ring-blue-600"
                        : "bg-white/60 border-neutral-200 hover:bg-white text-neutral-600"
                    )}
                  >
                    <p className="text-xs font-bold text-neutral-900">{t.label}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{t.sub}</p>
                  </button>
                ))}
              </div>

              {editForm.customerType !== "consumidor_final" && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/60 mt-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-neutral-600">RNC / Cédula</Label>
                    <Input
                      placeholder="Ej: 132596161"
                      className="h-9 rounded-lg border-neutral-200 text-xs font-mono"
                      value={editForm.customerRnc}
                      onChange={(e) => setEditForm({ ...editForm, customerRnc: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-neutral-600">Razón Social</Label>
                    <Input
                      placeholder="Nombre comercial o empresa"
                      className="h-9 rounded-lg border-neutral-200 text-xs"
                      value={editForm.customerBusinessName}
                      onChange={(e) => setEditForm({ ...editForm, customerBusinessName: e.target.value })}
                    />
                  </div>
                </div>
              )}
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

            {/* Información Fiscal / e-CF */}
            {(order.customerType || order.ncfType || order.customerRnc) && (
              <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FileText className="h-3 w-3" /> Tipo de Comprobante / e-CF
                  </p>
                  <p className="text-xs font-bold text-neutral-900">
                    {order.customerType === "credito_fiscal" || order.ncfType === "E31"
                      ? "🏢 Empresa / Crédito Fiscal (E31 / B01)"
                      : order.customerType === "gubernamental" || order.ncfType === "E45"
                      ? "🏛️ Gubernamental (E45 / B15)"
                      : order.customerType === "regimen_especial" || order.ncfType === "E44"
                      ? "🛡️ Régimen Especial (E44 / B14)"
                      : "👤 Consumidor Final (E32 / B02)"}
                  </p>
                  {order.customerBusinessName && (
                    <p className="text-[11px] text-neutral-600 font-medium mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-neutral-400" />
                      {order.customerBusinessName}
                    </p>
                  )}
                </div>
                {order.customerRnc && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">RNC / Cédula</span>
                    <span className="text-xs font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200 inline-block mt-0.5">
                      {order.customerRnc}
                    </span>
                  </div>
                )}
              </div>
            )}

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
                  <Plus className="h-3 w-3 mr-1" /> Despachar Piezas
                </Button>
              </div>

              {showPartSelector && (
                <div className="p-3 bg-blue-50/40 border-b border-blue-100/60 space-y-3">
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
                      <PopoverTrigger className="flex w-full items-center justify-between px-3 h-10 rounded-xl border border-neutral-200 bg-white text-xs hover:border-blue-400 transition-colors focus:outline-none shadow-sm text-left">
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
                                  {/* Quick chips if stock >= 4 */}
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

                      {/* Botones de acción */}
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
                  <div className="p-4 text-center text-xs text-neutral-400 italic">
                    No se han despachado piezas para esta orden.
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {currentOrder.parts.map((part, idx) => {
                      const p = products.find(prod => prod.id === part.productId);
                      return (
                        <li key={idx} className="flex items-center justify-between p-3 hover:bg-neutral-50/80 transition-colors gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-neutral-800 truncate">{p?.name || "Pieza desconocida"}</p>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono mt-0.5">
                              {p?.sku && <span>SKU: {p.sku}</span>}
                              {p?.brand && <span>• {p.brand}</span>}
                              {p?.salePrice ? <span>• RD${p.salePrice.toLocaleString()} c/u</span> : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Stepper de cantidad interactivo (- / +) */}
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
              <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80 space-y-1.5 text-xs">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Desglose Financiero de la Orden
                </p>
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal (Servicios y Repuestos):</span>
                  <span className="font-semibold text-neutral-900">
                    RD$ {orderFinancials.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>ITBIS (18%):</span>
                  <span className="font-semibold text-neutral-900">
                    RD$ {orderFinancials.tax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-950 pt-1.5 border-t border-neutral-200">
                  <span>Total General (c/ITBIS):</span>
                  <span>
                    RD$ {orderFinancials.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
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
                className={cn(
                  "flex-1 rounded-xl text-xs font-bold gap-1",
                  existingInspection?.status === "completed"
                    ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100 bg-emerald-50/50"
                    : existingInspection?.status === "draft"
                    ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-100 bg-amber-50/50"
                    : "text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-100"
                )}
                onClick={() => setIsInspectionOpen(true)}
              >
                <Shield className="h-3.5 w-3.5" />
                {existingInspection?.status === "completed"
                  ? "Ver Inspección"
                  : existingInspection?.status === "draft"
                  ? "Continuar Insp."
                  : "Inspección"}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl text-xs font-bold gap-1 text-neutral-700 hover:bg-neutral-50"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3.5 w-3.5 text-neutral-500" /> Editar
              </Button>
            </div>
          </div>
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
