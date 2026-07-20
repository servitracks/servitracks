"use client";

import { useState, useMemo } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore, Product } from "@/store/useStore";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Upload,
  X,
  TrendingUp,
  Edit,
  Trash2,
  Printer,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImportWizardModal from "@/components/inventory/ImportWizardModal";
import { ImportRow } from "@/components/inventory/StepPreviewEditor";
import QuoteRequestDialog from "@/components/inventory/QuoteRequestDialog";
import PrintLabelDialog from "@/components/inventory/PrintLabelDialog";
import ComboCreateDialog from "@/components/inventory/ComboCreateDialog";

const CATEGORIES = ["Lubricantes", "Filtros", "Frenos", "Suspensión", "Eléctrico", "Neumáticos", "Transmisión", "Otros"];

type ProductForm = {
  name: string; sku: string; barcode: string; category: string;
  brand: string; supplier: string; costPrice: string; salePrice: string;
  laborPrice: string;
  stock: string; minStock: string; tax: string; location: string;
  serviceIds: string[];
  vehicleMake: string; vehicleModel: string; vehicleYear: string;
  vehicleCompatibilities: { make: string; model: string; year: string }[];
  paymentMode: string;
};

const emptyForm: ProductForm = {
  name: "", sku: "", barcode: "", category: "",
  brand: "", supplier: "", costPrice: "", salePrice: "", laborPrice: "",
  stock: "0", minStock: "5", tax: "18", location: "",
  serviceIds: [],
  vehicleMake: "", vehicleModel: "", vehicleYear: "",
  vehicleCompatibilities: [],
  paymentMode: "pending",
};

interface ProductFieldsProps {
  form: ProductForm;
  setForm: (update: (prev: ProductForm) => ProductForm) => void;
  isEditOpen: boolean;
  services: { id: string; name: string; category?: string }[];
  suppliers: { id: string; commercialName: string }[];
}

