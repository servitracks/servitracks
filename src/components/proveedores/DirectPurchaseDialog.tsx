"use client";

import { useState } from "react";
import type { PurchaseOrder, PurchaseOrderItem, Supplier, AccountPayable, GoodsReceipt } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
}

export default function DirectPurchaseDialog({ open, onOpenChange, tenantId }: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId && s.status === "activo");
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  
  const { 
    addPurchaseOrder, 
    addAccountPayable, 
    addGoodsReceipt, 
    updateProduct, 
    addMovement,
    addProduct
  } = useStore();

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'transfer' | 'check'>('pending');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [notes, setNotes] = useState("");

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

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const supplierItbis = selectedSupplier?.itbis !== undefined ? selectedSupplier.itbis : 18;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * (supplierItbis / 100));
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { toast.error("Selecciona un proveedor"); return; }
    if (!invoiceNumber) { toast.error("Ingresa el NCF o Número de Factura"); return; }
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName.trim())) { toast.error("Agrega al menos un producto"); return; }

    const now = new Date().toISOString();
    const supplier = suppliers.find(s => s.id === supplierId);
    
    // Auto-crear productos nuevos si no existen
    const processedItems = items.filter((i) => i.productId || i.productName.trim()).map((item, idx) => {
      let finalProductId = item.productId;
      let finalProductName = item.productName;

      if (!finalProductId && finalProductName.trim()) {
        const sequentialId = products.length + 1 + idx;
        const generatedCode = `STK${String(sequentialId).padStart(7, '0')}`;
        finalProductId = `p_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
        
        addProduct({
          id: finalProductId,
          tenantId,
          name: finalProductName,
          sku: `SKU-${generatedCode}`,
          barcode: generatedCode,
          category: "Otros",
          costPrice: item.unitPrice,
          salePrice: Math.round(item.unitPrice * 1.3),
          stock: 0, // se incrementará abajo
          minStock: 5,
          tax: supplier?.itbis !== undefined ? supplier.itbis : 18,
          supplier: supplier?.commercialName || "",
        });
      }

      return {
        ...item,
        productId: finalProductId,
        productName: finalProductName,
        receivedQuantity: item.quantity
      };
    });

    const newPoId = `po_${Date.now()}`;

    // 1. Crear Orden de Compra ya Recibida
    const newPO: PurchaseOrder = {
      id: newPoId,
      tenantId,
      supplierId,
      number: generateNumber(),
      invoiceNumber,
      paymentStatus,
      status: "recibida_completa",
      items: processedItems,
      subtotal,
      tax,
      total,
      notes: notes.trim() || `Compra directa / Ingreso a inventario (${paymentStatus === 'transfer' ? 'Transferencia' : paymentStatus === 'check' ? 'Cheque' : paymentStatus === 'paid' ? 'Efectivo' : 'A crédito'})`,
      createdBy: "current-user",
      createdAt: now,
      updatedAt: now,
    };
    addPurchaseOrder(newPO);

    // 2. Crear Recepción (Goods Receipt) para el historial
    const receipt: GoodsReceipt = {
      id: `gr_${Date.now()}`,
      tenantId,
      purchaseOrderId: newPoId,
      supplierId,
      items: processedItems.map(vi => ({
        productId: vi.productId,
        productName: vi.productName,
        expectedQuantity: vi.quantity,
        receivedQuantity: vi.quantity,
        damagedQuantity: 0,
        notes: "Recepción directa"
      })),
      receivedAt: now,
      receivedBy: "current-user",
      notes: "Registro de compra directa",
    };
    addGoodsReceipt(receipt);

    // 3. Actualizar Inventario (Stock y Movimientos)
    processedItems.forEach((item) => {
      const currentStock = useStore.getState().products.find((p) => p.id === item.productId)?.stock || 0;
      updateProduct(item.productId, {
        stock: currentStock + item.quantity,
        costPrice: item.unitPrice,
      });
      addMovement({
        id: `m_${Date.now()}_${item.productId}`,
        tenantId,
        productId: item.productId,
        productName: item.productName,
        type: "in",
        quantity: item.quantity,
        reason: `Compra directa NCF: ${invoiceNumber}`,
        date: now,
      });
    });

    // 4. Crear Cuenta por Pagar
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (supplier?.creditDays || 30));

    addAccountPayable({
      id: `ap_${Date.now()}`,
      tenantId,
      supplierId,
      purchaseOrderId: newPoId,
      invoiceNumber: invoiceNumber,
      amount: total,
      paidAmount: paymentStatus !== 'pending' ? total : 0,
      dueDate: dueDate.toISOString(),
      status: paymentStatus !== 'pending' ? "pagada" : "pendiente",
      createdAt: now,
      notes: paymentStatus === 'transfer' ? 'Pago con Transferencia' : paymentStatus === 'check' ? 'Pago con Cheque' : paymentStatus === 'paid' ? 'Pago en Efectivo' : 'Compra a crédito',
    });

    toast.success(
      <div>
        <p className="font-bold">Compra Directa Registrada</p>
        <p className="text-xs text-neutral-500">
          Inventario y Cuentas por Pagar actualizados.
        </p>
      </div>
    );
    
    // Reset form
    setSupplierId("");
    setInvoiceNumber("");
    setPaymentStatus("pending");
    setItems([]);
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Registrar Compra Directa
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Header Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Proveedor *</Label>
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v || "")}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.commercialName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>NCF / Factura *</Label>
              <Input 
                className="h-10 rounded-xl border-neutral-200 uppercase font-mono text-sm"
                placeholder="B01..."
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado de Pago</Label>
              <Select value={paymentStatus} onValueChange={(v: 'pending' | 'paid' | 'transfer' | 'check' | null) => setPaymentStatus(v || 'pending')}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pending">A Crédito (Pendiente)</SelectItem>
                  <SelectItem value="paid">Pagado (Al Contado - Efectivo)</SelectItem>
                  <SelectItem value="transfer">Pagado (Transferencia)</SelectItem>
                  <SelectItem value="check">Pagado (Cheque)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2 border border-blue-100">
            <span className="font-bold flex-shrink-0">Automático:</span>
            <span>Esta compra ingresará directamente los productos al inventario, actualizará el costo unitario y generará la cuenta por pagar en tu contabilidad.</span>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase text-neutral-400 tracking-wider">Productos Comprados</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                <Plus className="h-3 w-3" /> Agregar Producto
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Agrega productos a la factura</p>
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
                      <input
                        list={`products-list-${item.id}`}
                        className="h-8 w-full rounded-lg border border-neutral-200 text-xs px-3 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Buscar o escribir producto..."
                        value={item.productName || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const match = products.find(p => p.name === val);
                          if (match) {
                            updateItem(i, { productId: match.id, productName: match.name, unitPrice: match.costPrice });
                          } else {
                            updateItem(i, { productId: "", productName: val });
                          }
                        }}
                      />
                      <datalist id={`products-list-${item.id}`}>
                        {products.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.sku ? `${p.sku} - ` : ""}Stock: {p.stock} - Costo: RD$ {p.costPrice}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px]">Cantidad Comprada</Label>
                      <Input type="number" min="1" className="h-8 rounded-lg border-neutral-200 text-xs bg-white"
                        value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px]">Costo Unit. (RD$)</Label>
                      <Input type="number" className="h-8 rounded-lg border-neutral-200 text-xs bg-white"
                        value={item.unitPrice === 0 ? "" : item.unitPrice} onChange={(e) => updateItem(i, { unitPrice: e.target.value === "" ? 0 : Number(e.target.value) })} />
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
            <div className="bg-emerald-50 text-emerald-900 rounded-xl p-4 border border-emerald-100 space-y-2 ml-auto w-1/3 min-w-[250px]">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Subtotal</span>
                <span className="font-bold">RD$ {subtotal.toLocaleString("es-DO")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">ITBIS ({supplierItbis}%)</span>
                <span className="font-bold">RD$ {tax.toLocaleString("es-DO")}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t border-emerald-200 pt-2 mt-2">
                <span>Total Factura</span>
                <span>RD$ {total.toLocaleString("es-DO")}</span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-4 border-t border-neutral-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold">
              Confirmar y Registrar Compra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
