"use client";

import { useState, useEffect } from "react";
import type { PurchaseOrder, PurchaseOrderItem } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package, TrendingUp, TrendingDown, ClipboardList, Building2, Calendar, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editOrder?: PurchaseOrder | null;
  isOwner?: boolean;
}

interface EditablePOItem extends PurchaseOrderItem {
  rawUnitPrice?: string;
  rawSalePrice?: string;
  rawQuantity?: string;
}

export default function PurchaseOrderDialog({ open, onOpenChange, tenantId, editOrder, isOwner = true }: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId && s.status === "activo");
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const { addPurchaseOrder, updatePurchaseOrder, updateProduct, addProduct } = useStore();
  const isEdit = !!editOrder;

  const [supplierId, setSupplierId] = useState(editOrder?.supplierId || "");
  const [notes, setNotes] = useState(editOrder?.notes || "");
  const [expectedDelivery, setExpectedDelivery] = useState(editOrder?.expectedDelivery || "");
  const [items, setItems] = useState<EditablePOItem[]>(
    () => (editOrder?.items || []).map((it) => {
      const prod = it.productId ? products.find((p) => p.id === it.productId) : null;
      return {
        ...it,
        productName: it.productName || prod?.name || "",
        rawUnitPrice: it.unitPrice ? String(it.unitPrice) : "",
        rawSalePrice: it.salePrice ? String(it.salePrice) : "",
        rawQuantity: it.quantity ? String(it.quantity) : "1",
      };
    })
  );

  useEffect(() => {
    if (open) {
      setSupplierId(editOrder?.supplierId || "");
      setNotes(editOrder?.notes || "");
      setExpectedDelivery(editOrder?.expectedDelivery || "");
      setItems(
        (editOrder?.items || []).map((it) => {
          const prod = it.productId ? products.find((p) => p.id === it.productId) : null;
          return {
            ...it,
            productName: it.productName || prod?.name || "",
            rawUnitPrice: it.unitPrice ? String(it.unitPrice) : "",
            rawSalePrice: it.salePrice ? String(it.salePrice) : "",
            rawQuantity: it.quantity ? String(it.quantity) : "1",
          };
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editOrder?.id]);

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
      rawQuantity: "1",
      rawUnitPrice: "",
      rawSalePrice: "",
    }]);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, updates: Partial<EditablePOItem>) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      const newItem = { ...item, ...updates };
      if (updates.productId && updates.productId !== item.productId) {
        const product = products.find((p) => p.id === updates.productId);
        if (product) {
          newItem.productName = product.name;
          newItem.unitPrice = product.costPrice;
          newItem.salePrice = product.salePrice;
          newItem.rawUnitPrice = String(product.costPrice);
          newItem.rawSalePrice = String(product.salePrice);
        }
      }
      return newItem;
    }));
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const supplierItbis = selectedSupplier?.itbis !== undefined ? selectedSupplier.itbis : 18;
  const subtotal = Math.round(items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) * 100) / 100;
  const tax = Math.round((subtotal * (supplierItbis / 100)) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  // Proyección de venta
  const totalVentaEstimado = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.salePrice || 0), 0);
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
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName.trim())) {
      toast.error("Agrega al menos un producto");
      return;
    }

    const now = new Date().toISOString();

    // Auto-crear productos nuevos si no existen en inventario
    const processedItems: PurchaseOrderItem[] = items
      .filter((i) => i.productId || i.productName.trim())
      .map((item, idx) => {
        let finalProductId = item.productId;
        const finalProductName = item.productName.trim();

        if (!finalProductId && finalProductName) {
          const sequentialId = products.length + 1 + idx;
          const generatedCode = `STK${String(sequentialId).padStart(7, "0")}`;
          finalProductId = crypto.randomUUID();

          addProduct({
            id: finalProductId,
            tenantId,
            name: finalProductName,
            sku: generatedCode,
            costPrice: item.unitPrice || 0,
            salePrice: item.salePrice || Math.round((item.unitPrice || 0) * 1.3),
            stock: 0,
            minStock: 2,
            category: "Repuestos",
            ubication: "Almacén General",
            status: "active",
            tax: 18,
            createdAt: now,
            updatedAt: now,
          } as any);
        }

        return {
          id: item.id,
          productId: finalProductId,
          productName: finalProductName,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          salePrice: item.salePrice || 0,
          receivedQuantity: item.receivedQuantity || 0,
        };
      });

    if (isEdit && editOrder) {
      updatePurchaseOrder(editOrder.id, {
        supplierId,
        items: processedItems,
        subtotal,
        tax,
        total,
        notes: notes.trim() || undefined,
        expectedDelivery: expectedDelivery || undefined,
      });
      toast.success("Orden de compra actualizada");
    } else {
      const newPO: PurchaseOrder = {
        id: crypto.randomUUID(),
        tenantId,
        supplierId,
        number: generateNumber(),
        paymentStatus: 'pending',
        status: "borrador",
        items: processedItems,
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
    processedItems.forEach((item) => {
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
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 pr-16 border-b border-neutral-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-neutral-900 tracking-tight">
                  {isEdit ? "Editar Orden de Compra" : "Nueva Orden de Compra"}
                </DialogTitle>
                {isEdit && editOrder?.number && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {editOrder.number}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-normal mt-0.5">
                Planificación de reposición de inventario y acuerdos de precio
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {/* Supplier + Delivery */}
            <div className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/70 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                  Proveedor <span className="text-rose-500">*</span>
                </Label>
                <Select 
                  value={supplierId || ""} 
                  onValueChange={(v) => setSupplierId(v || "")}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white font-medium text-xs shadow-2xs hover:border-neutral-300">
                    <span className={cn("truncate", !selectedSupplier && "text-neutral-400 font-normal")}>
                      {selectedSupplier ? (selectedSupplier.commercialName || selectedSupplier.legalName || "Proveedor") : "Seleccionar proveedor..."}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-neutral-200">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs py-2">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-semibold text-neutral-900">{s.commercialName}</span>
                          {s.rnc && <span className="text-[10px] text-neutral-400 font-mono">RNC: {s.rnc}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  Fecha de Entrega Esperada
                </Label>
                <Input 
                  type="date" 
                  className="h-10 rounded-xl border-neutral-200 bg-white text-xs shadow-2xs"
                  value={expectedDelivery} 
                  onChange={(e) => setExpectedDelivery(e.target.value)} 
                />
              </div>
            </div>

            {/* Info Banner — solo visible para owner */}
            {isOwner && (
              <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-blue-950">Actualización en Inventario:</span>{" "}
                  <span className="text-blue-800">
                    Los precios de costo y venta que definas en esta orden actualizarán automáticamente los valores vigentes en tu catálogo de productos al confirmar.
                  </span>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Productos / Repuestos
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/80">
                    {items.length} {items.length === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 shadow-2xs" 
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Producto</span>
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-10 px-4 text-neutral-400 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                  <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                    <Package className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-700">Sin productos agregados a la orden</p>
                  <p className="text-xs text-neutral-400 mt-0.5 max-w-sm mx-auto">
                    Agrega los ítems que requieres reponer para calcular subtotales y márgenes estimados.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 rounded-xl text-xs font-semibold border-neutral-200 bg-white hover:bg-neutral-50 shadow-2xs gap-1.5" 
                    onClick={addItem}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar Producto
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className={`grid gap-2 px-3 pb-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider ${isOwner ? 'grid-cols-[1.6fr_70px_100px_100px_65px_95px_32px]' : 'grid-cols-[2fr_80px_120px_110px_32px]'}`}>
                    <span>Descripción del Producto</span>
                    <span className="text-center">Cant.</span>
                    <span>{isOwner ? 'Costo Unit.' : 'Precio Unit.'}</span>
                    {isOwner && <span>P. Venta</span>}
                    {isOwner && <span className="text-center">Margen</span>}
                    <span className="text-right">Subtotal</span>
                    <span></span>
                  </div>

                  {items.map((item, i) => {
                    const badge = isOwner ? getMarginBadge(item.unitPrice, item.salePrice) : null;
                    return (
                      <div 
                        key={item.id} 
                        className={`grid gap-2 items-center p-2.5 rounded-xl bg-neutral-50/60 border border-neutral-200/70 hover:border-neutral-300 transition-colors ${isOwner ? 'grid-cols-[1.6fr_70px_100px_100px_65px_95px_32px]' : 'grid-cols-[2fr_80px_120px_110px_32px]'}`}
                      >
                        {/* Producto Search / Free text */}
                        <div>
                          <input
                            list={`po-products-list-${item.id}`}
                            className="h-9 w-full rounded-lg border border-neutral-200 text-xs px-2.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
                            placeholder="Buscar o escribir producto..."
                            value={item.productName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const match = products.find(
                                (p) => p.name.toLowerCase() === val.toLowerCase() || p.sku?.toLowerCase() === val.toLowerCase()
                              );
                              if (match) {
                                updateItem(i, {
                                  productId: match.id,
                                  productName: match.name,
                                  unitPrice: match.costPrice,
                                  salePrice: match.salePrice,
                                  rawUnitPrice: String(match.costPrice),
                                  rawSalePrice: String(match.salePrice),
                                });
                              } else {
                                updateItem(i, { productId: "", productName: val });
                              }
                            }}
                          />
                          <datalist id={`po-products-list-${item.id}`}>
                            {products.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.sku ? `${p.sku} • ` : ""}Stock: {p.stock} • Costo: RD$ {p.costPrice} • Venta: RD$ {p.salePrice}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        {/* Cantidad */}
                        <div>
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="h-9 rounded-lg border-neutral-200 text-xs bg-white text-center font-mono font-bold shadow-2xs"
                            placeholder="1"
                            value={item.rawQuantity !== undefined ? item.rawQuantity : (item.quantity === 0 ? "" : String(item.quantity))}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const num = parseInt(val, 10);
                              updateItem(i, {
                                rawQuantity: val,
                                quantity: isNaN(num) || num < 0 ? 0 : num,
                              });
                            }}
                            onBlur={() => {
                              if (!item.quantity || item.quantity < 1) {
                                updateItem(i, { quantity: 1, rawQuantity: "1" });
                              }
                            }}
                          />
                        </div>

                        {/* Costo Unitario */}
                        <div>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-9 rounded-lg border-neutral-200 text-xs bg-white font-mono shadow-2xs"
                            placeholder="RD$ 0.00"
                            value={item.rawUnitPrice !== undefined ? item.rawUnitPrice : (item.unitPrice === 0 ? "" : String(item.unitPrice))}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, "");
                              const parts = val.split(".");
                              const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : val;
                              const num = parseFloat(cleanVal);
                              updateItem(i, {
                                rawUnitPrice: cleanVal,
                                unitPrice: isNaN(num) ? 0 : num,
                              });
                            }}
                          />
                          {item.unitPrice > 0 && supplierItbis > 0 && (
                            <p className="text-[9px] text-neutral-400 font-semibold text-center mt-0.5">
                              c/ITB: {Math.round(item.unitPrice * (1 + supplierItbis / 100))}
                            </p>
                          )}
                        </div>

                        {/* Precio de Venta (Owner) */}
                        {isOwner && (
                          <div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              className="h-9 rounded-lg border-emerald-200 text-xs bg-emerald-50/40 text-emerald-950 font-mono font-medium shadow-2xs"
                              placeholder="RD$ 0.00"
                              value={item.rawSalePrice !== undefined ? item.rawSalePrice : (item.salePrice === 0 ? "" : String(item.salePrice))}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                const parts = val.split(".");
                                const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : val;
                                const num = parseFloat(cleanVal);
                                updateItem(i, {
                                  rawSalePrice: cleanVal,
                                  salePrice: isNaN(num) ? 0 : num,
                                });
                              }}
                            />
                            {item.salePrice > 0 && supplierItbis > 0 && (
                              <p className="text-[9px] text-emerald-600 font-semibold text-center mt-0.5">
                                c/ITB: {Math.round(item.salePrice * (1 + supplierItbis / 100))}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Margen (Owner) */}
                        {isOwner && (
                          <div className="flex justify-center">
                            {badge ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-tight ${badge.color}`}>
                                {badge.label}
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-300">—</span>
                            )}
                          </div>
                        )}

                        {/* Subtotal */}
                        <div className="text-right">
                          <p className="text-xs font-bold font-mono text-neutral-900">
                            RD$ {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString("es-DO")}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <div className="flex justify-end">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            onClick={() => removeItem(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals Section */}
            {items.length > 0 && (
              <div className={`grid gap-3.5 pt-2 ${isOwner ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Resumen de Compra */}
                <div className="bg-neutral-50/80 rounded-xl p-4 border border-neutral-200/80 space-y-2.5">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                    Resumen Financiero de la Orden
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-neutral-600">
                      <span>Subtotal Neto</span>
                      <span className="font-mono font-semibold text-neutral-900">
                        RD$ {subtotal.toLocaleString("es-DO")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-600">
                      <span>ITBIS ({supplierItbis}%)</span>
                      <span className="font-mono font-semibold text-neutral-900">
                        RD$ {tax.toLocaleString("es-DO")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-neutral-900 border-t border-neutral-200/80 pt-2">
                      <span>Total Estimado a Pagar</span>
                      <span className="font-mono font-black text-neutral-950 text-base">
                        RD$ {total.toLocaleString("es-DO")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Proyección de Ganancia — solo owner */}
                {isOwner && (
                  <div className={`rounded-xl p-4 border space-y-2.5 ${
                    margenPromedio >= 20 
                      ? 'bg-emerald-50/50 border-emerald-200/70' 
                      : 'bg-amber-50/50 border-amber-200/70'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span>Proyección Comercial</span>
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        margenPromedio >= 25 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {margenPromedio}% Margen Prom.
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-neutral-600">
                        <span>Valor Venta Proyectada</span>
                        <span className="font-mono font-semibold text-neutral-900">
                          RD$ {totalVentaEstimado.toLocaleString("es-DO")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-600">
                        <span>Ganancia Bruta Estimada</span>
                        <span className={`font-mono font-bold ${gananciaBruta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          RD$ {gananciaBruta.toLocaleString("es-DO")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold border-t border-neutral-200/80 pt-2">
                        <span className="text-neutral-700">Retorno sobre Costo</span>
                        <span className={`flex items-center gap-1 font-mono font-black text-sm ${
                          margenPromedio >= 25 ? 'text-emerald-700' : margenPromedio >= 15 ? 'text-amber-700' : 'text-rose-700'
                        }`}>
                          {margenPromedio >= 15 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {margenPromedio}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Observaciones / Términos de la Orden</Label>
              <textarea 
                className="w-full min-h-[64px] rounded-xl border border-neutral-200 bg-white p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 shadow-2xs"
                placeholder="Notas especiales para el suplidor o requerimientos de entrega..."
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
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
              className="rounded-xl bg-black hover:bg-neutral-900 text-white h-10 px-6 font-bold text-xs sm:text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all"
            >
              {isEdit ? "Guardar Cambios" : "Crear Orden de Compra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

