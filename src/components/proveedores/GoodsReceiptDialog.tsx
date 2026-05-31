"use client";

import { useState } from "react";
import type { PurchaseOrder, GoodsReceipt, GoodsReceiptItem, AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  tenantId: string;
}

export default function GoodsReceiptDialog({ open, onOpenChange, purchaseOrder, tenantId }: Props) {
  const suppliers = useStore((s) => s.suppliers);
  const { addGoodsReceipt, updatePurchaseOrder, updateProduct, addMovement, addAccountPayable } = useStore();

  const [items, setItems] = useState<GoodsReceiptItem[]>(() => {
    if (!purchaseOrder) return [];
    return purchaseOrder.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      expectedQuantity: item.quantity - item.receivedQuantity,
      receivedQuantity: item.quantity - item.receivedQuantity,
      damagedQuantity: 0,
      notes: "",
    }));
  });
  const [generalNotes, setGeneralNotes] = useState("");

  if (!purchaseOrder) return null;

  const supplier = suppliers.find((s) => s.id === purchaseOrder.supplierId);

  const updateItem = (i: number, updates: Partial<GoodsReceiptItem>) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...updates } : item)));
  };

  const allComplete = items.every((item) => item.receivedQuantity >= item.expectedQuantity);
  const hasShortage = items.some((item) => item.receivedQuantity < item.expectedQuantity);
  const hasDamaged = items.some((item) => item.damagedQuantity > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();

    // 1. Create goods receipt
    const receipt: GoodsReceipt = {
      id: `gr_${Date.now()}`,
      tenantId,
      purchaseOrderId: purchaseOrder.id,
      supplierId: purchaseOrder.supplierId,
      items,
      receivedAt: now,
      receivedBy: "current-user",
      notes: generalNotes.trim() || undefined,
    };
    addGoodsReceipt(receipt);

    // 2. Update purchase order items (received quantities) & status
    const updatedItems = purchaseOrder.items.map((poItem) => {
      const receiptItem = items.find((ri) => ri.productId === poItem.productId);
      return {
        ...poItem,
        receivedQuantity: poItem.receivedQuantity + (receiptItem?.receivedQuantity || 0),
      };
    });

    const allItemsComplete = updatedItems.every((item) => item.receivedQuantity >= item.quantity);
    const newStatus = allItemsComplete ? "recibida_completa" : "recibida_parcial";

    updatePurchaseOrder(purchaseOrder.id, {
      items: updatedItems,
      status: newStatus as any,
    });

    // 3. Update inventory (add stock for received quantities)
    items.forEach((item) => {
      const goodQty = item.receivedQuantity - item.damagedQuantity;
      if (goodQty > 0) {
        updateProduct(item.productId, {
          stock: (useStore.getState().products.find((p) => p.id === item.productId)?.stock || 0) + goodQty,
        });
        addMovement({
          id: `m_${Date.now()}_${item.productId}`,
          tenantId,
          productId: item.productId,
          productName: item.productName,
          type: "in",
          quantity: goodQty,
          reason: `Recepción OC ${purchaseOrder.number}`,
          date: now,
        });
      }
    });

    // 4. Auto-generate Account Payable
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (supplier?.creditDays || 30));

    const payable: AccountPayable = {
      id: `ap_${Date.now()}`,
      tenantId,
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrder.id,
      invoiceNumber: `FACT-${purchaseOrder.number}`,
      amount: purchaseOrder.total,
      paidAmount: 0,
      dueDate: dueDate.toISOString(),
      status: "pendiente",
      createdAt: now,
    };
    addAccountPayable(payable);

    toast.success(
      <div>
        <p className="font-bold">Recepción registrada</p>
        <p className="text-xs text-neutral-500">
          Inventario actualizado • Cuenta por pagar generada • OC {newStatus === "recibida_completa" ? "completa" : "parcial"}
        </p>
      </div>
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            Recepción de Mercancía — {purchaseOrder.number}
          </DialogTitle>
          {supplier && <p className="text-sm text-neutral-500">{supplier.commercialName}</p>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Items */}
          <div className="space-y-2">
            {items.map((item, i) => {
              const shortage = item.receivedQuantity < item.expectedQuantity;
              const damaged = item.damagedQuantity > 0;
              return (
                <div key={item.productId} className={cn(
                  "p-4 rounded-xl border transition-colors",
                  shortage || damaged ? "bg-amber-50/50 border-amber-200" : "bg-neutral-50/80 border-neutral-100"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm">{item.productName}</p>
                    <Badge variant="outline" className="text-xs">Esperado: {item.expectedQuantity}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Cantidad Recibida</Label>
                      <Input type="number" min="0" max={item.expectedQuantity}
                        className={cn("h-9 rounded-lg text-sm font-bold", shortage && "border-amber-300 bg-amber-50")}
                        value={item.receivedQuantity}
                        onChange={(e) => updateItem(i, { receivedQuantity: Math.min(Number(e.target.value) || 0, item.expectedQuantity) })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Dañados</Label>
                      <Input type="number" min="0" max={item.receivedQuantity}
                        className={cn("h-9 rounded-lg text-sm", damaged && "border-rose-300 bg-rose-50")}
                        value={item.damagedQuantity}
                        onChange={(e) => updateItem(i, { damagedQuantity: Math.min(Number(e.target.value) || 0, item.receivedQuantity) })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Notas</Label>
                      <Input className="h-9 rounded-lg text-xs" placeholder="Observación..."
                        value={item.notes || ""} onChange={(e) => updateItem(i, { notes: e.target.value })} />
                    </div>
                  </div>
                  {shortage && (
                    <p className="flex items-center gap-1 text-xs text-amber-600 font-medium mt-2">
                      <AlertTriangle className="h-3 w-3" /> Faltante: {item.expectedQuantity - item.receivedQuantity} unidades
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary alerts */}
          {(hasShortage || hasDamaged) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Resumen de incidencias
              </p>
              <ul className="mt-1 text-xs text-amber-600 space-y-0.5">
                {hasShortage && <li>• Productos con faltantes detectados</li>}
                {hasDamaged && <li>• Productos dañados registrados (no se agregarán al inventario)</li>}
              </ul>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas Generales</Label>
            <textarea className="w-full min-h-[50px] rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Observaciones de la recepción..."
              value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
          </div>

          {/* Auto-actions info */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs font-bold text-blue-700">Al confirmar se ejecutarán automáticamente:</p>
            <ul className="mt-1 text-xs text-blue-600 space-y-0.5">
              <li>✓ Entrada de inventario por productos recibidos</li>
              <li>✓ Cuenta por pagar generada ({supplier?.creditDays || 30} días de crédito)</li>
              <li>✓ Actualización del estado de la OC</li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2">
              <PackageCheck className="h-4 w-4" /> Confirmar Recepción
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
