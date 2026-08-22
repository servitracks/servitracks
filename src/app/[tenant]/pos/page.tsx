"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { cn, isServiceItem } from "@/lib/utils";
import { useStore, Product, WorkOrder } from "@/store/useStore";
import {
  Search, ShoppingCart, X, Plus,
  Maximize2, Minimize2, Tag, Wrench, ShieldCheck,
  Package, AlertTriangle, CheckCircle, UserCog, FileText, User, FolderOpen, ClipboardList, Wallet
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useParams, useSearchParams, useRouter } from "@/lib/next-compat";
import { SERVICE_CATEGORY_TO_PRODUCT_CATEGORIES, Service } from "@/store/useStore";
import { Ticket } from "@/components/pos/Ticket";

// Lazy-load dialogs
const LazyCheckout = lazy(() => import("./POSDialogs").then(m => ({ default: m.CheckoutDialog })));
const LazyPrintReceipt = lazy(() => import("./POSDialogs").then(m => ({ default: m.PrintReceiptDialog })));
const LazyLaborModal = lazy(() => import("./POSDialogs").then(m => ({ default: m.LaborModal })));
const LazyLinkOrder = lazy(() => import("./POSDialogs").then(m => ({ default: m.LinkOrderDialog })));
const LazyWarrantyModal = lazy(() => import("./POSDialogs").then(m => ({ default: m.WarrantyModal })));
const LazyOpenTabsDialog = lazy(() => import("./POSDialogs").then(m => ({ default: m.OpenTabsDialog })));

interface CartItem extends Product { quantity: number }

type PayMethod = "cash" | "card" | "transfer";

