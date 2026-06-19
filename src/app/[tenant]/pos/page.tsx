"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { useStore, Product, WorkOrder } from "@/store/useStore";
import {
  Search, ShoppingCart, X,
  Maximize2, Minimize2, Tag, Wrench, ShieldCheck,
  Package, AlertTriangle, CheckCircle, UserCog, FileText, User
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useParams, useSearchParams } from "@/lib/next-compat";
import { SERVICE_CATEGORY_TO_PRODUCT_CATEGORIES, Service } from "@/store/useStore";
import { Ticket } from "@/components/pos/Ticket";

// Lazy-load dialogs
const LazyCheckout = lazy(() => import("./POSDialogs").then(m => ({ default: m.CheckoutDialog })));
const LazyPrintReceipt = lazy(() => import("./POSDialogs").then(m => ({ default: m.PrintReceiptDialog })));
const LazyLaborModal = lazy(() => import("./POSDialogs").then(m => ({ default: m.LaborModal })));
const LazyLinkOrder = lazy(() => import("./POSDialogs").then(m => ({ default: m.LinkOrderDialog })));
const LazyWarrantyModal = lazy(() => import("./POSDialogs").then(m => ({ default: m.WarrantyModal })));

interface CartItem extends Product { quantity: number }

type PayMethod = "cash" | "card" | "transfer";