const ProductFormFields = ({ form, setForm, isEditOpen, services, suppliers }: ProductFieldsProps) => {
  const serviceCategories = useMemo(() => {
    const cats: Record<string, typeof services> = {};
    services.forEach((s) => {
      const cat = s.category || "Otros";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(s);
    });
    return cats;
  }, [services]);

  const toggleService = (serviceId: string) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Product Name */}
      <div className="space-y-1.5">
        <Label>Nombre del Producto *</Label>
        <Input 
          placeholder="Ej: Aceite Castrol Magnatec" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.name} 
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
        />
      </div>

      {/* Tipo de Servicio — Multi-select */}
      <div className="space-y-1.5">
        <Label>Tipo de Servicio</Label>
        <Popover>
          <PopoverTrigger
              type="button"
              className="w-full h-10 rounded-xl border border-neutral-200 justify-between text-sm font-normal hover:bg-neutral-50 flex items-center px-3 bg-white"
            >
              <span className={cn("truncate", form.serviceIds.length === 0 && "text-neutral-400")}>
                {form.serviceIds.length === 0
                  ? "Vincular a servicios..."
                  : `${form.serviceIds.length} servicio${form.serviceIds.length > 1 ? "s" : ""} vinculado${form.serviceIds.length > 1 ? "s" : ""}`}
              </span>
              <Filter className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 rounded-xl shadow-xl border-neutral-100" align="start">
            <div className="max-h-64 overflow-y-auto p-3 space-y-3">
              {Object.entries(serviceCategories).map(([cat, svcs]) => (
                <div key={cat}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5 px-1">{cat}</p>
                  <div className="space-y-0.5">
                    {svcs.map((s) => {
                      const isSelected = form.serviceIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className={cn(
                            "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                            isSelected ? "bg-neutral-900 text-white" : "hover:bg-neutral-50 text-neutral-700"
                          )}
                        >
                          <div className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            isSelected ? "bg-white border-white" : "border-neutral-300"
                          )}>
                            {isSelected && <span className="text-black text-[10px] font-black">✓</span>}
                          </div>
                          <span className="truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {form.serviceIds.length > 0 && (
              <div className="border-t border-neutral-100 p-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, serviceIds: [] }))}
                  className="text-xs text-neutral-500 hover:text-red-500 font-medium px-2 py-1 w-full text-center transition-colors"
                >
                  Limpiar selección
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <Label>SKU</Label>
        <Input 
          placeholder="Automático si se deja vacío" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.sku} 
          onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Código de Barras</Label>
        <Input 
          placeholder="Automático si se deja vacío" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.barcode} 
          onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Categoría *</Label>
        <Select 
          value={form.category} 
          onValueChange={(v) => setForm((prev) => ({ ...prev, category: v || "" }))}
        >
          <SelectTrigger className="h-10 rounded-xl border-neutral-200">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Marca</Label>
        <Input 
          placeholder="Ej: Castrol" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.brand} 
          onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Precio Costo (RD$)</Label>
        <Input 
          type="number" 
          placeholder="0" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.costPrice} 
          onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Precio Venta (RD$)</Label>
        <Input 
          type="number" 
          placeholder="0" 
          className="h-10 rounded-xl border-neutral-200 font-bold"
          value={form.salePrice} 
          onChange={(e) => setForm((prev) => ({ ...prev, salePrice: e.target.value }))} 
        />
        {Number(form.salePrice) > 0 && (
          <p className="text-[11px] text-neutral-500 font-medium">
            Subtotal (sin ITBIS): <span className="font-bold text-emerald-600">RD$ {(Number(form.salePrice) / (1 + (Number(form.tax) || 18) / 100)).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Comisión Técnico (%)</Label>
        <Input 
          type="number" 
          placeholder="Ej: 25" 
          className="h-10 rounded-xl border-neutral-200 text-blue-600 bg-blue-50/50 font-bold"
          value={form.laborPrice} 
          onChange={(e) => setForm((prev) => ({ ...prev, laborPrice: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Stock {isEditOpen ? "Actual" : "Inicial"}</Label>
        <Input 
          type="number" 
          placeholder="0" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.stock} 
          onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))} 
          readOnly={isEditOpen} 
          disabled={isEditOpen} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Stock Mínimo</Label>
        <Input 
          type="number" 
          placeholder="5" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.minStock} 
          onChange={(e) => setForm((prev) => ({ ...prev, minStock: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Impuesto (ITBIS %)</Label>
        <Input 
          type="number" 
          placeholder="18" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.tax} 
          onChange={(e) => setForm((prev) => ({ ...prev, tax: e.target.value }))} 
        />
      </div>
      <div className="space-y-1.5">
        <Label>Proveedor *</Label>
        <Select 
          value={form.supplier || undefined} 
          onValueChange={(v) => setForm((prev) => ({ ...prev, supplier: v || "" }))}
          items={suppliers.map(s => ({ value: s.commercialName, label: s.commercialName }))}
        >
          <SelectTrigger className="h-10 rounded-xl border-neutral-200">
            <SelectValue placeholder="Seleccionar proveedor" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {suppliers.map(s => (
              <SelectItem key={s.id} value={s.commercialName}>{s.commercialName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isEditOpen && (
        <div className="space-y-1.5">
          <Label>Modo de Pago (Stock Inicial) *</Label>
          <Select 
            value={form.paymentMode} 
            onValueChange={(v) => setForm((prev) => ({ ...prev, paymentMode: v || "pending" }))}
          >
            <SelectTrigger className="h-10 rounded-xl border-neutral-200">
              <SelectValue placeholder="Seleccionar modo de pago" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="pending">A Crédito (Pendiente)</SelectItem>
              <SelectItem value="paid">Efectivo</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="check">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Ubicación en Almacén</Label>
        <Input 
          placeholder="Ej: Estante A-3" 
          className="h-10 rounded-xl border-neutral-200"
          value={form.location} 
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} 
        />
      </div>

      <div className="col-span-2 mt-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-neutral-900 text-sm">Compatibilidades de Vehículo</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs flex items-center gap-1 px-2 border-neutral-200"
            onClick={() => setForm(p => ({
              ...p,
              vehicleCompatibilities: [...(p.vehicleCompatibilities || []), { make: "", model: "", year: "" }]
            }))}
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        </div>
        
        {(!form.vehicleCompatibilities || form.vehicleCompatibilities.length === 0) && (
          <div className="text-center p-4 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
            <p className="text-xs text-neutral-500">Ninguna compatibilidad agregada.</p>
          </div>
        )}

        {form.vehicleCompatibilities?.map((compat, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 items-end bg-neutral-50 p-3 rounded-xl border border-neutral-100">
            <div className="space-y-1.5">
              <Label className="text-xs">Marca</Label>
              <Input 
                placeholder="Ej: Toyota" 
                className="h-9 text-sm rounded-lg border-neutral-200 bg-white" 
                value={compat.make} 
                onChange={(e) => {
                  const newCompats = [...form.vehicleCompatibilities];
                  newCompats[index].make = e.target.value;
                  setForm(p => ({ ...p, vehicleCompatibilities: newCompats }));
                }} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo</Label>
              <Input 
                placeholder="Ej: Corolla" 
                className="h-9 text-sm rounded-lg border-neutral-200 bg-white" 
                value={compat.model} 
                onChange={(e) => {
                  const newCompats = [...form.vehicleCompatibilities];
                  newCompats[index].model = e.target.value;
                  setForm(p => ({ ...p, vehicleCompatibilities: newCompats }));
                }} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Año</Label>
              <Input 
                placeholder="Ej: 2010-2015" 
                className="h-9 text-sm rounded-lg border-neutral-200 bg-white" 
                value={compat.year} 
                onChange={(e) => {
                  const newCompats = [...form.vehicleCompatibilities];
                  newCompats[index].year = e.target.value;
                  setForm(p => ({ ...p, vehicleCompatibilities: newCompats }));
                }} 
              />
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  const newCompats = form.vehicleCompatibilities.filter((_, i) => i !== index);
                  setForm(p => ({ ...p, vehicleCompatibilities: newCompats }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InventoryPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser = currentUserId === 'admin' 
    ? { role: 'owner' } 
    : users.find((u) => u.id === currentUserId);
  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const activeRole = simulatedRole || currentUser?.role || 'receptionist';
  const isOwner = activeRole === 'owner';

  const { addProduct, updateProduct, deleteProduct, addMovement, addAccountPayable, updatePurchaseOrder, addPurchaseOrder, deletePurchaseOrder } = useStore();
  const allProducts = useStore((s) => s.products);
  const allPurchaseOrders = useStore((s) => s.purchaseOrders) || [];
  const purchaseOrders = tenantId ? allPurchaseOrders.filter((po) => po.tenantId === tenantId) : [];
  const products = tenantId ? allProducts.filter((p) => p.tenantId === tenantId) : [];

  const allServices = useStore((s) => s.services);
  const services = tenantId ? allServices.filter((s) => s.tenantId === tenantId) : [];

  const allMovements = useStore((s) => s.movements);
  const movements = tenantId ? allMovements.filter((m) => m.tenantId === tenantId) : [];

  const allSuppliers = useStore((s) => s.suppliers);
  const suppliers = tenantId ? allSuppliers.filter((s) => s.tenantId === tenantId && (s.status as any) !== "inactivo") : [];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateComboOpen, setIsCreateComboOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState(false);
  const [isPoPreviewOpen, setIsPoPreviewOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"in" | "out" | "adjustment">("in");
  const [adjustReason, setAdjustReason] = useState("");

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.vehicleMake || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.vehicleModel || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.vehicleYear || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "Todos" || (p.category || "").trim() === categoryFilter;
    return matchSearch && matchCat && !p.isCombo;
  });

  const filteredCombos = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.vehicleMake || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.vehicleModel || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.vehicleYear || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "Todos" || (p.category || "").trim() === categoryFilter;
    return matchSearch && matchCat && p.isCombo;
  });

  const totalValue = products.reduce((acc, p) => acc + p.salePrice * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.supplier) {
      toast.error("El nombre, categoría y proveedor son obligatorios");
      return;
    }
    // Auto-generación de SKU y Código de barras si no se proveen
    const sequentialId = products.length + 1;
    const generatedCode = `STK${String(sequentialId).padStart(7, '0')}`;
    
    const finalSku = form.sku.trim() || `SKU-${generatedCode}`;
    const finalBarcode = form.barcode.trim() || generatedCode;

    const newProduct: Product = {
      id: `p${Date.now()}`,
      tenantId: tenantId,
      name: form.name,
      sku: finalSku,
      barcode: finalBarcode,
      category: form.category,
      brand: form.brand || undefined,
      costPrice: Number(form.costPrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      laborPrice: Number(form.laborPrice) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
      tax: Number(form.tax) || 18,
      location: form.location,
      supplier: form.supplier,
      serviceIds: form.serviceIds.length > 0 ? form.serviceIds : undefined,
      vehicleMake: form.vehicleCompatibilities?.[0]?.make || "",
      vehicleModel: form.vehicleCompatibilities?.[0]?.model || "",
      vehicleYear: form.vehicleCompatibilities?.[0]?.year || "",
      vehicleCompatibilities: form.vehicleCompatibilities.length > 0 ? form.vehicleCompatibilities : undefined,
    };
    addProduct(newProduct);

    if (Number(form.stock) > 0) {
      addMovement({
        id: `m${Date.now()}`,
        tenantId: tenantId,
        productId: newProduct.id,
        productName: newProduct.name,
        type: "in",
        quantity: Number(form.stock),
        reason: "Stock inicial",
        date: new Date().toISOString(),
      });

      // Crear Cuenta por Pagar para el stock inicial
      const selectedSupplier = suppliers.find(s => s.commercialName === form.supplier);
      const supplierId = selectedSupplier?.id || `sup_${Date.now()}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (selectedSupplier?.creditDays || 30));

      const totalCost = Number(form.costPrice) * Number(form.stock);
      const totalTax = Math.round(totalCost * (Number(form.tax) / 100));
      const totalAmount = totalCost + totalTax;

      addAccountPayable({
        id: `ap_${Date.now()}`,
        tenantId,
        supplierId,
        invoiceNumber: `STOCK-INIC-${newProduct.sku}`,
        amount: totalAmount,
        paidAmount: form.paymentMode !== 'pending' ? totalAmount : 0,
        dueDate: dueDate.toISOString(),
        status: form.paymentMode !== 'pending' ? "pagada" : "pendiente",
        createdAt: new Date().toISOString(),
        notes: `Stock inicial del producto "${newProduct.name}" (${form.paymentMode === 'transfer' ? 'Transferencia' : form.paymentMode === 'check' ? 'Cheque' : form.paymentMode === 'paid' ? 'Efectivo' : 'Crédito'})`,
      });
    }

    toast.success("Producto creado correctamente");
    setIsCreateOpen(false);
    setForm(emptyForm);
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setForm(() => ({
      name: product.name, sku: product.sku, barcode: product.barcode || "",
      category: product.category, brand: product.brand || "",
      supplier: product.supplier || "", costPrice: String(product.costPrice),
      salePrice: String(product.salePrice), laborPrice: String(product.laborPrice || ""), 
      stock: String(product.stock),
      minStock: String(product.minStock), tax: String(product.tax),
      location: product.location || "",
      serviceIds: product.serviceIds || [],
      vehicleMake: product.vehicleMake || "",
      vehicleModel: product.vehicleModel || "",
      vehicleYear: product.vehicleYear || "",
      vehicleCompatibilities: product.vehicleCompatibilities || (product.vehicleMake ? [{ make: product.vehicleMake, model: product.vehicleModel || "", year: product.vehicleYear || "" }] : []),
      paymentMode: "pending",
    }));
    setIsEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!form.name || !form.category || !form.supplier) {
      toast.error("El nombre, categoría y proveedor son obligatorios");
      return;
    }
    updateProduct(selectedProduct.id, {
      name: form.name, sku: form.sku, barcode: form.barcode,
      category: form.category, brand: form.brand, supplier: form.supplier,
      costPrice: Number(form.costPrice) || 0, salePrice: Number(form.salePrice) || 0,
      laborPrice: Number(form.laborPrice) || 0,
      minStock: Number(form.minStock) || 0, tax: Number(form.tax) || 18, location: form.location,
      serviceIds: form.serviceIds.length > 0 ? form.serviceIds : undefined,
      vehicleMake: form.vehicleCompatibilities?.[0]?.make || "",
      vehicleModel: form.vehicleCompatibilities?.[0]?.model || "",
      vehicleYear: form.vehicleCompatibilities?.[0]?.year || "",
      vehicleCompatibilities: form.vehicleCompatibilities.length > 0 ? form.vehicleCompatibilities : undefined,
    });
    toast.success("Producto actualizado");
    setIsEditOpen(false);
  };

  const openAdjust = (product: Product) => {
    setSelectedProduct(product);
    setAdjustQty("");
    setAdjustReason("");
    setAdjustType("in");
    setIsAdjustOpen(true);
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || !adjustReason) {
      toast.error("Completa todos los campos");
      return;
    }
    const qty = Number(adjustQty);
    const currentStock = selectedProduct.stock;
    let newStock = currentStock;
    if (adjustType === "in") newStock = currentStock + qty;
    else if (adjustType === "out") newStock = Math.max(0, currentStock - qty);
    else newStock = qty;

    updateProduct(selectedProduct.id, { stock: newStock });
    addMovement({
      id: `m${Date.now()}`,
      tenantId: tenantId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type: adjustType,
      quantity: qty,
      reason: adjustReason,
      date: new Date().toISOString(),
    });
    toast.success(adjustType === "in" ? `+${qty} unidades agregadas` : `Stock ajustado a ${newStock}`);
    setIsAdjustOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    deleteProduct(id);
    toast.success(`"${name}" eliminado del inventario`);
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.error("No hay productos para exportar");
      return;
    }
    const headers = ["Nombre", "SKU", "Marca", "Categoría", "Proveedor", "Precio Costo", "Precio Venta", "Stock", "Stock Mínimo", "ITBIS %", "Ubicación"];
    const rows = products.map((p) => [
      p.name, p.sku, p.brand || "", p.category, p.supplier || "",
      p.costPrice, p.salePrice, p.stock, p.minStock, p.tax, p.location || "",
    ]);
    const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${products.length} productos exportados`);
  };

  const handleImport = (rows: ImportRow[], supplierId?: string, invoiceNumber?: string) => {
    let imported = 0;
    let totalPurchaseCost = 0;
    let totalPurchaseTax = 0;
    
    // Preparar items para la orden de compra
    const purchaseOrderItems: any[] = [];
    rows.forEach((row) => {
      if (!row.name.trim()) return;
      
      const existingProduct = products.find(p => 
        (row.sku && p.sku === row.sku) || 
        p.name.toLowerCase() === row.name.trim().toLowerCase()
      );
      
      let productId = "";
      let productName = row.name.trim();

      if (existingProduct) {
        productId = existingProduct.id;
        productName = existingProduct.name;
        updateProduct(existingProduct.id, {
          stock: existingProduct.stock + (Number(row.quantity) || 0),
          costPrice: row.costPrice > 0 ? row.costPrice : existingProduct.costPrice,
          salePrice: row.salePrice > 0 ? row.salePrice : existingProduct.salePrice,
        });
      } else {
        const newProduct: Product = {
          id: `p${Date.now()}-${imported}`,
          tenantId: tenantId,
          name: row.name.trim(),
          sku: row.sku || `SKU-${Date.now()}-${imported}`,
          barcode: "",
          category: row.category || "Otros",
          brand: row.brand || "",
          supplier: supplierId ? suppliers.find(s => s.id === supplierId)?.commercialName || row.supplier : row.supplier || "",
          costPrice: row.costPrice || 0,
          salePrice: row.salePrice || 0,
          stock: (Number(row.stock) || 0) + (Number(row.quantity) || 0),
          minStock: row.minStock || 5,
          tax: row.tax || 18,
          location: row.location || "",
        };
        productId = newProduct.id;
        addProduct(newProduct);
      }
      
      if (row.quantity > 0) {
        const itemCost = Number(row.costPrice) || 0;
        const itemQty = Number(row.quantity);
        const itemTaxPct = Number(row.tax) || 18;
        
        const lineTotalCost = itemCost * itemQty;
        const lineTax = Math.round(lineTotalCost * (itemTaxPct / 100));
        
        totalPurchaseCost += lineTotalCost;
        totalPurchaseTax += lineTax;
        addMovement({
          id: `m${Date.now()}-${imported}`,
          tenantId: tenantId,
          productId: productId,
          productName: productName,
          type: "in",
          quantity: row.quantity,
          reason: "Importación de compra",
          date: new Date().toISOString(),
        });
        
        purchaseOrderItems.push({
          id: `po_item_${Date.now()}-${imported}`,
          productId: productId,
          productName: productName,
          quantity: itemQty,
          unitPrice: itemCost,
          salePrice: row.salePrice || 0,
          receivedQuantity: itemQty
        });
      }
      imported++;
    });

    if (supplierId && totalPurchaseCost > 0) {
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (selectedSupplier?.creditDays || 30));

      addAccountPayable({
        id: `ap_${Date.now()}`,
        tenantId,
        supplierId,
        invoiceNumber: invoiceNumber?.trim() || `IMPORT-${Date.now().toString().slice(-6)}`,
        amount: totalPurchaseCost + totalPurchaseTax,
        paidAmount: 0,
        dueDate: dueDate.toISOString(),
        status: "pendiente",
        createdAt: new Date().toISOString(),
        notes: `Importación masiva de ${imported} productos.`,
      });

      addPurchaseOrder({
        id: `po_${Date.now()}`,
        tenantId,
        supplierId,
        number: `OC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNumber: invoiceNumber?.trim() || `IMPORT-${Date.now().toString().slice(-6)}`,
        paymentStatus: "pending",
        status: "recibida_completa",
        items: purchaseOrderItems,
        subtotal: totalPurchaseCost,
        tax: totalPurchaseTax,
        total: totalPurchaseCost + totalPurchaseTax,
        notes: `Generada automáticamente por importación de inventario.`,
        createdBy: currentUserId || "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expectedDelivery: new Date().toISOString(),
      });
    }

    toast.success(`✓ ${imported} producto${imported !== 1 ? "s" : ""} importado${imported !== 1 ? "s" : ""} al inventario`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Inventario</h1>
          <p className="text-neutral-500">Gestiona tus productos, repuestos y suministros.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden rounded-lg md:flex gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" className="hidden rounded-lg md:flex gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 outline-none transition-colors">
              <Plus className="h-4 w-4" /> Nuevo
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-48">
              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}>
                <Package className="h-4 w-4" /> Producto Individual
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => setIsCreateComboOpen(true)}>
                <Layers className="h-4 w-4" /> Combo / Paquete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Productos", value: products.length, icon: Package, color: "text-neutral-700", bg: "bg-neutral-50", show: true },
          { label: "Stock Bajo", value: lowStockCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", show: true },
          { label: "Sin Stock", value: outOfStockCount, icon: X, color: "text-rose-600", bg: "bg-rose-50", show: true },
          { label: "Valor Total", value: `RD$ ${totalValue.toLocaleString("es-DO")}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", show: isOwner },
        ].filter(kpi => kpi.show).map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">{kpi.label}</p>
                <p className="text-xl font-black text-neutral-900">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs: Productos / Movimientos */}
      <Tabs defaultValue="products">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-neutral-100 rounded-xl p-1">
            <TabsTrigger value="products" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Productos</TabsTrigger>
            <TabsTrigger value="combos" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Combos / Paquetes</TabsTrigger>
            <TabsTrigger value="movements" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Movimientos</TabsTrigger>
            <TabsTrigger value="pedidos" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-blue-600 data-[state=active]:text-blue-700">Pedidos (Auto)</TabsTrigger>
          </TabsList>
          {/* Search + filter */}
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input placeholder="Buscar producto, SKU, marca..." className="rounded-full border-neutral-200 bg-white pl-10 h-9"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || "Todos")}>
              <SelectTrigger className="w-36 h-9 rounded-full border-neutral-200 bg-white">
                <Filter className="h-3.5 w-3.5 mr-1 text-neutral-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Todos">Todos</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="products" className="mt-4">
          <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow>
                  <TableHead className="w-[280px]">Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio Venta</TableHead>
                  <TableHead>Stock</TableHead>
                  {isOwner && <TableHead>Margen</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-neutral-400">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.map((product) => {
                  const margin = product.costPrice > 0
                    ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100)
                    : 0;
                  return (
                    <TableRow key={product.id} className="group hover:bg-neutral-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 text-sm">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-neutral-400 font-mono">{product.sku}</p>
                              {product.vehicleCompatibilities && product.vehicleCompatibilities.length > 0 ? (
                                <>
                                  {product.vehicleCompatibilities.slice(0, 2).map((c, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-neutral-50 text-neutral-500 border-neutral-200">
                                      {[c.make, c.model, c.year].filter(Boolean).join(" ")}
                                    </Badge>
                                  ))}
                                  {product.vehicleCompatibilities.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-neutral-50 text-neutral-500 border-neutral-200">
                                      +{product.vehicleCompatibilities.length - 2} más
                                    </Badge>
                                  )}
                                </>
                              ) : (product.vehicleMake || product.vehicleModel || product.vehicleYear) ? (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-neutral-50 text-neutral-500 border-neutral-200">
                                  {[product.vehicleMake, product.vehicleModel, product.vehicleYear].filter(Boolean).join(" ")}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-600 border-none text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        RD$ {product.salePrice.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="block text-[10px] font-normal text-neutral-400 mt-0.5">Base: RD$ {(product.salePrice / (1 + (product.tax || 18) / 100)).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className={cn("font-bold text-sm", product.stock <= 0 ? "text-rose-600" : product.stock <= product.minStock ? "text-amber-600" : "text-neutral-900")}>
                            {product.stock}
                          </span>
                          <span className="text-neutral-400 text-xs"> / mín {product.minStock}</span>
                        </div>
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <span className="text-sm font-semibold text-emerald-600">{margin}%</span>
                        </TableCell>
                      )}
                      <TableCell>
                        {product.stock <= 0 ? (
                          <Badge className="bg-rose-100 text-rose-700 border-none text-xs">Agotado</Badge>
                        ) : product.stock <= product.minStock ? (
                          <Badge className="bg-amber-100 text-amber-700 border-none text-xs">Stock Bajo</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Disponible</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 outline-none transition-colors">
                            <MoreVertical className="h-4 w-4 text-neutral-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-44">
                            <div className="px-2 pb-1 pt-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">OPCIONES</div>
                            {isOwner && (
                              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => openEdit(product)}>
                                <Edit className="h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => openAdjust(product)}>
                              <ArrowUpDown className="h-4 w-4" /> Ajustar Stock
                            </DropdownMenuItem>
                            {product.stock <= 0 && (
                              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2 text-blue-600 focus:text-blue-600" onClick={() => { setSelectedProduct(product); setIsQuoteOpen(true); }}>
                                <TrendingUp className="h-4 w-4" /> Solicitar Cotización
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => { setSelectedProduct(product); setIsPrintLabelOpen(true); }}>
                              <Printer className="h-4 w-4" /> Imprimir Etiqueta
                            </DropdownMenuItem>
                            {isOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="rounded-lg py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
                                  onClick={() => handleDelete(product.id, product.name)}>
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Combos Tab Content */}
        <TabsContent value="combos" className="mt-4">
          <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow>
                  <TableHead className="w-[300px]">Combo / Paquete</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Costo Real</TableHead>
                  <TableHead>Precio Venta</TableHead>
                  <TableHead>Stock Posible</TableHead>
                  {isOwner && <TableHead>Margen</TableHead>}
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCombos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-neutral-400">
                      No se encontraron combos o paquetes. Crea uno usando el botón "Nuevo".
                    </TableCell>
                  </TableRow>
                ) : filteredCombos.map((combo) => {
                  const margin = combo.costPrice > 0
                    ? Math.round(((combo.salePrice - combo.costPrice) / combo.salePrice) * 100)
                    : 0;
                  return (
                    <TableRow key={combo.id} className="group hover:bg-neutral-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600 transition-colors">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 text-sm">{combo.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-neutral-400 font-mono">{combo.sku}</p>
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-neutral-50 text-neutral-500 border-neutral-200">
                                {combo.comboItems?.length || 0} artículos
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-600 border-none text-xs">
                          {combo.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">RD$ {combo.costPrice.toLocaleString("es-DO")}</TableCell>
                      <TableCell className="font-semibold text-sm">RD$ {combo.salePrice.toLocaleString("es-DO")}</TableCell>
                      <TableCell>
                        <span className={cn("font-bold text-sm", combo.stock <= 0 ? "text-rose-600" : "text-emerald-600")}>
                          {combo.stock} <span className="text-xs font-normal opacity-70">disponibles</span>
                        </span>
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <span className="text-sm font-semibold text-emerald-600">{margin}%</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 outline-none transition-colors">
                            <MoreVertical className="h-4 w-4 text-neutral-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-44">
                            <div className="px-2 pb-1 pt-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">OPCIONES</div>
                            {isOwner && (
                              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2 text-rose-600 focus:text-rose-600" onClick={() => handleDelete(combo.id, combo.name)}>
                                <Trash2 className="h-4 w-4" /> Eliminar Combo
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-neutral-400">Sin movimientos registrados.</TableCell></TableRow>
                ) : [...movements].reverse().map((m) => (
                  <TableRow key={m.id} className="hover:bg-neutral-50/50">
                    <TableCell className="font-medium text-sm">{m.productName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {m.type === "in" ? <ArrowUp className="h-3.5 w-3.5 text-emerald-500" /> : m.type === "out" ? <ArrowDown className="h-3.5 w-3.5 text-rose-500" /> : <ArrowUpDown className="h-3.5 w-3.5 text-blue-500" />}
                        <span className={cn("text-xs font-semibold", m.type === "in" ? "text-emerald-600" : m.type === "out" ? "text-rose-600" : "text-blue-600")}>
                          {m.type === "in" ? "Entrada" : m.type === "out" ? "Salida" : "Ajuste"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{m.quantity}</TableCell>
                    <TableCell className="text-sm text-neutral-600">{m.reason}</TableCell>
                    <TableCell className="text-xs text-neutral-400">{new Date(m.date).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="pedidos" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {purchaseOrders.length === 0 ? (
              <div className="col-span-3 text-center p-8 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-neutral-100 mb-3">
                  <Package className="h-5 w-5 text-neutral-400" />
                </div>
                <p className="text-neutral-900 font-bold">No hay pedidos registrados</p>
                <p className="text-sm text-neutral-500 mt-1 max-w-sm">Los borradores se generarán aquí automáticamente cuando el stock de un producto baje del mínimo establecido.</p>
              </div>
            ) : purchaseOrders.map((po) => (
              <Card key={po.id} className="border-neutral-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-neutral-900 truncate max-w-[150px]" title={po.supplierId || 'Suplidor Desconocido'}>
                      {po.supplierId || 'Suplidor Desconocido'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{new Date(po.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border",
                    po.status === 'borrador' ? "bg-amber-50 text-amber-600 border-amber-200" :
                    po.status === 'enviada' ? "bg-blue-50 text-blue-600 border-blue-200" :
                    "bg-emerald-50 text-emerald-600 border-emerald-200"
                  )}>
                    {po.status === 'borrador' ? 'Borrador' : po.status === 'enviada' ? 'Enviado' : 'Recibido'}
                  </Badge>
                </div>
                <div className="p-4 flex-1">
                  <p className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wider">
                    {po.items.length} producto{po.items.length !== 1 && 's'}
                  </p>
                  <div className="space-y-2.5 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {po.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700 truncate pr-2 flex-1 text-xs">{item.productName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 text-xs">{item.quantity} unid.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-neutral-500 font-medium">Total Estimado</p>
                    <p className="text-sm font-black text-neutral-900">
                      RD$ {po.total.toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" className="rounded-lg bg-black text-white hover:bg-neutral-800 transition-colors h-8 text-xs" onClick={() => {
                     setSelectedPo(po);
                     setIsPoPreviewOpen(true);
                  }}>
                    Revisar & Enviar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nuevo Producto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <ProductFormFields form={form} setForm={setForm} isEditOpen={false} services={services} suppliers={suppliers} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">Crear Producto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Producto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <ProductFormFields form={form} setForm={setForm} isEditOpen={true} services={services} suppliers={suppliers} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Ajuste de Stock</DialogTitle>
            {selectedProduct && <p className="text-sm text-neutral-500 font-medium">{selectedProduct.name} — Stock actual: <strong>{selectedProduct.stock}</strong></p>}
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de Movimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "in", label: "Entrada (+)", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { value: "out", label: "Salida (-)", color: "bg-rose-50 border-rose-200 text-rose-700" },
                  { value: "adjustment", label: "Ajuste (=)", color: "bg-blue-50 border-blue-200 text-blue-700" },
                ] as const).map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setAdjustType(opt.value)}
                    className={cn(
                      "py-2 px-1 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                      adjustType === opt.value ? opt.color + " ring-2 ring-offset-1 ring-neutral-900" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad</Label>
              <Input type="number" min="1" placeholder="0" className="h-10 rounded-xl border-neutral-200"
                value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input placeholder="Ej: Compra a proveedor, Venta, Pérdida..." className="h-10 rounded-xl border-neutral-200"
                value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
        </Dialog>

      {/* Import Wizard Modal */}
      <ImportWizardModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        suppliers={suppliers}
      />

      <QuoteRequestDialog
        open={isQuoteOpen}
        onOpenChange={(o) => { if (!o) setIsQuoteOpen(false); }}
        product={selectedProduct}
        tenantId={tenantId}
      />

      <PrintLabelDialog
        open={isPrintLabelOpen}
        onOpenChange={(o) => { if (!o) setIsPrintLabelOpen(false); }}
        product={selectedProduct}
      />

      <ComboCreateDialog
        open={isCreateComboOpen}
        onOpenChange={setIsCreateComboOpen}
        tenantId={tenantId}
      />

      {/* PO Preview Dialog */}
      <Dialog open={isPoPreviewOpen} onOpenChange={setIsPoPreviewOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden bg-white shadow-2xl">
          {selectedPo && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-neutral-100">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-neutral-800" />
                  Orden #{selectedPo.number || selectedPo.id.slice(-6).toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">
                  {selectedPo.supplierId || 'Suplidor Desconocido'} — Creada el {new Date(selectedPo.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-neutral-50/50">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right w-24">Cantidad</TableHead>
                      <TableHead className="text-right w-28">Precio Ref.</TableHead>
                      <TableHead className="text-right w-28">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            className="h-8 w-20 text-right ml-auto px-2"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              const newItems = [...selectedPo.items];
                              newItems[idx] = { ...newItems[idx], quantity: val };
                              const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * (curr.unitPrice || 0)), 0);
                              const updatedPo = { ...selectedPo, items: newItems, total: newTotal };
                              setSelectedPo(updatedPo);
                              updatePurchaseOrder(selectedPo.id, { items: newItems, total: newTotal });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right text-neutral-500 font-mono">
                          RD$ {(item.unitPrice || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-neutral-900">RD$ {((item.unitPrice || 0) * item.quantity).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              const newItems = selectedPo.items.filter((_: any, i: number) => i !== idx);
                              const newTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.quantity * (curr.unitPrice || 0)), 0);
                              const updatedPo = { ...selectedPo, items: newItems, total: newTotal };
                              setSelectedPo(updatedPo);
                              updatePurchaseOrder(selectedPo.id, { items: newItems, total: newTotal });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-5 sm:px-6 border-t border-neutral-100 bg-neutral-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <p className="text-[11px] uppercase font-bold tracking-wider text-neutral-500 mb-0.5">Total Estimado</p>
                  <p className="text-2xl font-black text-neutral-900 leading-none whitespace-nowrap">RD$ {selectedPo.total.toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      if (confirm("¿Estás seguro de que deseas cancelar este pedido?")) {
                        deletePurchaseOrder(selectedPo.id);
                        toast.success("Pedido cancelado correctamente.");
                        setIsPoPreviewOpen(false);
                      }
                    }}
                    className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-100 font-semibold px-4"
                  >
                    Cancelar Pedido
                  </Button>
                  <Button variant="outline" onClick={() => setIsPoPreviewOpen(false)} className="rounded-xl border-neutral-200 bg-white font-semibold shadow-sm">
                    Cerrar
                  </Button>
                  <Button 
                    onClick={() => {
                      updatePurchaseOrder(selectedPo.id, { status: 'enviada' });
                      toast.success("Orden marcada como enviada.");
                      
                      let msg = `*Orden de Compra #${selectedPo.number || selectedPo.id.slice(-6).toUpperCase()}* - ${currentTenant?.name || 'Taller'}\n\nHola, necesitamos solicitar los siguientes artículos:\n\n`;
                      selectedPo.items.forEach((item: any) => {
                        msg += `- ${item.quantity}x ${item.productName}\n`;
                      });
                      msg += `\nGracias. Quedamos a la espera.`;
                      
                      const supplier = suppliers.find(s => s.commercialName === selectedPo.supplierId || s.id === selectedPo.supplierId);
                      let phone = "";
                      if (supplier && supplier.contacts && supplier.contacts.length > 0) {
                        phone = supplier.contacts[0].whatsapp || supplier.contacts[0].phone || "";
                      }
                      
                      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                      window.open(url, '_blank');
                      setIsPoPreviewOpen(false);
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
                  >
                    Marcar & Enviar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
