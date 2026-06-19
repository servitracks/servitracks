"use client";

import { useState, useMemo } from "react";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package, TrendingUp, TrendingDown, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editOrder?: PurchaseOrder | null;
  isOwner?: boolean;
}

export default function PurchaseOrderDialog({ open, onOpenChange, tenantId, editOrder, isOwner = true }: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId && s.status === "activo");
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const { addPurchaseOrder, updatePurchaseOrder, updateProduct } = useStore();
  const isEdit = !!editOrder;

  const [supplierId, setSupplierId] = useState(editOrder?.supplierId || "");
  const [notes, setNotes] = useState(editOrder?.notes || "");
  const [expectedDelivery, setExpectedDelivery] = useState(editOrder?.expectedDelivery || "");
  const [items, setItems] = useState<PurchaseOrderItem[]>(
    editOrder?.items || []
  );

  const generateNumber = () => {
    const year = new Date().getFullYear();
    const num = purchaseOrders.length + 1;
    return `OC-${year}-${String(num).padStart(3, "0")}`;
  };

  const addItem = () => {
    setItems((prev) => [...prev, {
      id: `poi_${Date.now()}_${prev.length}`,
      productId: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      salePrice: 0,
      receivedQuantity: 0,
    }]);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, updates: Partial<PurchaseOrderItem>) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      const newItem = { ...item, ...updates };
      if (updates.productId) {
        const product = products.find((p) => p.id === updates.productId);
        if (product) {
          newItem.productName = product.name;
          newItem.unitPrice = product.costPrice;
          newItem.salePrice = product.salePrice;
        }
      }
      return newItem;
    }));
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const supplierItbis = selectedSupplier?.itbis !== undefined ? selectedSupplier.itbis : 18;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * (supplierItbis / 100));
  const total = subtotal + tax;

  // Proyección de venta
  const totalVentaEstimado = items.reduce((sum, item) => sum + item.quantity * item.salePrice, 0);
  const gananciaBruta = totalVentaEstimado - subtotal;
  const margenPromedio = subtotal > 0 ? Math.round((gananciaBruta / subtotal) * 100) : 0;

  const getMarginBadge = (cost: number, sale: number) => {
    if (cost <= 0 || sale <= 0) return null;
    const margin = Math.round(((sale - cost) / cost) * 100);
    if (margin >= 30) return { color: "text-emerald-700 bg-emerald-50 border-emerald-200", label: `${margin}%`, icon: "↑" };
    if (margin >= 15) return { color: "text-amber-700 bg-amber-50 border-amber-200", label: `${margin}%`, icon: "→" };
    if (margin > 0) return { color: "text-rose-700 bg-rose-50 border-rose-200", label: `${margin}%`, icon: "↓" };
    return { color: "text-red-700 bg-red-50 border-red-200", label: `${margin}%`, icon: "⚠" };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { toast.error("Selecciona un proveedor"); return; }
    if (items.length === 0 || items.every((i) => !i.productId)) { toast.error("Agrega al menos un producto"); return; }

    const validItems = items.filter((i) => i.productId);
    const now = new Date().toISOString();

    if (isEdit && editOrder) {
      updatePurchaseOrder(editOrder.id, {
        supplierId,
        items: validItems,
        subtotal,
        tax,
        total,
        notes: notes.trim() || undefined,
        expectedDelivery: expectedDelivery || undefined,
      });
      toast.success("Orden de compra actualizada");
    } else {
      const newPO: PurchaseOrder = {
        id: `po_${Date.now()}`,
        tenantId,
        supplierId,
        number: generateNumber(),
        paymentStatus: 'pending',
        status: "borrador",
        items: validItems,
        subtotal,
        tax,
        total,
        notes: notes.trim() || undefined,
        createdBy: "current-user",
        createdAt: now,
        updatedAt: now,
        expectedDelivery: expectedDelivery || undefined,
      };
      addPurchaseOrder(newPO);
      toast.success(`Orden ${newPO.number} creada`);
    }

    // Actualizar precios en inventario automáticamente
    validItems.forEach((item) => {
      const updates: { costPrice?: number; salePrice?: number } = {};
      if (item.unitPrice > 0) updates.costPrice = item.unitPrice;
      if (item.salePrice > 0) updates.salePrice = item.salePrice;
      if (Object.keys(updates).length > 0) {
        updateProduct(item.productId, updates);
      }
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEdit ? `Editar ${editOrder?.number}` : "Nueva Orden de Compra"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Supplier + Delivery */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Proveedor *</Label>
              <Select 
                value={supplierId || undefined} 
                onValueChange={(v) => setSupplierId(v || "")}
                items={suppliers.map(s => ({ value: s.id, label: s.commercialName }))}
              >
                <SelectTrigger className="h-10 rounded-xl border-neutral-200"><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.commercialName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha Entrega Esperada</Label>
              <Input type="date" className="h-10 rounded-xl border-neutral-200"
                value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
            </div>
          </div>

          {/* Info Banner — solo visible para owner */}
          {isOwner && (
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl flex gap-2 border border-blue-100">
              <span className="font-bold flex-shrink-0">💡</span>
              <span>Los precios de costo y venta que establezcas aquí se actualizarán automáticamente en tu inventario al guardar.</span>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase text-neutral-400 tracking-wider">Productos</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                <Plus className="h-3 w-3" /> Agregar Producto
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Agrega productos a la orden</p>
                <Button type="button" variant="outline" size="sm" className="mt-3 rounded-lg text-xs" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar Producto
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Column headers — layout adapts based on role */}
                <div className={`grid gap-2 px-3 pb-1 ${isOwner ? 'grid-cols-[1fr_70px_100px_100px_55px_90px_32px]' : 'grid-cols-[1fr_80px_110px_100px_32px]'}`}>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Producto</span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Cant.</span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">{isOwner ? 'Costo Unit.' : 'Precio Unit.'}</span>
                  {isOwner && <span className="text-[10px] font-bold text-neutral-400 uppercase">Venta Unit.</span>}
                  {isOwner && <span className="text-[10px] font-bold text-neutral-400 uppercase text-center">Margen</span>}
                  <span className="text-[10px] font-bold text-neutral-400 uppercase text-right">Subtotal</span>
                  <span></span>
                </div>

                {items.map((item, i) => {
                  const badge = isOwner ? getMarginBadge(item.unitPrice, item.salePrice) : null;
                  return (
                    <div key={item.id} className={`grid gap-2 items-center p-3 rounded-xl bg-neutral-50/80 border border-neutral-100 ${isOwner ? 'grid-cols-[1fr_70px_100px_100px_55px_90px_32px]' : 'grid-cols-[1fr_80px_110px_100px_32px]'}`}>
                      {/* Producto */}
                      <div>
                        <Select 
                          value={item.productId || undefined} 
                          onValueChange={(v) => updateItem(i, { productId: v || "" })}
                          items={products.map(p => ({ value: p.id, label: p.name }))}
                        >
                          <SelectTrigger className="h-8 rounded-lg border-neutral-200 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent className="rounded-xl max-h-48">
                            {products.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Cantidad */}
                      <div>
                        <Input type="number" min="1" className="h-8 rounded-lg border-neutral-200 text-xs text-center"
                          value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })} />
                      </div>
                      {/* Costo Unit. */}
                      <div>
                        <Input type="number" className="h-8 rounded-lg border-neutral-200 text-xs"
                          placeholder="RD$"
                          value={item.unitPrice === 0 ? "" : item.unitPrice} onChange={(e) => updateItem(i, { unitPrice: e.target.value === "" ? 0 : Number(e.target.value) })} />
                        {item.unitPrice > 0 && (
                          <p className="text-[9px] text-neutral-500 font-bold text-center mt-0.5">
                            c/ITBIS: {Math.round(item.unitPrice * (1 + supplierItbis / 100))}
                          </p>
                        )}
                      </div>
                      {/* Venta Unit. — solo owner */}
                      {isOwner && (
                        <div>
                          <Input type="number" className="h-8 rounded-lg border-emerald-200 text-xs bg-emerald-50/50 font-medium"
                            placeholder="RD$"
                            value={item.salePrice === 0 ? "" : item.salePrice} onChange={(e) => updateItem(i, { salePrice: e.target.value === "" ? 0 : Number(e.target.value) })} />
                          {item.salePrice > 0 && (
                            <p className="text-[9px] text-emerald-600 font-bold text-center mt-0.5">
                              c/ITBIS: {Math.round(item.salePrice * (1 + supplierItbis / 100))}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Margen — solo owner */}
                      {isOwner && (
                        <div className="flex justify-center">
                          {badge ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-300">—</span>
                          )}
                        </div>
                      )}
                      {/* Subtotal */}
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-800">
                          RD$ {(item.quantity * item.unitPrice).toLocaleString("es-DO")}
                        </p>
                      </div>
                      {/* Delete */}
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => removeItem(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className={`grid gap-3 ${isOwner ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Resumen de Compra */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-2">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2">Resumen de Compra</p>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-bold">RD$ {subtotal.toLocaleString("es-DO")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">ITBIS ({supplierItbis}%)</span>
                  <span className="font-bold">RD$ {tax.toLocaleString("es-DO")}</span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-neutral-200 pt-2 mt-2">
                  <span>Total a Pagar</span>
                  <span>RD$ {total.toLocaleString("es-DO")}</span>
                </div>
              </div>

              {/* Proyección de Ganancia — solo owner */}
              {isOwner && (
                <div className={`rounded-xl p-4 border space-y-2 ${margenPromedio >= 15 ? 'bg-emerald-50/60 border-emerald-100' : 'bg-amber-50/60 border-amber-100'}`}>
                  <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Proyección de Venta
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Valor Venta Total</span>
                    <span className="font-bold">RD$ {totalVentaEstimado.toLocaleString("es-DO")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Ganancia Bruta</span>
                    <span className={`font-bold ${gananciaBruta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      RD$ {gananciaBruta.toLocaleString("es-DO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-neutral-200/50 pt-2 mt-2">
                    <span>Margen</span>
                    <span className={`flex items-center gap-1 ${margenPromedio >= 30 ? 'text-emerald-700' : margenPromedio >= 15 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {margenPromedio >= 15 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {margenPromedio}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea className="w-full min-h-[50px] rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Observaciones..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">
              {isEdit ? "Guardar Cambios" : "Crear Orden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