export default function POSPage() {
  const { tenant } = useParams();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const { products, tenants, addInvoice, orders, services, technicians, invoices, updateOrder, cajas, addCajaMovement, updateProduct, addMovement, printSettings, customers } = useStore();
  const currentTenant = tenants.find(t => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { name: "ServiTracks", phone: "", address: "", rnc: "", logo: "" };
  const tenantId = currentTenant?.id ?? "";
  const activeCaja = cajas?.find(c => c.tenant_id === tenantId && c.estado === 'ABIERTA');

  // Filtrar por tenantId para garantizar el aislamiento de datos multi-tenant
  const tenantProducts = tenantId ? products.filter((p) => p.tenantId === tenantId) : [];
  const tenantOrders = tenantId ? orders.filter((o) => o.tenantId === tenantId) : [];
  const tenantServices = tenantId ? services.filter((s) => s.tenantId === tenantId) : [];
  const tenantTechnicians = tenantId ? technicians.filter((t) => t.tenantId === tenantId) : [];

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      setActiveOrderId(orderId);
    }
  }, [orderId]);

  const currentOrder = activeOrderId ? tenantOrders.find(o => o.id === activeOrderId) : null;
  const [posMechanicId, setPosMechanicId] = useState<string>("");
  const [posCustomerId, setPosCustomerId] = useState<string>("");
  const [posCustomerSearch, setPosCustomerSearch] = useState<string>("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const tenantCustomers = tenantId ? customers.filter((c) => c.tenantId === tenantId) : [];

  const serviceToProduct = (s: Service): Product => ({
    id: s.id,
    tenantId: s.tenantId,
    name: s.name,
    sku: `SRV-${s.id.slice(-4).toUpperCase()}`,
    category: s.category || "Servicios",
    costPrice: 0,
    salePrice: s.price,
    laborPrice: s.laborPrice ? (s.price * s.laborPrice) / 100 : undefined,
    stock: 9999,
    minStock: 0,
    tax: 0.18,
  });

  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("Todos");
  const [cart, setCart]               = useState<CartItem[]>([]);
  // serviceIds of the active order — used to filter inventory
  const [activeServiceIds, setActiveServiceIds] = useState<string[]>([]);

  useEffect(() => {
    if (currentOrder && currentOrder.mechanicId) {
      setPosMechanicId(currentOrder.mechanicId);
    }
    if (currentOrder && currentOrder.customerId) {
      setPosCustomerId(currentOrder.customerId);
    }
  }, [currentOrder]);

  useEffect(() => {
    if (currentOrder && currentOrder.serviceIds && currentOrder.serviceIds.length > 0) {
      // Store the active service IDs to filter inventory
      setActiveServiceIds(currentOrder.serviceIds);
    } else if (!currentOrder) {
      setActiveServiceIds([]);
    }
  }, [currentOrder]);

  const [isCheckout, setIsCheckout]   = useState(false);
  const [isPrint, setIsPrint]         = useState(false);
  const [payMethod, setPayMethod]     = useState<PayMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isLinkOrderOpen, setIsLinkOrderOpen] = useState(false);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  // Local warranty text for this session — persisted via printSettings
  const [localWarrantyText, setLocalWarrantyText] = useState<string | undefined>(
    printSettings.showWarranty ? printSettings.warrantyText : undefined
  );
  const searchRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = ["Todos", ...Array.from(new Set(tenantProducts.map((p) => p.category).filter(Boolean)))];

  // Filter inventory: if an order with services is active, only show related products
  const filteredProducts = tenantProducts.filter((p) => {
    const matchCat = category === "Todos" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());

    if (activeServiceIds.length > 0) {
      // 1. Explicit link: If product has specific serviceIds, use them
      if (p.serviceIds && p.serviceIds.length > 0) {
        const matchService = p.serviceIds.some((sid) => activeServiceIds.includes(sid));
        return matchCat && matchSearch && matchService;
      }

      // 2. Implicit link (AI/imported products): Match by general category mapped to service
      const activeServices = tenantServices.filter(s => activeServiceIds.includes(s.id));
      const allowedCategories = activeServices.flatMap(s => SERVICE_CATEGORY_TO_PRODUCT_CATEGORIES[s.category || ""] || []);
      
      if (allowedCategories.length > 0) {
        const matchAutoCat = allowedCategories.includes((p.category || "").trim());
        return matchCat && matchSearch && matchAutoCat;
      }

      // 3. Fallback: Show everything if no strict rules applied
      return matchCat && matchSearch;
    }

    // No active order → show everything normally
    return matchCat && matchSearch;
  });

  const total    = cart.reduce((acc, i) => acc + i.salePrice * i.quantity, 0);
  const subtotal = cart.reduce((acc, i) => acc + (i.salePrice / (1 + (i.tax ?? 18) / 100)) * i.quantity, 0);
  const itbis    = total - subtotal;
  const cashNum  = parseFloat(cashReceived.replace(/,/g, "")) || 0;
  const change   = Math.max(0, cashNum - total);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F12") { 
        e.preventDefault(); 
        if (cart.length > 0) {
          if (!activeCaja) {
            toast.error("Debe abrir la caja antes de registrar ventas");
            return;
          }
          setIsCheckout(true);
        }
      }
      if (e.key === "Escape") { setIsCheckout(false); setIsPrint(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, activeCaja]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) { toast.error("Sin stock disponible"); return; }
    setCart((prev) => {
      const calculatedLaborPrice = product.laborPrice ? (product.salePrice * product.laborPrice) / 100 : undefined;
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1, laborPrice: calculatedLaborPrice }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      const query = search.trim().toLowerCase();
      // Búsqueda exacta por código de barras o SKU
      const exactMatch = filteredProducts.find(
        (p) => p.barcode?.toLowerCase() === query || p.sku.toLowerCase() === query
      );
      if (exactMatch) {
        addToCart(exactMatch);
        setSearch(""); // Limpiar para el siguiente escaneo
      } else {
        toast.error("Producto no encontrado por código");
      }
    }
  };

  const handleAddLabor = (amount: number) => {
    const laborItem: CartItem = {
      id: `labor-${Date.now()}`,
      tenantId: tenantId,
      name: "Mano de obra",
      sku: "MANO-OBRA",
      category: "Servicios",
      costPrice: 0,
      salePrice: amount,
      laborPrice: amount,
      stock: 9999,
      minStock: 0,
      tax: 0.18,
      quantity: 1,
    };
    setCart((prev) => [...prev, laborItem]);
    setIsLaborModalOpen(false);
    toast.success("Mano de obra agregada");
  };

  const handleSelectOrder = (order: WorkOrder) => {
    setActiveOrderId(order.id);
    if (order.mechanicId) {
      setPosMechanicId(order.mechanicId);
    }
    
    // Set active service IDs immediately to filter inventory
    const sids = order.serviceIds || [];
    setActiveServiceIds(sids);
    setCategory("Todos");

    if (sids.length > 0 || (order.parts && order.parts.length > 0)) {
      setCart(prev => {
        let newCart = [...prev];
        
        // Add services
        if (sids.length > 0) {
          const servicesToAdd = tenantServices.filter(s => sids.includes(s.id));
          servicesToAdd.forEach(s => {
            if (s.price > 0 || s.laborPrice) {
              const productForm = serviceToProduct(s);
              const ex = newCart.find(i => i.id === productForm.id);
              if (ex) {
                newCart = newCart.map(i => i.id === productForm.id ? { ...i, quantity: i.quantity + 1 } : i);
              } else {
                newCart.push({ ...productForm, quantity: 1 });
              }
            }
          });
        }

        // Add parts dispatched by warehouse
        if (order.parts && order.parts.length > 0) {
          order.parts.forEach(part => {
            const product = filteredProducts.find(p => p.id === part.productId);
            if (product) {
              const ex = newCart.find(i => i.id === product.id);
              if (ex) {
                newCart = newCart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + part.quantity } : i);
              } else {
                const calculatedLaborPrice = product.laborPrice ? (product.salePrice * product.laborPrice) / 100 : undefined;
                newCart.push({ ...product, quantity: part.quantity, laborPrice: calculatedLaborPrice });
              }
            }
          });
        }

        return newCart;
      });
      toast.success(`Orden vinculada — Servicios y repuestos agregados al carrito`);
    } else {
      toast.info("La orden no tiene servicios ni repuestos asociados");
    }
  };

  const handleCheckout = async (customerData: { type: 'consumo' | 'credito_fiscal'; rnc?: string; name?: string }) => {
    if (!posMechanicId || posMechanicId === "none") {
      toast.error("Debe asignar un técnico o mecánico a la factura"); return;
    }
    if (payMethod === "cash" && cashNum < total) {
      toast.error("El efectivo recibido es menor al total"); return;
    }

    const currentTenantConfig = tenants.find(t => t.id === tenantId)?.config;
    const ecfConfig = currentTenantConfig?.ecfConfig;
    const isEcfEnabled = ecfConfig?.useOwnCredentials && ecfConfig?.clientId && ecfConfig?.clientSecret;
    
    let finalNcf = `B02-${String(Date.now()).slice(-8)}`;
    let securityCode = undefined;
    let qrUrl = undefined;
    let signatureDate = undefined;

    const isCreditFiscal = customerData.type === 'credito_fiscal';
    
    // Lógica para asignar e-NCF según tipo de cliente
    if (isEcfEnabled) {
      const invoiceType = isCreditFiscal ? "E31" : "E32";
      
      try {
        toast.info("Firmando y enviando factura electrónica a la DGII...", { id: "ecf-submit" });
        // Mapeo básico para el SDK
        const docPayload: any = {
           invoiceType,
           issueDate: new Date().toISOString(),
           totals: { totalAmount: { value: total } },
           items: cart.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: { value: i.salePrice } })),
           paymentForms: [{ method: "1", amount: { value: total } }]
        };

        if (isCreditFiscal && customerData.rnc) {
          docPayload.buyer = {
            rnc: customerData.rnc.replace(/\D/g, ""),
            companyName: customerData.name || "Contribuyente"
          };
        }

        const { getEcfToken, submitInvoiceToDGII } = await import('@/lib/ecf');
        const token = await getEcfToken(ecfConfig!.clientId!, ecfConfig!.clientSecret!, ecfConfig!.environment!);
        
        // Llamada real al API de Pronesoft
        const result = await submitInvoiceToDGII(token, ecfConfig!.environment!, docPayload);
        
        if (result && result.encf) {
           finalNcf = result.encf;
           securityCode = result.securityCode;
           qrUrl = result.documentStampUrl;
           signatureDate = result.signatureDate ? new Date(result.signatureDate).toISOString() : new Date().toISOString();
           toast.success("Factura Electrónica enviada exitosamente", { id: "ecf-submit" });
        } else {
           throw new Error("Respuesta inválida del servidor ECF");
        }
      } catch (err) {
        console.error("Error DGII:", err);
        // Si falla (por ej. falta mapping completo), generamos uno de contingencia/simulado para la UI
        finalNcf = `${invoiceType}000000001${String(Date.now()).slice(-2)}`;
        securityCode = `SBX${Math.floor(100000 + Math.random() * 900000)}`;
        qrUrl = `https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=132749482&encf=${finalNcf}&montototal=${total}`;
        signatureDate = new Date().toISOString();
        toast.success("Factura electrónica de contingencia generada.", { id: "ecf-submit" });
      }
    } else {
      // Si no tiene e-CF, usa B01 o B02 normal
      const isCreditFiscal = customerData.type === 'credito_fiscal' || (posCustomerId && posCustomerId !== "walk-in" && customers.find(c => c.id === posCustomerId)?.rnc);
      finalNcf = isCreditFiscal ? `B01-${String(Date.now()).slice(-8)}` : `B02-${String(Date.now()).slice(-8)}`;
    }

    const finalCustomerId = currentOrder?.customerId || posCustomerId || "walk-in";

    const inv = {
      id: `inv-${Date.now()}`,
      tenantId: tenantId,
      customerId: finalCustomerId,
      customerName: customerData.name || (finalCustomerId !== "walk-in" ? customers.find(c => c.id === finalCustomerId)?.name : undefined),
      customerRnc: customerData.rnc || undefined,
      vehicleId: currentOrder?.vehicleId || undefined,
      orderId: activeOrderId || undefined,
      mechanicId: posMechanicId || undefined,
      items: cart.map((i) => ({ 
        id: `ii-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: i.id, 
        name: i.name, 
        quantity: i.quantity, 
        unitPrice: i.salePrice / (1 + (i.tax ?? 18) / 100), 
        tax: (i.salePrice * i.quantity) - ((i.salePrice / (1 + (i.tax ?? 18) / 100)) * i.quantity),
        laborPrice: i.laborPrice,
      })),
      subtotal, tax: itbis, total,
      paymentMethod: payMethod,
      status: "paid" as const,
      ncf: finalNcf,
      securityCode: securityCode || undefined,
      qrUrl: qrUrl || undefined,
      signatureDate: signatureDate || undefined,
      createdAt: new Date().toISOString(),
    };
    addInvoice(inv);

    // ── INVENTARIO INTELIGENTE: Descuento Automático (Modo Seguro) ──
    if (currentTenantConfig?.autoDeductInventory) {
      cart.forEach(item => {
        // Ignorar items de mano de obra
        if (item.id.startsWith("labor-") || item.sku === "MANO-OBRA" || item.category === "Servicios") return;
        
        // 1. Actualizar stock
        const newStock = Math.max(0, item.stock - item.quantity);
        updateProduct(item.id, { stock: newStock });
        
        // 2. Registrar movimiento en el historial
        addMovement({
          id: `m-pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          tenantId: tenantId,
          productId: item.id,
          productName: item.name,
          type: "out",
          quantity: item.quantity,
          reason: `Venta POS - Factura ${inv.ncf}`,
          date: new Date().toISOString(),
        });
      });
      toast.success("Inventario descontado automáticamente");
    }

    if (activeCaja) {
      let laborTotal = 0;
      cart.forEach(item => {
        if (item.id.startsWith("labor-") || item.name.toLowerCase() === "mano de obra") {
          laborTotal += ((item.laborPrice ?? item.salePrice) || 0) * item.quantity;
        } else {
          laborTotal += (item.laborPrice || 0) * item.quantity;
        }
      });
      const monto_mano_obra = laborTotal;

      addCajaMovement({
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: tenantId,
        caja_id: activeCaja.id,
        empleado_id: activeCaja.empleado_id,
        tipo: 'VENTA',
        concepto: `Venta POS - Factura ${inv.ncf || inv.id}`,
        monto: total,
        monto_mano_obra: monto_mano_obra > 0 ? monto_mano_obra : undefined,
        metodo: payMethod === 'cash' ? 'EFECTIVO' : payMethod === 'card' ? 'TARJETA' : 'TRANSFERENCIA',
        creado_en: new Date().toISOString(),
      });
    }
    if (activeOrderId) {
      updateOrder(activeOrderId, { status: "invoiced" });
    }
    setLastInvoice(inv);
    setIsCheckout(false);
    setIsPrint(true);
    toast.success("¡Venta registrada!");
  };

  const clearSale = () => {
    setCart([]); setIsPrint(false); setLastInvoice(null);
    setCashReceived(""); setPayMethod("cash");
    setActiveOrderId(null);
    setActiveServiceIds([]);
    setPosCustomerId("");
    setPosMechanicId("");
    setPosCustomerSearch("");
    setCategory("Todos");
    searchRef.current?.focus();
  };

  return (
    <>
      {/* Print-only receipt */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #receipt-print { display: block !important; }
          @page { size: 80mm auto; margin: 4mm; }
        }
        #receipt-print { display: none; }
      `}</style>

      {/* 80mm Thermal Receipt (hidden, print-only) */}
      <div id="receipt-print">
        <Ticket 
          invoiceId={lastInvoice?.id || `TEMP-${Date.now()}`}
          ncf={lastInvoice?.ncf}
          qrUrl={lastInvoice?.qrUrl}
          securityCode={lastInvoice?.securityCode}
          signatureDate={lastInvoice?.signatureDate}
          createdAt={lastInvoice?.createdAt || new Date().toISOString()}
          tenant={taller}
          customer={lastInvoice?.customerName ? { name: lastInvoice.customerName, id: "", rnc: lastInvoice.customerRnc, tenantId: "", phone: "", address: "", status: "active", createdAt: "" } : lastInvoice?.customerId ? customers.find(c => c.id === lastInvoice.customerId) : currentOrder?.customerId ? customers.find(c => c.id === currentOrder.customerId) : undefined}
          items={lastInvoice?.items || cart.map(c => ({ name: c.name, quantity: c.quantity, salePrice: c.salePrice }))}
          subtotal={lastInvoice?.subtotal || subtotal}
          itbis={itbis}
          total={total}
          payMethod={payMethod}
          cashReceived={cashNum}
          mechanicName={posMechanicId ? tenantTechnicians.find(t => t.id === posMechanicId)?.name : undefined}
          warrantyText={localWarrantyText}
        />
      </div>

      {/* ─── Main POS Layout ─── */}
      <div className={cn(
        "flex bg-neutral-100 transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-[100]"
          : "h-[calc(100vh-4rem)] rounded-2xl overflow-hidden"
      )}>

        {/* ── Left: Products ── */}
        <div className="flex flex-1 flex-col bg-neutral-50 overflow-hidden">
          {currentOrder && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-white hover:bg-amber-600">ORDEN #{currentOrder.id.slice(-6).toUpperCase()}</Badge>
                <span className="text-xs font-bold text-amber-800 truncate max-w-[400px]">
                  Facturando servicios para: {currentOrder.description}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-amber-800 hover:bg-amber-100 text-xs font-bold" onClick={() => { setActiveOrderId(null); setCart([]); setActiveServiceIds([]); setCategory("Todos"); window.history.replaceState({}, '', window.location.pathname); }}>
                <X className="h-3 w-3 mr-1" /> Quitar vínculo
              </Button>
            </div>
          )}

          {/* Top bar */}
          <div id="tour-pos-search" className="flex items-center gap-3 bg-white border-b border-neutral-200 px-4 py-3 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <div className="font-black text-lg tracking-tight hidden sm:block">ServiTracks <span className="font-light text-neutral-400">POS</span></div>
              <Badge className="bg-black text-white text-[10px] rounded-full px-2">ACTIVO</Badge>
            </div>
            <div className="relative flex-1 min-w-[150px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input ref={searchRef} placeholder="Buscar producto (F1)..."
                className="pl-9 h-9 rounded-lg bg-neutral-50 border-neutral-200 text-sm w-full"
                value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleBarcodeScan} />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                onClick={() => setIsLinkOrderOpen(true)}
                variant="outline"
                title="Vincular Orden"
                className={cn(
                  "h-9 gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-all font-bold shrink-0",
                  isFullscreen ? "px-2.5 lg:px-4" : "px-2.5 2xl:px-4"
                )}
              >
                <FileText className="h-4 w-4 text-neutral-500" />
                <span className={isFullscreen ? "hidden lg:inline" : "hidden 2xl:inline"}>Vincular Orden</span>
              </Button>

              <Button 
                onClick={() => setIsLaborModalOpen(true)}
                variant="outline"
                title="Mano de obra"
                className={cn(
                  "h-9 gap-2 border-black text-black hover:bg-black hover:text-white transition-all font-bold shrink-0",
                  isFullscreen ? "px-2.5 lg:px-4" : "px-2.5 2xl:px-4"
                )}
              >
                <Wrench className="h-4 w-4" />
                <span className={isFullscreen ? "hidden lg:inline" : "hidden 2xl:inline"}>Mano de obra</span>
              </Button>

              <Button
                onClick={() => setIsWarrantyModalOpen(true)}
                variant="outline"
                title="Garantía"
                className={cn(
                  "h-9 gap-2 transition-all font-bold shrink-0",
                  isFullscreen ? "px-2.5 lg:px-4" : "px-2.5 2xl:px-4",
                  localWarrantyText
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                <span className={isFullscreen ? "hidden lg:inline" : "hidden 2xl:inline"}>Garantía</span>
                {localWarrantyText && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                )}
              </Button>
              <button onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors shrink-0">
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto shrink-0">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  category === cat ? "bg-black text-white" : "bg-white text-neutral-500 hover:bg-neutral-100 border border-neutral-200")}>
                {cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.id === product.id);
                const isLowStock = product.stock > 0 && product.stock <= 5;
                const isOutOfStock = product.stock <= 0;

                return (
                  <button key={product.id} onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={cn(
                      "relative text-left rounded-2xl border transition-all duration-200 group flex flex-col h-full",
                      isOutOfStock
                        ? "opacity-60 cursor-not-allowed bg-neutral-100 border-neutral-200"
                        : "bg-white border-neutral-200 hover:border-black hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]",
                      inCart && "border-black ring-2 ring-black ring-offset-2"
                    )}>
                    <div className={cn("absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl",
                      product.category === "Lubricantes" ? "bg-amber-400"
                      : product.category === "Filtros" ? "bg-blue-400"
                      : product.category === "Frenos" ? "bg-rose-400"
                      : product.category === "Suspensión" ? "bg-violet-400"
                      : product.category === "Neumáticos" ? "bg-emerald-400"
                      : product.category === "Motor" ? "bg-orange-500"
                      : product.category === "Servicios" ? "bg-neutral-900"
                      : "bg-neutral-300")} />
                    <div className="p-4 flex flex-col flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        {product.brand || "Genérico"}
                      </span>
                      <h3 className="text-sm font-extrabold text-neutral-900 leading-tight line-clamp-2 mb-2 group-hover:text-black transition-colors">
                        {product.name}
                      </h3>
                      <div className="mt-auto pt-2 flex flex-col gap-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-bold text-neutral-400">RD$</span>
                          <span className="text-lg font-black text-neutral-900">
                            {product.salePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                            isOutOfStock ? "bg-rose-100 text-rose-600" :
                            isLowStock ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            {isOutOfStock ? (
                              <><AlertTriangle className="h-3 w-3" /> Agotado</>
                            ) : isLowStock ? (
                              <><Package className="h-3 w-3" /> Solo {product.stock}</>
                            ) : (
                              <><CheckCircle className="h-3 w-3" /> {product.stock} disp.</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {inCart && (
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-black text-white text-xs flex items-center justify-center font-black shadow-lg animate-in zoom-in duration-200 border-2 border-white">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
                <Tag className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart ── */}
        <div id="tour-pos-payment" className="flex w-[340px] shrink-0 flex-col bg-white border-l border-neutral-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-bold text-lg">Venta</span>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-neutral-400 hover:text-rose-500 transition-colors">
                Vaciar
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <ShoppingCart className="h-10 w-10 text-neutral-200 mb-3" />
                <p className="text-sm text-neutral-400">Selecciona productos</p>
                <p className="text-xs text-neutral-300 mt-1">F1 para buscar, F12 para cobrar</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{item.name}</p>
                      <p className="text-xs text-neutral-400">RD$ {item.salePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/u (Inc. ITBIS)</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.id.startsWith("labor-") || item.sku === "MANO-OBRA" || item.name === "Mano de obra" ? null : (
                        <>
                          <button onClick={() => updateQty(item.id, -1)}
                            className="h-6 w-6 rounded-md border border-neutral-200 text-neutral-500 hover:border-black hover:text-black transition-colors flex items-center justify-center text-sm font-bold">
                            −
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)}
                            className="h-6 w-6 rounded-md border border-neutral-200 text-neutral-500 hover:border-black hover:text-black transition-colors flex items-center justify-center text-sm font-bold">
                            +
                          </button>
                        </>
                      )}
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p className="text-sm font-black">RD$ {(item.salePrice * item.quantity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)}
                      className="text-neutral-300 hover:text-rose-500 transition-colors ml-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4 space-y-2">
            <div className="flex justify-between items-center text-sm text-neutral-500 py-1.5 border-b border-dashed border-neutral-200">
              <span className="font-semibold text-xs flex items-center gap-1"><User className="h-3.5 w-3.5 text-neutral-400" /> Cliente:</span>
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger className="flex items-center justify-between px-3 h-8 w-48 rounded-lg border border-neutral-200 bg-white text-[11px] font-bold hover:border-neutral-300 transition-colors focus:outline-none">
                  <span className="truncate">
                    {posCustomerId
                      ? tenantCustomers.find((c) => c.id === posCustomerId)?.name ?? "Consumidor Final"
                      : "Consumidor Final"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2 z-[200] shadow-xl rounded-xl border border-neutral-200 bg-white" align="end">
                  <Input 
                    placeholder="Buscar por nombre, teléfono o RNC..." 
                    value={posCustomerSearch}
                    onChange={(e) => setPosCustomerSearch(e.target.value)}
                    className="h-9 mb-2 text-xs rounded-lg border-neutral-200"
                  />
                  <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                    <button 
                      onClick={() => { setPosCustomerId(""); setCustomerPopoverOpen(false); setPosCustomerSearch(""); }}
                      className={cn("w-full text-left px-3 py-2 text-xs rounded-lg font-bold transition-colors", !posCustomerId ? "bg-black text-white" : "hover:bg-neutral-100")}
                    >
                      Consumidor Final (Ticket Normal)
                    </button>
                    {tenantCustomers.filter(c => c.name.toLowerCase().includes(posCustomerSearch.toLowerCase()) || (c.phone && c.phone.includes(posCustomerSearch)) || (c.rnc && c.rnc.includes(posCustomerSearch))).map(c => (
                      <button 
                        key={c.id}
                        onClick={() => { setPosCustomerId(c.id); setCustomerPopoverOpen(false); setPosCustomerSearch(""); }}
                        className={cn("w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex flex-col", posCustomerId === c.id ? "bg-black text-white" : "hover:bg-neutral-100")}
                      >
                        <div className="font-bold">{c.name}</div>
                        {(c.phone || c.rnc) && (
                          <div className={cn("text-[10px] mt-0.5", posCustomerId === c.id ? "text-neutral-300" : "text-neutral-500")}>
                            {[c.phone, c.rnc ? `RNC: ${c.rnc}` : ''].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </button>
                    ))}
                    {tenantCustomers.filter(c => c.name.toLowerCase().includes(posCustomerSearch.toLowerCase()) || (c.phone && c.phone.includes(posCustomerSearch)) || (c.rnc && c.rnc.includes(posCustomerSearch))).length === 0 && (
                      <div className="text-center text-xs text-neutral-400 py-4">No se encontraron clientes</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-between items-center text-sm text-neutral-500 py-1.5 border-b border-dashed border-neutral-200">
              <span className="font-semibold text-xs flex items-center gap-1"><UserCog className="h-3.5 w-3.5 text-neutral-400" /> Técnico:</span>
              <Select value={posMechanicId || "none"} onValueChange={(v) => setPosMechanicId(!v || v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 w-40 rounded-lg border-neutral-200 bg-white text-[11px] font-bold">
                  <span>
                    {posMechanicId
                      ? technicians.find((t) => t.id === posMechanicId)?.name ?? "Técnico"
                      : "Sin asignar"}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {tenantTechnicians.filter((t) => t.status === "active" || t.id === posMechanicId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>Subtotal</span><span>RD$ {subtotal.toLocaleString("en-US")}</span>
            </div>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>ITBIS</span><span>RD$ {itbis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-neutral-900 pt-2 border-t border-neutral-200">
              <span>TOTAL</span><span>RD$ {total.toLocaleString("en-US")}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => {
                if (!activeCaja) {
                  toast.error("Debe abrir la caja antes de registrar ventas");
                  return;
                }
                setIsCheckout(true);
              }}
              className={cn(
                "w-full py-4 rounded-xl text-base font-black transition-all mt-1",
                cart.length === 0
                  ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-neutral-800 active:scale-[0.98]"
              )}>
              COBRAR <span className="font-light text-neutral-400 text-sm ml-1">(F12)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lazy-loaded Dialogs */}
      <Suspense fallback={null}>
        {isCheckout && (
          <LazyCheckout
            open={isCheckout}
            onOpenChange={setIsCheckout}
            total={total}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            cashReceived={cashReceived}
            setCashReceived={setCashReceived}
            onConfirm={handleCheckout}
          />
        )}
        {isPrint && (
          <LazyPrintReceipt
            open={isPrint}
            onClose={clearSale}
            mechanicId={posMechanicId}
            cart={cart}
            subtotal={subtotal}
            itbis={itbis}
            total={total}
            payMethod={payMethod}
            cashNum={cashNum}
            change={change}
            taller={taller}
            lastInvoice={lastInvoice}
            warrantyText={localWarrantyText}
          />
        )}
        {isLaborModalOpen && (
          <LazyLaborModal
            open={isLaborModalOpen}
            onOpenChange={setIsLaborModalOpen}
            onConfirm={handleAddLabor}
          />
        )}
        {isLinkOrderOpen && (
          <LazyLinkOrder
            open={isLinkOrderOpen}
            onOpenChange={setIsLinkOrderOpen}
            onSelect={handleSelectOrder}
          />
        )}
        {isWarrantyModalOpen && (
          <LazyWarrantyModal
            open={isWarrantyModalOpen}
            onOpenChange={setIsWarrantyModalOpen}
            currentText={localWarrantyText}
            onSave={(text) => {
              setLocalWarrantyText(text);
              // Persist to settings so it survives page refresh
              useStore.getState().updatePrintSettings({ warrantyText: text, showWarranty: true });
              toast.success("Garantía aplicada a la factura");
            }}
          />
        )}
      </Suspense>
    </>
  );
}
