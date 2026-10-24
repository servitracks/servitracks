"use client";

import { useState, useEffect } from "react";
import type { PurchaseOrder, GoodsReceipt, GoodsReceiptItem, AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, AlertTriangle, CheckCircle2, Truck, Info, Check, ShieldCheck } from "lucide-react";
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

  useEffect(() => {
    if (open && purchaseOrder) {
      setItems(
        purchaseOrder.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          expectedQuantity: Math.max(0, item.quantity - item.receivedQuantity),
          receivedQuantity: Math.max(0, item.quantity - item.receivedQuantity),
          damagedQuantity: 0,
          notes: "",
        }))
      );
      setGeneralNotes("");
    }
  }, [open, purchaseOrder]);

  if (!purchaseOrder) return null;

  const supplier = suppliers.find((s) => s.id === purchaseOrder.supplierId);

  const updateItem = (i: number, updates: Partial<GoodsReceiptItem>) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...updates } : item)));
  };

  const handleReceiveAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        receivedQuantity: item.expectedQuantity,
        damagedQuantity: 0,
      }))
    );
    toast.success("Se marcaron todos los artículos como recibidos conformes");
  };

  const allComplete = items.every((item) => item.receivedQuantity >= item.expectedQuantity);
  const hasShortage = items.some((item) => item.receivedQuantity < item.expectedQuantity);
  const hasDamaged = items.some((item) => item.damagedQuantity > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();

    // 1. Create goods receipt
    const receipt: GoodsReceipt = {
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 pr-16 border-b border-neutral-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-neutral-900 tracking-tight">
                  Recepción de Mercancía
                </DialogTitle>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                  {purchaseOrder.number}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-normal mt-0.5">
                {supplier ? `Proveedor: ${supplier.commercialName}` : "Verificación y control de entrada a almacén"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReceiveAll}
            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 shadow-2xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Recibir Todo Conforme</span>
          </Button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            {/* Automated Actions Ribbon */}
            <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-blue-950">Proceso Automatizado:</span>{" "}
                <span className="text-blue-800">
                  Al confirmar la recepción, el stock físico se incrementa en almacén, se genera la cuenta por pagar a {supplier?.creditDays || 30} días y se actualiza el estado de la orden.
                </span>
              </div>
            </div>

            {/* Incidencias Alert */}
            {(hasShortage || hasDamaged) && (
              <div className="px-3.5 py-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Avisos de discrepancia:</p>
                  <ul className="text-[11px] text-amber-800 space-y-0.5">
                    {hasShortage && (
                      <li className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Se detectaron cantidades menores a lo esperado (la orden pasará a estado Parcial).
                      </li>
                    )}
                    {hasDamaged && (
                      <li className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Los artículos marcados como dañados no ingresarán al stock comercial disponible.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Lote de Productos ({items.length})
              </p>

              <div className="space-y-2.5">
                {items.map((item, i) => {
                  const shortage = item.receivedQuantity < item.expectedQuantity;
                  const damaged = item.damagedQuantity > 0;
                  const isPerfect = !shortage && !damaged && item.receivedQuantity === item.expectedQuantity;

                  return (
                    <div 
                      key={item.productId} 
                      className={cn(
                        "p-3.5 rounded-xl border transition-all",
                        shortage || damaged 
                          ? "bg-amber-50/40 border-amber-200/80" 
                          : isPerfect 
                          ? "bg-white border-neutral-200/80 hover:border-neutral-300 shadow-2xs" 
                          : "bg-neutral-50/70 border-neutral-200/70"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900">{item.productName}</span>
                          {isPerfect && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completo
                            </span>
                          )}
                          {shortage && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Faltan {item.expectedQuantity - item.receivedQuantity}
                            </span>
                          )}
                          {damaged && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              {item.damagedQuantity} dañados
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500 font-semibold">
                          Esperado: <strong className="text-neutral-900">{item.expectedQuantity}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-neutral-600">Recibido Conforme</Label>
                          <Input 
                            type="number" 
                            min="0" 
                            max={item.expectedQuantity}
                            className={cn(
                              "h-9 rounded-lg text-xs font-mono font-bold bg-white shadow-2xs",
                              shortage && "border-amber-300 bg-amber-50/50"
                            )}
                            value={item.receivedQuantity}
                            onChange={(e) => updateItem(i, { receivedQuantity: Math.min(Number(e.target.value) || 0, item.expectedQuantity) })} 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-neutral-600">Dañados / Rechazados</Label>
                          <Input 
                            type="number" 
                            min="0" 
                            max={item.receivedQuantity}
                            className={cn(
                              "h-9 rounded-lg text-xs font-mono font-bold bg-white shadow-2xs",
                              damaged && "border-rose-300 bg-rose-50/50 text-rose-700"
                            )}
                            value={item.damagedQuantity}
                            onChange={(e) => updateItem(i, { damagedQuantity: Math.min(Number(e.target.value) || 0, item.receivedQuantity) })} 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-neutral-600">Notas de Inspección</Label>
                          <Input 
                            className="h-9 rounded-lg text-xs bg-white shadow-2xs placeholder:text-neutral-400" 
                            placeholder="Ej: Empaque sellado..."
                            value={item.notes || ""} 
                            onChange={(e) => updateItem(i, { notes: e.target.value })} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Notes */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-neutral-700">Observaciones Generales de la Entrega</Label>
              <textarea 
                className="w-full min-h-[58px] rounded-xl border border-neutral-200 bg-white p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 shadow-2xs"
                placeholder="Nombre del transportista, número de guía o condiciones generales del despacho..."
                value={generalNotes} 
                onChange={(e) => setGeneralNotes(e.target.value)} 
              />
            </div>
          </div>

          {/* Footer Ejecutivo con Botones Agrupados */}
          <div className="flex-shrink-0 border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 flex items-center justify-end gap-3 rounded-b-3xl">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 h-10 px-5 font-bold text-xs sm:text-sm cursor-pointer shadow-2xs transition-all"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="rounded-xl bg-black hover:bg-neutral-900 text-white h-10 px-6 font-bold text-xs sm:text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all gap-2"
            >
              <PackageCheck className="h-4 w-4" />
              <span>Confirmar Recepción de Mercancía</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

