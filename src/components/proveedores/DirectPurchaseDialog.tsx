"use client";

import { useState, useRef } from "react";
import type { PurchaseOrder, PurchaseOrderItem, Supplier, AccountPayable, GoodsReceipt } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { Plus, Trash2, Package, CheckCircle2, TrendingUp, TrendingDown, Camera, Loader2, Receipt, Building2, Sparkles, FileText, CreditCard, Info } from "lucide-react";
import { toast } from "sonner";
import { extractInvoiceWithAI } from "@/lib/purchase-ai";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  isOwner?: boolean;
}

interface EditablePOItem extends PurchaseOrderItem {
  rawUnitPrice?: string;
  rawSalePrice?: string;
  rawQuantity?: string;
}

export const PAYMENT_CONDITIONS = [
  { value: "pending", label: "A Crédito (Pendiente)", dot: "bg-amber-500" },
  { value: "paid", label: "Pagado (Al Contado - Efectivo)", dot: "bg-emerald-500" },
  { value: "transfer", label: "Pagado (Transferencia Bancaria)", dot: "bg-blue-500" },
  { value: "check", label: "Pagado (Cheque)", dot: "bg-purple-500" },
] as const;

export default function DirectPurchaseDialog({ open, onOpenChange, tenantId, isOwner = true }: Props) {
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
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const selectedPayment = PAYMENT_CONDITIONS.find((opt) => opt.value === paymentStatus) || PAYMENT_CONDITIONS[0];
  const [items, setItems] = useState<EditablePOItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const supplierItbis = selectedSupplier?.itbis !== undefined ? selectedSupplier.itbis : 18;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round((subtotal * (supplierItbis / 100)) * 100) / 100;
  const total = subtotal + tax;

  // Proyección de venta
  const totalVentaEstimado = items.reduce((sum, item) => sum + item.quantity * item.salePrice, 0);
  const gananciaBruta = totalVentaEstimado - subtotal;
  const margenPromedio = subtotal > 0 ? Math.round((gananciaBruta / subtotal) * 100) : 0;

  const getMarginBadge = (cost: number, sale: number) => {
    if (cost <= 0 || sale <= 0) return null;
    const margin = Math.round(((sale - cost) / cost) * 100);
    if (margin >= 30) return { color: "text-emerald-700 bg-emerald-50 border-emerald-200", label: `${margin}%` };
    if (margin >= 15) return { color: "text-amber-700 bg-amber-50 border-amber-200", label: `${margin}%` };
    if (margin > 0) return { color: "text-rose-700 bg-rose-50 border-rose-200", label: `${margin}%` };
    return { color: "text-red-700 bg-red-50 border-red-200", label: `${margin}%` };
  };

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
        finalProductId = crypto.randomUUID();
        
        addProduct({
          id: finalProductId,
          tenantId,
          name: finalProductName,
          sku: `SKU-${generatedCode}`,
          barcode: generatedCode,
          category: "Otros",
          costPrice: item.unitPrice,
          salePrice: item.salePrice > 0 ? item.salePrice : Math.round(item.unitPrice * 1.3),
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

    const newPoId = crypto.randomUUID();

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
      notes: notes.trim() || `Compra directa / Ingreso a inventario (${paymentStatus === 'transfer' ? 'Transferencia Bancaria' : paymentStatus === 'check' ? 'Cheque' : paymentStatus === 'paid' ? 'Al Contado - Efectivo' : 'A Crédito'})`,
      createdBy: "current-user",
      createdAt: now,
      updatedAt: now,
    };
    addPurchaseOrder(newPO);

    // 2. Crear Recepción (Goods Receipt) para el historial
    const receipt: GoodsReceipt = {
      id: crypto.randomUUID(),
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
      const priceUpdates: { stock: number; costPrice: number; salePrice?: number } = {
        stock: currentStock + item.quantity,
        costPrice: item.unitPrice,
      };
      if (item.salePrice > 0) priceUpdates.salePrice = item.salePrice;
      updateProduct(item.productId, priceUpdates);
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
      id: crypto.randomUUID(),
      tenantId,
      supplierId,
      purchaseOrderId: newPoId,
      invoiceNumber: invoiceNumber,
      amount: total,
      paidAmount: paymentStatus !== 'pending' ? total : 0,
      dueDate: dueDate.toISOString(),
      status: paymentStatus !== 'pending' ? "pagada" : "pendiente",
      createdAt: now,
      notes: paymentStatus === 'transfer' ? 'Pago con Transferencia Bancaria' : paymentStatus === 'check' ? 'Pago con Cheque' : paymentStatus === 'paid' ? 'Pago en Efectivo (Al Contado)' : 'Compra a crédito',
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

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const processAI = async (file: File) => {
    try {
      let base64 = "";
      let mimeType = file.type;
      
      // Si es imagen, la comprimimos en el navegador para que suba 10x más rápido
      if (file.type.startsWith("image/")) {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let { width, height } = img;
              const MAX = 1200; // Reducimos a un máximo de 1200px
              if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
              else if (height > MAX) { width *= MAX / height; height = MAX; }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.6).split(",")[1]); // Calidad al 60%
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        mimeType = "image/jpeg";
      } else {
        // PDF o XML, lo leemos normal
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const extracted = await extractInvoiceWithAI(base64, mimeType, file.name);
        
        if (extracted.ncf) setInvoiceNumber(extracted.ncf);
        
        if (extracted.supplierName) {
          const matchedSupplier = suppliers.find(s => 
            s.commercialName.toLowerCase().includes(extracted.supplierName.toLowerCase()) || 
            extracted.supplierName.toLowerCase().includes(s.commercialName.toLowerCase())
          );
          if (matchedSupplier) setSupplierId(matchedSupplier.id);
        }

        const newItems = extracted.items.map((item, idx) => {
          const matchedProduct = products.find(p => p.name.toLowerCase() === item.productName.toLowerCase());
          return {
            id: `poi_${Date.now()}_${idx}`,
            productId: matchedProduct?.id || "",
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            salePrice: matchedProduct?.salePrice || Math.round(item.unitPrice * 1.3),
            receivedQuantity: item.quantity,
          };
        });

        setItems(newItems);
        toast.success("Factura importada con éxito", { id: "scan-toast" });
      } catch (error) {
        console.error(error);
        toast.error("Error al procesar el archivo con IA", { id: "scan-toast" });
      } finally {
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const processSpreadsheet = async (file: File) => {
    const parseNum = (val: unknown): number => {
      if (typeof val === "number") return isNaN(val) ? 0 : val;
      if (!val) return 0;
      let str = String(val).trim().replace(/[^0-9.,-]/g, "").trim();
      if (!str) return 0;
      const hasComma = str.includes(",");
      const hasDot = str.includes(".");
      if (hasComma && hasDot) {
        if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
          str = str.replace(/\./g, "").replace(",", ".");
        } else {
          str = str.replace(/,/g, "");
        }
      } else if (hasComma && !hasDot) {
        const parts = str.split(",");
        if (parts.length === 2 && parts[1].length <= 2) {
          str = str.replace(",", ".");
        } else {
          str = str.replace(/,/g, "");
        }
      }
      const n = parseFloat(str);
      return isNaN(n) ? 0 : n;
    };

    const formatRef = (val: unknown): string => {
      if (!val) return "";
      const s = String(val).trim();
      if (/^[0-9]+(\.[0-9]+)?e\+[0-9]+$/i.test(s)) {
        try {
          return BigInt(Math.round(Number(s))).toString();
        } catch {
          return s;
        }
      }
      return s;
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        
        let bestItems: any[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false }) as unknown[][];
          if (!rawRows || rawRows.length === 0) continue;

          let bestHeaderIndex = 0;
          let bestScore = -1;

          for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            const nonEmpty = row.filter(c => c !== undefined && c !== null && String(c).trim() !== "");
            if (nonEmpty.length <= 1) continue;

            const joined = row.map(c => String(c).toLowerCase().replace(/[^a-z0-9]/g, "")).join(" ");
            let score = 0;
            if (/nombre|descripcion|descripci[oó]n|producto|articulo|art[ií]culo|detalle|item/i.test(joined)) score += 4;
            if (/codigo|c[oó]digo|sku|cod|ref|referencia/i.test(joined)) score += 3;
            if (/inv|inventario|cantidad|cant|stock|existencia|qty/i.test(joined)) score += 3;
            if (/costo|cost/i.test(joined)) score += 3;
            if (/precio|price|pvp|venta/i.test(joined)) score += 3;

            if (score > bestScore) {
              bestScore = score;
              bestHeaderIndex = i;
            }
          }

          let sheetItems: any[] = [];

          if (bestScore >= 4) {
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: bestHeaderIndex, defval: "", raw: false }) as any[];
            sheetItems = jsonData.map((row, idx) => {
              const keys = Object.keys(row);
              const cleanMap = new Map<string, any>();
              for (const k of keys) {
                cleanMap.set(k.toLowerCase().replace(/[^a-z0-9]/g, ""), row[k]);
              }

              const getFld = (aliases: string[], exclusions: string[] = []) => {
                for (const a of aliases) {
                  const clean = a.toLowerCase().replace(/[^a-z0-9]/g, "");
                  if (cleanMap.has(clean)) {
                    const v = cleanMap.get(clean);
                    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
                  }
                }
                for (const a of aliases) {
                  const clean = a.toLowerCase().replace(/[^a-z0-9]/g, "");
                  if (clean.length < 3) continue;
                  for (const [k, v] of cleanMap.entries()) {
                    if (exclusions.some(ex => k.includes(ex))) continue;
                    if (k.includes(clean)) {
                      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
                    }
                  }
                }
                return undefined;
              };

              const productName = String(getFld(
                ["name", "nombre", "producto", "descripcion", "descripción", "articulo", "item"],
                ["codigo", "cod", "sku", "ref", "referencia", "costo", "precio", "total"]
              ) ?? "").trim();

              const explicitCode = String(getFld(["codigo", "código", "sku", "id"], ["barcode", "barra", "barras", "nombre"]) ?? "").trim();
              const explicitRef = formatRef(getFld(["referencia", "ref", "barcode", "codigobarras"]));
              const sku = explicitCode || explicitRef;

              const rawQty = getFld(["invtotal", "invtotal.", "inv total", "inventariototal", "cantidad", "quantity", "qty", "stock", "existencia", "cant"]);
              const quantity = parseNum(rawQty) || 1;

              const rawCost = getFld(["costo", "costPrice", "costounit", "costounitario", "preciocosto", "costodecosto"], ["itbis", "total"]);
              let unitPrice = parseNum(rawCost);
              const rawConItbis = getFld(["conitbis", "con_itbis", "conitbisunit"]);
              if (unitPrice === 0 && rawConItbis) {
                unitPrice = Math.round((parseNum(rawConItbis) / 1.18) * 100) / 100;
              }

              const rawSale = getFld(["precio", "salePrice", "precioventa", "preciodeventa", "pvp"], ["costo", "itbis", "total"]);
              let salePrice = parseNum(rawSale);

              const matchedProduct = products.find(p => 
                (sku && p.sku === sku) || 
                (p.name && productName && p.name.toLowerCase() === productName.toLowerCase())
              );

              return {
                id: `poi_${Date.now()}_${idx}`,
                productId: matchedProduct?.id || "",
                productName: productName,
                quantity: quantity,
                unitPrice: unitPrice > 0 ? unitPrice : (matchedProduct?.costPrice || 0),
                salePrice: salePrice > 0 ? salePrice : (matchedProduct?.salePrice || Math.round((unitPrice || 100) * 1.3)),
                receivedQuantity: quantity,
              };
            }).filter(item => item.productName.trim() !== "");
          }

          // Fallback positional if needed
          if (sheetItems.length === 0) {
            const dataRows = rawRows.slice(bestScore >= 0 ? bestHeaderIndex + 1 : 0);
            for (let i = 0; i < dataRows.length; i++) {
              const r = dataRows[i];
              if (!Array.isArray(r) || r.length < 2) continue;
              const col0 = String(r[0] ?? "").trim();
              const col1 = String(r[1] ?? "").trim();
              if (!col1 || col1.toLowerCase().includes("total") || col1.toLowerCase().includes("reporte")) continue;

              const productName = col1;
              const sku = col0 || formatRef(r[2]);
              const quantity = parseNum(r[3]) || 1;
              let unitPrice = parseNum(r[4]);
              const conItbis = parseNum(r[6]);
              if (unitPrice === 0 && conItbis > 0) unitPrice = Math.round((conItbis / 1.18) * 100) / 100;
              let salePrice = parseNum(r[8]);

              const matchedProduct = products.find(p => 
                (sku && p.sku === sku) || 
                (p.name && p.name.toLowerCase() === productName.toLowerCase())
              );

              sheetItems.push({
                id: `poi_pos_${Date.now()}_${i}`,
                productId: matchedProduct?.id || "",
                productName: productName,
                quantity: quantity,
                unitPrice: unitPrice > 0 ? unitPrice : (matchedProduct?.costPrice || 0),
                salePrice: salePrice > 0 ? salePrice : (matchedProduct?.salePrice || Math.round((unitPrice || 100) * 1.3)),
                receivedQuantity: quantity,
              });
            }
          }

          if (sheetItems.length > bestItems.length) {
            bestItems = sheetItems;
          }
        }

        if (bestItems.length > 0) {
          setItems(bestItems);
          toast.success(`Se importaron ${bestItems.length} productos del Excel`, { id: "scan-toast" });
        } else {
          toast.error("No se encontraron productos válidos en el Excel", { id: "scan-toast" });
        }
      } catch (err) {
        console.error(err);
        toast.error("Error al leer el archivo Excel", { id: "scan-toast" });
      } finally {
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo", { id: "scan-toast" });
      setIsScanning(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    toast.loading("Procesando factura...", { id: "scan-toast" });

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      processSpreadsheet(file);
    } else {
      // PDF, JPG, PNG, XML, WEBP go to AI
      processAI(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 pr-16 border-b border-neutral-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900 tracking-tight">
                Registrar Compra Directa
              </DialogTitle>
              <p className="text-xs text-neutral-500 font-normal mt-0.5">
                Entrada inmediata de productos al inventario y programación de pago
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-9 px-3.5 text-xs font-semibold rounded-xl border-purple-200 bg-purple-50/80 text-purple-700 hover:bg-purple-100 transition-all shadow-2xs gap-1.5" 
              onClick={handleScanClick}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              )}
              <span>{isScanning ? "Extrayendo factura..." : "Escanear con IA / Excel"}</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {/* File Input for AI Scanner */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,application/pdf,.csv,.xlsx,.xls,.xml" 
              className="hidden" 
            />

            {/* General Data Card */}
            <div className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                  Proveedor <span className="text-rose-500">*</span>
                </Label>
                <Select value={supplierId} onValueChange={(v) => setSupplierId(v || "")}>
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
                  <FileText className="h-3.5 w-3.5 text-neutral-400" />
                  NCF / Factura <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  className="h-10 rounded-xl border-neutral-200 bg-white uppercase font-mono font-semibold text-xs tracking-wider placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
                  placeholder="Ej: B0100001234"
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                  Condición de Pago
                </Label>
                <Select 
                  value={paymentStatus} 
                  onValueChange={(v: 'pending' | 'paid' | 'transfer' | 'check' | null) => {
                    if (v) setPaymentStatus(v);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white font-medium text-xs shadow-2xs hover:border-neutral-300">
                    <div className="flex items-center gap-2 truncate text-neutral-900 font-medium text-xs">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", selectedPayment.dot)} />
                      <span className="truncate">{selectedPayment.label}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-neutral-200">
                    {PAYMENT_CONDITIONS.map((opt) => (
                      <SelectItem 
                        key={opt.value} 
                        value={opt.value} 
                        className="text-xs py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", opt.dot)} />
                          <span className="font-medium text-neutral-900">{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Automation Banner */}
            <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-blue-950">Acción Automática:</span>{" "}
                <span className="text-blue-800">
                  {isOwner 
                    ? "Esta compra incrementará directamente el stock en inventario, actualizará los costos de reposición y generará la obligación en cuentas por pagar."
                    : "Esta compra ingresará directamente los productos con su cantidad física al inventario general."}
                </span>
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Artículos en Factura
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/80">
                    {items.length} {items.length === 1 ? "artículo" : "artículos"}
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
                  <p className="text-sm font-semibold text-neutral-700">Sin productos en la factura</p>
                  <p className="text-xs text-neutral-400 mt-0.5 max-w-sm mx-auto">
                    Usa el botón "Escanear con IA" para autocompletar desde una foto/PDF o agrégalos manualmente.
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
                            list={`products-list-${item.id}`}
                            className="h-9 w-full rounded-lg border border-neutral-200 text-xs px-2.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
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
                            RD$ {(item.quantity * item.unitPrice).toLocaleString("es-DO")}
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
                    Resumen Financiero de Factura
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
                      <span>Total Factura</span>
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
                        <span>Venta Total Estimada</span>
                        <span className="font-mono font-semibold text-neutral-900">
                          RD$ {totalVentaEstimado.toLocaleString("es-DO")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-600">
                        <span>Ganancia Bruta Proyectada</span>
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
              Confirmar y Registrar Compra
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

