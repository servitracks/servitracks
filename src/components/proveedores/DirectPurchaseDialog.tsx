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
import { Plus, Trash2, Package, CheckCircle2, TrendingUp, TrendingDown, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractInvoiceWithAI } from "@/lib/purchase-ai";

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

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
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
      notes: notes.trim() || `Compra directa / Ingreso a inventario (${paymentStatus === 'transfer' ? 'Transferencia' : paymentStatus === 'check' ? 'Cheque' : paymentStatus === 'paid' ? 'Efectivo' : 'A crédito'})`,
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
      <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Registrar Compra Directa
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* File Input for AI Scanner */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,application/pdf,.csv,.xlsx,.xls,.xml" 
            className="hidden" 
          />
          
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
          {isOwner ? (
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2 border border-blue-100">
              <span className="font-bold flex-shrink-0">Automático:</span>
              <span>Esta compra ingresará directamente los productos al inventario, actualizará los precios y generará la cuenta por pagar en tu contabilidad.</span>
            </div>
          ) : (
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2 border border-blue-100">
              <span className="font-bold flex-shrink-0">Automático:</span>
              <span>Esta compra ingresará directamente los productos al inventario.</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase text-neutral-400 tracking-wider">Productos Comprados</p>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs gap-1 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100" 
                  onClick={handleScanClick}
                  disabled={isScanning}
                >
                  {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {isScanning ? "Procesando..." : "Importar Factura"}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" /> Agregar Producto
                </Button>
              </div>
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
                {/* Column headers */}
                <div className={`grid gap-2 px-3 pb-1 ${isOwner ? 'grid-cols-[1fr_70px_95px_95px_50px_85px_32px]' : 'grid-cols-[1fr_80px_110px_100px_32px]'}`}>
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
                    <div key={item.id} className={`grid gap-2 items-center p-3 rounded-xl bg-neutral-50/80 border border-neutral-100 ${isOwner ? 'grid-cols-[1fr_70px_95px_95px_50px_85px_32px]' : 'grid-cols-[1fr_80px_110px_100px_32px]'}`}>
                      <div>
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
                      <div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="h-8 rounded-lg border-neutral-200 text-xs bg-white text-center"
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
                      <div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-8 rounded-lg border-neutral-200 text-xs bg-white"
                          placeholder="RD$"
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
                        {item.unitPrice > 0 && (
                          <p className="text-[9px] text-neutral-500 font-bold text-center mt-0.5">
                            c/ITBIS: {Math.round(item.unitPrice * (1 + supplierItbis / 100))}
                          </p>
                        )}
                      </div>
                      {isOwner && (
                        <div>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-8 rounded-lg border-emerald-200 text-xs bg-emerald-50/50 font-medium"
                            placeholder="RD$"
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
                          {item.salePrice > 0 && (
                            <p className="text-[9px] text-emerald-600 font-bold text-center mt-0.5">
                              c/ITBIS: {Math.round(item.salePrice * (1 + supplierItbis / 100))}
                            </p>
                          )}
                        </div>
                      )}
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
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-800">
                          RD$ {(item.quantity * item.unitPrice).toLocaleString("es-DO")}
                        </p>
                      </div>
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
                  <span>Total Factura</span>
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