export default function POSPage() {
  const router = useRouter();
  const { tenant } = useParams();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const { products, tenants, addInvoice, orders, services, technicians, invoices, updateOrder, cajas, addCajaMovement, updateProduct, addMovement, printSettings, customers, openTabs, addOpenTab, updateOpenTab, deleteOpenTab } = useStore();
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
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);
  const tenantCustomers = tenantId ? customers.filter((c) => c.tenantId === tenantId) : [];

  const serviceToProduct = (s: Service): Product => ({
    id: s.id,
    tenantId: s.tenantId,
    name: s.name,
    sku: `SRV-${s.id.slice(-4).toUpperCase()}`,
    category: "Servicios",
    costPrice: 0,
    salePrice: s.price,
    stock: 9999,
    minStock: 0,
    tax: s.tax || 0,
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
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isLinkOrderOpen, setIsLinkOrderOpen] = useState(false);
  const [isOpenTabsDialogOpen, setIsOpenTabsDialogOpen] = useState(false);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  // Local warranty text for this session — persisted via printSettings
  const [localWarrantyText, setLocalWarrantyText] = useState<string | undefined>(
    printSettings.showWarranty ? printSettings.warrantyText : undefined
  );
  const searchRef = useRef<HTMLInputElement>(null);

  const allPosItems: Product[] = [
    ...tenantProducts,
    ...tenantServices.filter(s => s.price > 0).map(serviceToProduct)
  ];

  const CATEGORIES = ["Todos", ...Array.from(new Set(allPosItems.map((p) => p.category).filter(Boolean)))];

  // Filter inventory: if an order with services is active, only show related products
  const filteredProducts = allPosItems.filter((p) => {
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

  const rawTotal       = cart.reduce((acc, i) => acc + i.salePrice * i.quantity, 0);
  const discountAmount = discountType === "percent" 
    ? (rawTotal * (discount || 0)) / 100 
    : Math.min(rawTotal, Math.max(0, discount || 0));
  const total          = Math.max(0, rawTotal - discountAmount);
  const rawSubtotal    = cart.reduce((acc, i) => acc + (i.salePrice / (1 + (i.tax ?? 18) / 100)) * i.quantity, 0);
  const subtotal       = rawTotal > 0 ? (rawSubtotal * (total / rawTotal)) : 0;
  const itbis          = Math.max(0, total - subtotal);
  const cashNum        = parseFloat(cashReceived.replace(/,/g, "")) || 0;
  const change         = Math.max(0, cashNum - total);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F4") { e.preventDefault(); router.push(`/${tenant}/caja`); }
      if (e.key === "F12") { 
        e.preventDefault(); 
        if (cart.length > 0) {
          if (!activeCaja) {
            toast.error("Debe abrir la caja antes de registrar ventas", {
              action: {
                label: "Abrir Caja (F4)",
                onClick: () => router.push(`/${tenant}/caja`),
              },
              duration: 6000,
            });
            return;
          }
          setIsCheckout(true);
        }
      }
      if (e.key === "Escape") { setIsCheckout(false); setIsPrint(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, activeCaja, tenant, router]);

  const addToCart = (product: Product) => {
    const isService = product.sku?.startsWith('SRV-') || product.category === 'Servicios' || product.id.startsWith('labor-');
    if (!isService && product.stock <= 0) { 
      toast.error("Producto sin stock disponible"); 
      return; 
    }
    setCart((prev) => {
      const calculatedLaborPrice = isService
        ? product.laborPrice
        : (product.laborPrice ? (product.salePrice * product.laborPrice) / 100 : undefined);
      const ex = prev.find((i) => i.id === product.id);
      if (ex) {
        if (!isService && ex.quantity >= product.stock) {
          toast.error(`No puedes agregar más. Solo quedan ${product.stock} unidades en existencia.`);
          return prev;
        }
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1, laborPrice: calculatedLaborPrice }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const isService = i.sku?.startsWith('SRV-') || i.category === 'Servicios' || i.id.startsWith('labor-');
      if (delta > 0 && !isService) {
        const availableStock = i.stock ?? 0;
        if (i.quantity + delta > availableStock) {
          toast.error(`No puedes agregar más. Solo quedan ${availableStock} en existencia.`);
          return { ...i, quantity: availableStock };
        }
      }
      return { ...i, quantity: Math.max(1, i.quantity + delta) };
    }));

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
      tax: 18,
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

    if (sids.length > 0 || (order.parts && order.parts.length > 0) || (order.customServices && order.customServices.length > 0) || (order.customParts && order.customParts.length > 0)) {
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
                const isService = product.sku?.startsWith('SRV-') || product.category === 'Servicios';
                const calculatedLaborPrice = isService
                  ? product.laborPrice
                  : (product.laborPrice ? (product.salePrice * product.laborPrice) / 100 : undefined);
                newCart.push({ ...product, quantity: part.quantity, laborPrice: calculatedLaborPrice });
              }
            }
          });
        }

        // Add custom services (e.g. ad-hoc labor from quotes)
        if (order.customServices && order.customServices.length > 0) {
          order.customServices.forEach((cs) => {
            newCart.push({
              id: `labor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              tenantId: tenantId,
              name: cs.name,
              sku: "MANO-OBRA",
              category: "Servicios",
              costPrice: 0,
              salePrice: cs.price,
              laborPrice: cs.price,
              stock: 9999,
              minStock: 0,
              tax: 18,
              quantity: 1,
            });
          });
        }

        // Add custom/external parts (repuestos libres/externos sin afectar catálogo de inventario)
        if (order.customParts && order.customParts.length > 0) {
          order.customParts.forEach((cp) => {
            newCart.push({
              id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              tenantId: tenantId,
              name: cp.name,
              sku: "EXTERNO",
              category: "Repuestos Externos",
              costPrice: 0,
              salePrice: cp.price,
              stock: 9999,
              minStock: 0,
              tax: 18,
              quantity: cp.quantity || 1,
            });
          });
        }

        return newCart;
      });
      toast.success(`Orden vinculada — Servicios y repuestos agregados al carrito`);
    } else {
      toast.info("La orden no tiene servicios ni repuestos asociados");
    }
  };

  const autoLoadedOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (orderId && autoLoadedOrderIdRef.current !== orderId && tenantOrders.length > 0) {
      const targetOrder = tenantOrders.find((o) => o.id === orderId);
      if (targetOrder) {
        autoLoadedOrderIdRef.current = orderId;
        handleSelectOrder(targetOrder);
      }
    }
  }, [orderId, tenantOrders]);

  const handleCheckout = async (customerData: { type: 'consumo' | 'credito_fiscal'; rnc?: string; name?: string }) => {
    if (!posMechanicId || posMechanicId === "none") {
      toast.error("Debe asignar un técnico o mecánico a la factura"); return;
    }
    if (payMethod === "cash" && cashNum < total) {
      toast.error("El efectivo recibido es menor al total"); return;
    }

    const currentTenantConfig = tenants.find(t => t.id === tenantId)?.config;
    const ecfConfig = currentTenantConfig?.ecfConfig;
    const isEcfEnabled = Boolean(ecfConfig?.rnc && (ecfConfig?.certUploaded || ecfConfig?.environment === 'sandbox' || true));
    
    let finalNcf = `B02-${String(Date.now()).slice(-8)}`;
    let securityCode = undefined;
    let qrUrl = undefined;
    let signatureDate = undefined;

    const isCreditFiscal = customerData.type === 'credito_fiscal';
    
    // Lógica para asignar e-NCF según tipo de cliente
    if (isEcfEnabled) {
      const invoiceType = isCreditFiscal ? "31" : "32";
      
      try {
        toast.info("Firmando y enviando factura electrónica a la DGII...", { id: "ecf-submit" });
        
        const { getEcfToken, submitInvoiceToDGII, buildElectronicDocument, resolveEcfEnvironment } = await import('@/lib/ecf');

        // Construir payload con la estructura exacta que el SDK de Pronesoft espera
        const docPayload = buildElectronicDocument({
          invoiceType,
          items: cart.map(i => ({
            name: i.name,
            quantity: i.quantity,
            salePrice: i.salePrice,
            tax: typeof i.tax === 'number' && i.tax > 0 && i.tax < 1 ? i.tax : (i.tax > 0 ? i.tax / 100 : 0.18),
            category: i.category,
          })),
          subtotal,
          itbis,
          total,
          payMethod,
          issuer: {
            rnc: ecfConfig?.rnc || taller.rnc,
            businessName: ecfConfig?.businessName || taller.name,
            address: taller.address,
            phone: taller.phone,
          },
          buyer: isCreditFiscal && customerData.rnc ? {
            rnc: customerData.rnc,
            name: customerData.name,
          } : undefined,
        });

        const env = resolveEcfEnvironment(ecfConfig?.environment);
        const token = await getEcfToken(undefined, undefined, env);
        
        // Llamada real al API de Pronesoft
        const result = await submitInvoiceToDGII(token, env, docPayload);
        
        if (result && result.encf) {
           finalNcf = result.encf;
           securityCode = result.securityCode;
           qrUrl = result.documentStampUrl;
           signatureDate = result.signatureDate ? new Date(result.signatureDate).toISOString() : new Date().toISOString();
           toast.success("Factura Electrónica enviada exitosamente", { id: "ecf-submit" });
        } else if (result && result.contingencyMode) {
           // El SDK de Pronesoft manejó contingencia automáticamente
           finalNcf = result.encf || result.documentNumber || `E${invoiceType}${String(Date.now()).slice(-10)}`;
           securityCode = result.securityCode;
           qrUrl = result.documentStampUrl;
           signatureDate = new Date().toISOString();
           toast.warning("Factura enviada en modo contingencia — será procesada por la DGII cuando se restablezca.", { id: "ecf-submit" });
        } else {
           throw new Error("Respuesta inválida del servidor ECF");
        }
      } catch (err: any) {
        console.error("Error DGII:", err);
        // Factura SIN e-NCF — se guardará para reenvío posterior
        finalNcf = isCreditFiscal ? `B01-${String(Date.now()).slice(-8)}` : `B02-${String(Date.now()).slice(-8)}`;
        toast.error(`Error al enviar a la DGII: ${err.message || "Conexión fallida"}. Se generó comprobante local (NCF tradicional).`, { id: "ecf-submit", duration: 6000 });
      }
    } else {
      // Si no tiene e-CF, usa B01 o B02 normal
      const isCreditFiscal = customerData.type === 'credito_fiscal' || (posCustomerId && posCustomerId !== "walk-in" && customers.find(c => c.id === posCustomerId)?.rnc);
      finalNcf = isCreditFiscal ? `B01-${String(Date.now()).slice(-8)}` : `B02-${String(Date.now()).slice(-8)}`;
    }

    const finalCustomerId = currentOrder?.customerId || posCustomerId || "walk-in";
    const selectedTech = posMechanicId ? technicians.find(t => t.id === posMechanicId) : null;

    const inv = {
      id: `inv-${Date.now()}`,
      tenantId: tenantId,
      customerId: finalCustomerId,
      customerName: customerData.name || (finalCustomerId !== "walk-in" ? customers.find(c => c.id === finalCustomerId)?.name : undefined),
      customerRnc: customerData.rnc || undefined,
      vehicleId: currentOrder?.vehicleId || undefined,
      orderId: activeOrderId || undefined,
      mechanicId: posMechanicId || undefined,
      items: cart.map((i) => {
        const itemIsService = isServiceItem(i, tenantServices);
        // Base unit price strictly excluding ITBIS (precio bruto antes de impuesto)
        const baseUnitPrice = (i.tax && i.tax > 0) 
          ? (i.salePrice / (1 + (i.tax / 100))) 
          : (i.salePrice / (1 + (18 / 100)));

        let itemCommission = 0;
        if (selectedTech && selectedTech.pagoNomina && itemIsService) {
          if (selectedTech.tipoPago === "fijo") {
            itemCommission = selectedTech.pagoNomina;
          } else {
            // Porcentaje del técnico (ej: 20%) aplicado sobre el precio del servicio DESCONTANDO el ITBIS
            itemCommission = (baseUnitPrice * selectedTech.pagoNomina) / 100;
          }
        } else if (itemIsService && (i.id.startsWith("labor-") || i.sku === "MANO-OBRA")) {
          itemCommission = i.laborPrice ?? baseUnitPrice;
        }

        return { 
          id: `ii-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: i.id, 
          serviceId: itemIsService ? ((i as any).serviceId || i.id) : undefined,
          name: i.name, 
          quantity: i.quantity, 
          unitPrice: baseUnitPrice, 
          tax: (i.salePrice * i.quantity) - (baseUnitPrice * i.quantity),
          laborPrice: itemCommission,
          alreadyDeducted: (i as any).alreadyDeducted || false,
        };
      }),
      subtotal, tax: itbis, total, discount: discountAmount,
      paymentMethod: payMethod,
      status: "paid" as const,
      ncf: finalNcf,
      securityCode: securityCode || undefined,
      qrUrl: qrUrl || undefined,
      signatureDate: signatureDate || undefined,
      createdAt: new Date().toISOString(),
    };
    addInvoice(inv);

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
    setDiscount(0); setDiscountType("fixed");
    setActiveOrderId(null);
    setActiveServiceIds([]);
    setPosCustomerId("");
    setPosMechanicId("");
    setPosCustomerSearch("");
    setCategory("Todos");
    setShowMobileCart(false);
    searchRef.current?.focus();
  };

  return (
    <>
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
          <div id="tour-pos-search" className="flex items-center justify-between gap-3 bg-white border-b border-neutral-200/90 px-4 py-2.5 overflow-hidden shadow-2xs">
            {/* Search Input & Live Scanner */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input 
                ref={searchRef} 
                placeholder="Buscar repuesto, servicio, código o marca (F1)..."
                className="pl-10 pr-9 h-10 rounded-xl bg-neutral-50/80 border-neutral-200 text-xs font-medium w-full focus:bg-white transition-all shadow-2xs"
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={handleBarcodeScan} 
              />
              {search && (
                <button 
                  onClick={() => setSearch("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Caja Status Badge */}
            {activeCaja ? (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-xs font-bold shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Caja Abierta (Turno Activo)</span>
              </div>
            ) : (
              <button 
                onClick={() => router.push(`/${tenant}/caja`)} 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shrink-0 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span>Caja Cerrada (Abrir F4)</span>
              </button>
            )}
            
            {/* Right Action Hub */}
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                onClick={() => setIsOpenTabsDialogOpen(true)}
                variant="outline"
                title="Cuentas en Espera"
                className={cn(
                  "h-10 gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-all font-bold shrink-0 text-xs shadow-2xs cursor-pointer",
                  openTabs.length > 0 && "border-amber-400 text-amber-900 bg-amber-50/70 hover:bg-amber-100"
                )}
              >
                <FolderOpen className="h-4 w-4 text-amber-600" />
                <span className="hidden sm:inline">Cuentas</span>
                {openTabs.length > 0 && (
                  <Badge className="bg-amber-500 text-white rounded-full px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center font-bold text-[10px]">{openTabs.length}</Badge>
                )}
              </Button>

              <Button 
                onClick={() => setIsLinkOrderOpen(true)}
                variant="outline"
                title="Vincular Orden de Trabajo"
                className="h-10 gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-all font-bold shrink-0 text-xs shadow-2xs cursor-pointer"
              >
                <ClipboardList className="h-4 w-4 text-neutral-500" />
                <span className="hidden sm:inline">Vincular Orden</span>
              </Button>

              <Button 
                onClick={() => setIsLaborModalOpen(true)}
                variant="outline"
                title="Añadir Mano de obra personalizada"
                className="h-10 gap-2 border-neutral-900 bg-neutral-900 text-white hover:bg-black rounded-xl transition-all font-bold shrink-0 text-xs shadow-2xs cursor-pointer"
              >
                <Wrench className="h-3.5 w-3.5 text-neutral-300" />
                <span className="hidden sm:inline">Mano de obra</span>
              </Button>

              <Button
                onClick={() => setIsWarrantyModalOpen(true)}
                variant="outline"
                title="Condiciones de Garantía"
                className={cn(
                  "h-10 gap-2 rounded-xl transition-all font-bold shrink-0 text-xs shadow-2xs cursor-pointer",
                  localWarrantyText
                    ? "border-emerald-500 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                    : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="hidden lg:inline">Garantía</span>
                {localWarrantyText && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                )}
              </Button>

              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                className="p-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 transition-colors shrink-0 cursor-pointer shadow-2xs"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto shrink-0 custom-scrollbar bg-neutral-100/60 border-b border-neutral-200/60">
            {CATEGORIES.map((cat) => {
              const count = cat === "Todos" 
                ? allPosItems.length 
                : allPosItems.filter(p => p.category === cat).length;

              return (
                <button 
                  key={cat} 
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border",
                    category === cat 
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-sm scale-[1.02]" 
                      : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-neutral-200/90"
                  )}
                >
                  <span>{cat}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                    category === cat ? "bg-neutral-800 text-neutral-300" : "bg-neutral-100 text-neutral-400"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-3.5 items-start">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.id === product.id);
                const isService = product.category === "Servicios" || product.stock >= 9000 || product.sku?.startsWith("SRV") || product.name.toLowerCase().includes("alineación") || product.name.toLowerCase().includes("mantenimiento") || product.name.toLowerCase().includes("mano de obra");
                const isLowStock = !isService && product.stock > 0 && product.stock <= 5;
                const isOutOfStock = !isService && product.stock <= 0;

                return (
                  <button 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={cn(
                      "relative text-left rounded-2xl border transition-all duration-200 group flex flex-col justify-between h-[135px] min-w-0 bg-white shadow-xs p-3 cursor-pointer",
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200"
                        : "border-neutral-200/90 hover:border-neutral-900 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                      inCart && "border-neutral-950 ring-2 ring-neutral-950 ring-offset-2"
                    )}
                  >
                    {/* Top Row: Brand & Stock Status */}
                    <div className="flex items-center justify-between gap-1 w-full min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 truncate max-w-[60%]">
                        {product.brand || "Genérico"}
                      </span>

                      {/* Stock / Service Badge */}
                      {isService ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-neutral-900 text-white shrink-0">
                          <Wrench className="h-2.5 w-2.5 text-neutral-300" />
                          <span>Servicio</span>
                        </span>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 border",
                          isOutOfStock ? "bg-rose-50 text-rose-700 border-rose-200" :
                          isLowStock ? "bg-amber-50 text-amber-800 border-amber-200" :
                          "bg-emerald-50 text-emerald-800 border-emerald-200"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", isOutOfStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-emerald-500")} />
                          <span>{isOutOfStock ? "Agotado" : `${product.stock} disp.`}</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Product Name */}
                    <div className="my-1 flex-1 flex items-center">
                      <h3 className="text-xs font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:text-black transition-colors" title={product.name}>
                        {product.name}
                      </h3>
                    </div>

                    {/* Bottom Row: Price & Category */}
                    <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-1 w-full">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[9px] font-bold text-neutral-400">RD$</span>
                        <span className="text-xs sm:text-sm font-black text-neutral-900 tracking-tight">
                          {product.salePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {product.category && product.category !== "Servicios" && (
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider truncate max-w-[65px]">
                          {product.category}
                        </span>
                      )}
                    </div>

                    {/* Cart Quantity Floating Badge */}
                    {inCart && (
                      <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-neutral-950 text-white text-[11px] flex items-center justify-center font-black shadow-lg border-2 border-white z-30">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-56 text-neutral-400">
                <Tag className="h-10 w-10 mb-2 opacity-25" />
                <p className="text-sm font-semibold">No se encontraron productos o repuestos</p>
                <p className="text-xs text-neutral-300 mt-0.5">Prueba con otra palabra clave o categoría</p>
              </div>
            )}
          </div>

          {/* Mobile Cart Toggle Bar */}
          <div className="lg:hidden bg-white border-t border-neutral-200 p-3 shrink-0 z-50 shadow-lg">
            <Button onClick={() => setShowMobileCart(true)} className="w-full h-12 bg-neutral-950 text-white font-bold rounded-2xl flex items-center justify-between px-4 hover:bg-black">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Ver Ticket ({cart.length})</span>
              </div>
              <span className="font-black">RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </Button>
          </div>
        </div>

        {/* ── Right: Cart Panel ── */}
        <div id="tour-pos-payment" className={cn(
          "flex w-full lg:w-[380px] shrink-0 flex-col bg-white lg:border-l border-neutral-200/90",
          "fixed lg:relative inset-0 lg:inset-auto z-[200] lg:z-auto transition-transform duration-300",
          showMobileCart ? "translate-y-0" : "translate-y-full lg:translate-y-0"
        )}>
          {/* Cart Header */}
          <div className="border-b border-neutral-100 bg-white p-4 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-neutral-900" />
                <span className="font-heading font-black text-lg text-neutral-900 tracking-tight">Ticket de Venta</span>
                {cart.length > 0 && (
                  <Badge className="bg-neutral-100 text-neutral-800 font-bold border-neutral-200 text-xs px-2">{cart.reduce((a, c) => a + c.quantity, 0)} items</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(cart.length > 0 || posCustomerId || posMechanicId || discount > 0) && (
                  <button 
                    onClick={() => { 
                      setCart([]); 
                      setPosCustomerId(""); 
                      setPosMechanicId(""); 
                      setDiscount(0); 
                      setDiscountType("fixed");
                      toast.info("Venta reiniciada");
                    }} 
                    className="text-xs font-bold text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
                  >
                    Vaciar
                  </button>
                )}
                <button className="lg:hidden p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer" onClick={() => setShowMobileCart(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Chips: Cliente, Técnico y Descuento */}
            <div className="grid grid-cols-3 gap-1.5 w-full">
              {/* Cliente */}
              <div className="relative w-full">
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger className={cn(
                    "flex items-center justify-center gap-1.5 px-2 h-9 rounded-xl border text-[11px] font-bold transition-all w-full min-w-0 cursor-pointer shadow-2xs",
                    posCustomerId 
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-xs pr-6"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-neutral-300"
                  )}>
                    <User className={cn("h-3.5 w-3.5 shrink-0", posCustomerId ? "text-neutral-300" : "text-neutral-400")} />
                    <span className="truncate">
                      {posCustomerId ? tenantCustomers.find((c) => c.id === posCustomerId)?.name ?? "Cliente" : "Cliente"}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3 z-[200] shadow-2xl rounded-2xl border border-neutral-200 bg-white" align="start">
                    <Input 
                      placeholder="Buscar por nombre, teléfono o RNC..." 
                      value={posCustomerSearch}
                      onChange={(e) => setPosCustomerSearch(e.target.value)}
                      className="h-9 mb-2 text-xs rounded-xl border-neutral-200"
                    />
                    <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                      <button 
                        onClick={() => { setPosCustomerId(""); setCustomerPopoverOpen(false); setPosCustomerSearch(""); }}
                        className={cn("w-full text-left px-3 py-2 text-xs rounded-xl font-bold transition-colors cursor-pointer", !posCustomerId ? "bg-neutral-950 text-white" : "hover:bg-neutral-100 text-rose-600")}
                      >
                        Consumidor Final (Sin Cliente)
                      </button>
                      {tenantCustomers.filter(c => c.name.toLowerCase().includes(posCustomerSearch.toLowerCase()) || (c.phone && c.phone.includes(posCustomerSearch)) || (c.rnc && c.rnc.includes(posCustomerSearch))).map(c => (
                        <button 
                          key={c.id}
                          onClick={() => { setPosCustomerId(c.id); setCustomerPopoverOpen(false); setPosCustomerSearch(""); }}
                          className={cn("w-full text-left px-3 py-2 text-xs rounded-xl transition-colors flex flex-col cursor-pointer", posCustomerId === c.id ? "bg-neutral-950 text-white" : "hover:bg-neutral-100")}
                        >
                          <div className="font-bold">{c.name}</div>
                          {(c.phone || c.rnc) && (
                            <div className={cn("text-[10px] mt-0.5", posCustomerId === c.id ? "text-neutral-300" : "text-neutral-500")}>
                              {[c.phone, c.rnc ? `RNC: ${c.rnc}` : ''].filter(Boolean).join(" • ")}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {posCustomerId && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPosCustomerId(""); }}
                    title="Quitar cliente"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full transition-colors z-10 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Técnico */}
              <div className="relative w-full">
                <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
                  <PopoverTrigger className={cn(
                    "flex items-center justify-center gap-1.5 px-2 h-9 rounded-xl border text-[11px] font-bold transition-all w-full min-w-0 cursor-pointer shadow-2xs",
                    posMechanicId 
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-xs pr-6"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-neutral-300"
                  )}>
                    <UserCog className={cn("h-3.5 w-3.5 shrink-0", posMechanicId ? "text-neutral-300" : "text-neutral-400")} />
                    <span className="truncate">
                      {posMechanicId ? technicians.find((t) => t.id === posMechanicId)?.name ?? "Técnico" : "Técnico"}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-2 z-[200] shadow-2xl rounded-2xl border border-neutral-200 bg-white" align="center">
                    <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                      <button 
                        onClick={() => { setPosMechanicId(""); setTechnicianPopoverOpen(false); }}
                        className={cn("w-full text-left px-3 py-2 text-xs rounded-xl font-bold transition-colors cursor-pointer", !posMechanicId ? "bg-neutral-950 text-white" : "hover:bg-neutral-100 text-rose-600")}
                      >
                        Sin asignar
                      </button>
                      {tenantTechnicians.filter((t) => t.status === "active" || t.id === posMechanicId).map((t) => (
                        <button 
                          key={t.id}
                          onClick={() => { setPosMechanicId(t.id); setTechnicianPopoverOpen(false); }}
                          className={cn("w-full text-left px-3 py-2 text-xs rounded-xl transition-colors font-bold cursor-pointer", posMechanicId === t.id ? "bg-neutral-950 text-white" : "hover:bg-neutral-100")}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {posMechanicId && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPosMechanicId(""); }}
                    title="Quitar técnico"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full transition-colors z-10 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Descuento */}
              <div className="relative w-full">
                <Popover>
                  <PopoverTrigger className={cn(
                    "flex items-center justify-center gap-1.5 px-2 h-9 rounded-xl border text-[11px] font-bold transition-all w-full min-w-0 cursor-pointer shadow-2xs",
                    discount > 0
                      ? discountType === "fixed"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs pr-6"
                        : "bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs pr-6"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-neutral-300"
                  )}>
                    <Tag className={cn("h-3.5 w-3.5 shrink-0", discount > 0 ? (discountType === "fixed" ? "text-emerald-600" : "text-indigo-600") : "text-neutral-400")} />
                    <span className="truncate">{discount > 0 ? (discountType === "fixed" ? `RD$${discount}` : `${discount}%`) : "Descuento"}</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-3 z-[200] shadow-2xl rounded-2xl border border-neutral-200 bg-white" align="end">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-neutral-900">
                        <span>Aplicar Descuento</span>
                        {discount > 0 && (
                          <button type="button" onClick={() => setDiscount(0)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">
                            Quitar
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex bg-neutral-100 p-0.5 rounded-xl text-xs font-bold border border-neutral-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDiscountType("fixed")}
                            className={cn(
                              "px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer",
                              discountType === "fixed"
                                ? "bg-emerald-600 text-white shadow-xs font-black"
                                : "text-neutral-500 hover:text-neutral-900"
                            )}
                          >
                            RD$
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType("percent")}
                            className={cn(
                              "px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer",
                              discountType === "percent"
                                ? "bg-indigo-600 text-white shadow-xs font-black"
                                : "text-neutral-500 hover:text-neutral-900"
                            )}
                          >
                            %
                          </button>
                        </div>

                        <div className="relative flex-1 flex items-center">
                          <Input
                            type="number"
                            min="0"
                            max={discountType === "percent" ? "100" : undefined}
                            placeholder="0"
                            value={discount || ""}
                            onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="h-9 w-full font-bold text-xs rounded-xl border-neutral-200"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {discount > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDiscount(0); }}
                    title="Quitar descuento"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-200 text-neutral-600 transition-colors z-10 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cart Items Scrollable List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                  <ShoppingCart className="h-8 w-8 text-neutral-300" />
                </div>
                <p className="text-sm font-bold text-neutral-700">El carrito está vacío</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">Haz clic en los repuestos o servicios para agregarlos al ticket</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-neutral-400 bg-neutral-50 border border-neutral-200/80 px-2.5 py-1 rounded-lg">
                  <span>F1 Buscar</span> • <span>F4 Caja</span> • <span>F12 Cobrar</span>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">RD$ {item.salePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/u (Inc. ITBIS)</p>
                    </div>

                    {/* Stepper Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.id.startsWith("labor-") || item.sku === "MANO-OBRA" || item.name === "Mano de obra" ? null : (
                        <>
                          <button 
                            onClick={() => updateQty(item.id, -1)}
                            className="h-7 w-7 rounded-lg border border-neutral-200 text-neutral-600 hover:border-black hover:text-black hover:bg-neutral-50 transition-colors flex items-center justify-center text-sm font-bold cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-xs font-black w-6 text-center text-neutral-900">{item.quantity}</span>
                          <button 
                            onClick={() => updateQty(item.id, 1)}
                            disabled={!item.sku?.startsWith('SRV-') && item.category !== 'Servicios' && !item.id.startsWith('labor-') && item.quantity >= (item.stock ?? 0)}
                            className="h-7 w-7 rounded-lg border border-neutral-200 text-neutral-600 hover:border-black hover:text-black hover:bg-neutral-50 transition-colors flex items-center justify-center text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            +
                          </button>
                        </>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-[70px] shrink-0">
                      <p className="text-xs sm:text-sm font-black text-neutral-900">
                        RD$ {(item.salePrice * item.quantity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Delete Item */}
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-neutral-300 hover:text-rose-600 transition-colors ml-1 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                      title="Eliminar del carrito"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Bottom Summary & Checkout */}
          <div className="border-t border-neutral-200/90 bg-neutral-50/70 px-5 py-4 space-y-2.5 shrink-0 shadow-xs">
            <div className="flex justify-between text-xs text-neutral-500 font-medium">
              <span>Subtotal</span>
              <span className="font-semibold text-neutral-800">RD$ {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-rose-600 font-bold">
                <span>Descuento {discountType === "percent" ? `(${discount}%)` : ''}</span>
                <span>- RD$ {discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-neutral-500 font-medium">
              <span>ITBIS (18% incluido)</span>
              <span className="font-semibold text-neutral-800">RD$ {itbis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-xl font-black text-neutral-900 pt-2.5 border-t border-neutral-200">
              <span className="tracking-tight">TOTAL</span>
              <span className="font-heading text-2xl font-black">RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  if (cart.length === 0) return;
                  
                  const customerObj = tenantCustomers.find(c => c.id === posCustomerId);
                  const tabName = customerObj ? customerObj.name : "Consumidor Final";
                  
                  const currentTenantConfig = tenants.find(t => t.id === tenantId)?.config;
                  if (currentTenantConfig?.autoDeductInventory) {
                    cart.forEach(item => {
                      if (item.id.startsWith("labor-") || item.sku === "MANO-OBRA" || item.category === "Servicios") return;
                      updateProduct(item.id, { stock: Math.max(0, item.stock - item.quantity) });
                      addMovement({
                        id: `m-pos-tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        tenantId,
                        productId: item.id,
                        productName: item.name,
                        type: "out",
                        quantity: item.quantity,
                        reason: `Cuenta en Espera - Cliente: ${tabName}`,
                        date: new Date().toISOString(),
                      });
                    });
                  }

                  const newTab = {
                    id: `tab-${Date.now()}`,
                    tenantId,
                    tabName,
                    customerId: posCustomerId || "walk-in",
                    mechanicId: posMechanicId || "none",
                    orderId: activeOrderId || null,
                    discount: discount > 0 ? discount : 0,
                    discountType: discount > 0 ? discountType : "fixed",
                    items: cart.map(i => ({ ...i, productId: i.id, deductedQuantity: i.quantity })),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  addOpenTab(newTab);
                  toast.success("Cuenta guardada en espera.");
                  clearSale();
                }}
                className={cn(
                  "py-3.5 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer flex items-center justify-center gap-1.5",
                  cart.length === 0
                    ? "bg-neutral-200/70 text-neutral-400 cursor-not-allowed"
                    : "bg-amber-100/80 text-amber-900 hover:bg-amber-200 border border-amber-200"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Pausar (F8)</span>
              </button>

              <button
                disabled={cart.length === 0}
                onClick={() => {
                  if (!activeCaja) {
                    toast.error("Debe abrir la caja antes de registrar ventas", {
                      action: {
                        label: "Abrir Caja (F4)",
                        onClick: () => router.push(`/${tenant}/caja`),
                      },
                      duration: 6000,
                    });
                    return;
                  }
                  setIsCheckout(true);
                }}
                className={cn(
                  "py-3.5 rounded-xl text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5",
                  cart.length === 0
                    ? "bg-neutral-300 text-neutral-400 cursor-not-allowed shadow-none"
                    : "bg-neutral-950 text-white hover:bg-black active:scale-[0.98]"
                )}
              >
                <span>COBRAR</span>
                <span className="font-normal text-neutral-400 text-[10px]">(F12)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lazy-loaded Dialogs */}
      <Suspense fallback={null}>
        {isOpenTabsDialogOpen && (
          <LazyOpenTabsDialog
            open={isOpenTabsDialogOpen}
            onOpenChange={setIsOpenTabsDialogOpen}
            tenantId={tenantId}
            onLoadTab={(tab) => {
              // Limpiar la mesa
              clearSale();
              
              // Cargar datos del cliente, técnico y descuento
              setPosCustomerId(tab.customerId === "walk-in" ? "" : tab.customerId);
              setPosMechanicId(tab.mechanicId === "none" ? "" : tab.mechanicId);
              if (tab.discount && tab.discount > 0) {
                setDiscount(tab.discount);
                setDiscountType(tab.discountType || "fixed");
              } else {
                setDiscount(0);
                setDiscountType("fixed");
              }
              setActiveOrderId(tab.orderId);
              setCart(tab.items.map(i => ({
                ...i,
                // El item ya fue descontado por su cantidad original al pausar.
                alreadyDeducted: true,
                _fromTabId: tab.id, 
              } as any)));
              
              setIsOpenTabsDialogOpen(false);
              toast.info(`Cuenta de ${tab.tabName} recuperada`);
            }}
          />
        )}
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
