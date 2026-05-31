"use client";

import { useState, useMemo } from "react";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editOrder?: PurchaseOrder | null;
}

export default function PurchaseOrderDialog({ open, onOpenChange, tenantId, editOrder }: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId && s.status === "activo");
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const { addPurchaseOrder, updatePurchaseOrder } = useStore();
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
        }
      }
      return newItem;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
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
                {items.map((item, i) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-neutral-50/80 border border-neutral-100">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-[10px]">Producto</Label>
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
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px]">Cantidad</Label>
                      <Input type="number" min="1" className="h-8 rounded-lg border-neutral-200 text-xs"
                        value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 1 })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px]">Precio Unit.</Label>
                      <Input type="number" className="h-8 rounded-lg border-neutral-200 text-xs"
                        value={item.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px]">Subtotal</Label>
                      <p className="h-8 flex items-center text-xs font-bold">
                        RD$ {(item.quantity * item.unitPrice).toLocaleString("es-DO")}
                      </p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => removeItem(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-bold">RD$ {subtotal.toLocaleString("es-DO")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">ITBIS (18%)</span>
                <span className="font-bold">RD$ {tax.toLocaleString("es-DO")}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t border-neutral-200 pt-2 mt-2">
                <span>Total</span>
                <span>RD$ {total.toLocaleString("es-DO")}</span>
              </div>
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
