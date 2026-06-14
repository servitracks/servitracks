"use client";

import { useState, useMemo } from "react";
import { Product } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
}

interface ComboItemInput {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitSale: number;
}

export default function ComboCreateDialog({ open, onOpenChange, tenantId }: Props) {
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId && !p.isCombo);
  const addProduct = useStore((s) => s.addProduct);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Otros");
  const [items, setItems] = useState<ComboItemInput[]>([]);
  const [comboPrice, setComboPrice] = useState("");

  const addItem = () => {
    setItems((prev) => [...prev, {
      id: `ci_${Date.now()}_${prev.length}`,
      productId: "",
      productName: "",
      quantity: 1,
      unitCost: 0,
      unitSale: 0,
    }]);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, updates: Partial<ComboItemInput>) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      const newItem = { ...item, ...updates };
      if (updates.productId) {
        const product = products.find((p) => p.id === updates.productId);
        if (product) {
          newItem.productName = product.name;
          newItem.unitCost = product.costPrice;
          newItem.unitSale = product.salePrice;
        }
      }
      return newItem;
    }));
  };

  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  const totalRegularSale = items.reduce((sum, item) => sum + (item.quantity * item.unitSale), 0);
  const finalPrice = Number(comboPrice) || 0;
  
  const profit = finalPrice - totalCost;
  const margin = finalPrice > 0 ? Math.round((profit / finalPrice) * 100) : 0;

  // Max combo stock based on component stock
  const maxStock = useMemo(() => {
    if (items.length === 0 || items.some(i => !i.productId)) return 0;
    
    let minPossible = Infinity;
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > 0) {
        const possible = Math.floor(product.stock / item.quantity);
        if (possible < minPossible) minPossible = possible;
      } else {
        return 0;
      }
    }
    return minPossible === Infinity ? 0 : minPossible;
  }, [items, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Ingresa el nombre del combo"); return; }
    if (items.length < 2) { toast.error("Un combo debe tener al menos 2 artículos"); return; }
    if (items.some((i) => !i.productId)) { toast.error("Selecciona todos los productos"); return; }
    if (finalPrice <= 0) { toast.error("Ingresa un precio válido para el combo"); return; }
    if (finalPrice < totalCost) { toast.error("El precio no puede ser menor al costo total"); return; }

    const generatedCode = `CMB${String(Date.now()).slice(-6)}`;
    const finalSku = sku.trim() || `SKU-${generatedCode}`;

    const newCombo: Product = {
      id: `p${Date.now()}`,
      tenantId: tenantId,
      name: name.trim(),
      sku: finalSku,
      barcode: generatedCode,
      category: category,
      costPrice: totalCost,
      salePrice: finalPrice,
      stock: maxStock, // Stock dinámico o virtual
      minStock: 1,
      tax: 18,
      isCombo: true,
      comboItems: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPriceAtCreation: i.unitSale
      }))
    };

    addProduct(newCombo);
    toast.success("Combo creado exitosamente");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5" /> Crear Nuevo Combo o Paquete
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          
          {/* Datos del combo */}
          <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Nombre del Combo *</Label>
              <Input placeholder="Ej: Cambio de Aceite Premium" className="h-10 rounded-xl border-neutral-200 bg-white"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v || "Otros")}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Servicios">Servicios</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>SKU (Opcional)</Label>
              <Input placeholder="Automático si se deja vacío" className="h-10 rounded-xl border-neutral-200 bg-white"
                value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase text-neutral-400 tracking-wider">Artículos Incluidos</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                <Plus className="h-3 w-3" /> Agregar Artículo
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Agrega productos al combo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 px-3 pb-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Producto</span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase text-center">Cant.</span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase text-right">Costo Total</span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase text-right">Venta Normal</span>
                  <span></span>
                </div>

                {items.map((item, i) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center p-3 rounded-xl bg-neutral-50/80 border border-neutral-100">
                    <div>
                      <Select 
                        value={item.productId || undefined} 
                        onValueChange={(v) => updateItem(i, { productId: v || "" })}
                      >
                        <SelectTrigger className="h-9 rounded-lg border-neutral-200 text-xs bg-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent className="rounded-xl max-h-48">
                          {products.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Input type="number" min="1" className="h-9 rounded-lg border-neutral-200 text-xs text-center bg-white"
                        value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })} />
                    </div>
                    <div className="text-right text-xs text-neutral-500 pt-2">
                      RD$ {(item.quantity * item.unitCost).toLocaleString("es-DO")}
                    </div>
                    <div className="text-right text-xs font-medium pt-2">
                      RD$ {(item.quantity * item.unitSale).toLocaleString("es-DO")}
                    </div>
                    <div className="flex justify-end">
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

          {/* Pricing & Summary */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-3">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2">Costos y Precios Reales</p>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Costo Total</span>
                  <span className="font-medium">RD$ {totalCost.toLocaleString("es-DO")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Venta Individual (Normal)</span>
                  <span className="font-medium">RD$ {totalRegularSale.toLocaleString("es-DO")}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-neutral-200 pt-2">
                  <span className="text-neutral-500">Stock Máximo Posible</span>
                  <Badge variant="outline" className={maxStock > 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}>
                    {maxStock} disponibles
                  </Badge>
                </div>
              </div>

              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 space-y-3">
                <p className="text-[10px] font-black uppercase text-emerald-600/70 tracking-wider mb-2">Precio del Combo</p>
                
                <div>
                  <Label className="text-xs text-emerald-800">Precio Final de Venta *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-emerald-600 font-medium">RD$</span>
                    <Input type="number" className="pl-10 h-10 rounded-xl border-emerald-200 bg-white font-bold text-lg"
                      value={comboPrice} onChange={(e) => setComboPrice(e.target.value)} />
                  </div>
                  {totalRegularSale > 0 && finalPrice > 0 && finalPrice < totalRegularSale && (
                    <p className="text-[10px] text-emerald-600 mt-1.5 font-medium">
                      Ahorro para el cliente: RD$ {(totalRegularSale - finalPrice).toLocaleString("es-DO")}
                    </p>
                  )}
                </div>

                <div className="flex justify-between text-sm border-t border-emerald-200/50 pt-2">
                  <span className="text-emerald-800">Margen Real</span>
                  <span className={`font-bold ${margin >= 30 ? 'text-emerald-700' : margin >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {margin}% (RD$ {profit.toLocaleString("es-DO")})
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-4 border-t border-neutral-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">
              Crear Combo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
