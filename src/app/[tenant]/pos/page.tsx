"use client";

import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { cn, isServiceItem } from "@/lib/utils";
import { useStore, Product, WorkOrder } from "@/store/useStore";
import {
  Search, ShoppingCart, X, Plus,
  Maximize2, Minimize2, Tag, Wrench, ShieldCheck,
  Package, AlertTriangle, CheckCircle, UserCog, FileText, User, FolderOpen, ClipboardList, Wallet,
  LayoutGrid, Disc, Activity, Filter, Droplets, Zap, CircleDot, Cpu, Pause
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
import { submitInvoiceToEf2, buildEf2InvoicePayload, EF2_DEFAULT_TEST_TOKEN } from "@/lib/ecf";
import type { CheckoutConfirmData } from "./POSDialogs";

// Lazy-load dialogs
const LazyCheckout = lazy(() => import("./POSDialogs").then(m => ({ default: m.CheckoutDialog })));
const LazyPrintReceipt = lazy(() => import("./POSDialogs").then(m => ({ default: m.PrintReceiptDialog })));
const LazyLaborModal = lazy(() => import("./POSDialogs").then(m => ({ default: m.LaborModal })));
const LazyLinkOrder = lazy(() => import("./POSDialogs").then(m => ({ default: m.LinkOrderDialog })));
const LazyWarrantyModal = lazy(() => import("./POSDialogs").then(m => ({ default: m.WarrantyModal })));
const LazyOpenTabsDialog = lazy(() => import("./POSDialogs").then(m => ({ default: m.OpenTabsDialog })));

export const getCategoryDetails = (catName?: string, isService?: boolean) => {
  const norm = (catName || "").trim().toLowerCase();
  if (isService || norm === "servicios") {
    return {
      label: catName || "Servicios",
      accent: "bg-neutral-900",
      iconBg: "bg-neutral-900 text-white",
      bg: "bg-neutral-100 text-neutral-800",
      border: "border-neutral-200",
      dot: "bg-neutral-900",
      icon: Wrench,
    };
  }
  if (norm.includes("freno")) {
    return {
      label: catName || "Frenos",
      accent: "bg-rose-500",
      iconBg: "bg-rose-100/90 text-rose-600 border border-rose-200/60",
      bg: "bg-rose-50 text-rose-700",
      border: "border-rose-200/80",
      dot: "bg-rose-500",
      icon: Disc,
    };
  }
  if (norm.includes("suspens")) {
    return {
      label: catName || "Suspensión",
      accent: "bg-violet-500",
      iconBg: "bg-violet-100/90 text-violet-600 border border-violet-200/60",
      bg: "bg-violet-50 text-violet-700",
      border: "border-violet-200/80",
      dot: "bg-violet-500",
      icon: Activity,
    };
  }
  if (norm.includes("filtro")) {
    return {
      label: catName || "Filtros",
      accent: "bg-sky-500",
      iconBg: "bg-sky-100/90 text-sky-600 border border-sky-200/60",
      bg: "bg-sky-50 text-sky-700",
      border: "border-sky-200/80",
      dot: "bg-sky-500",
      icon: Filter,
    };
  }
  if (norm.includes("lubricant") || norm.includes("aceite")) {
    return {
      label: catName || "Lubricantes",
      accent: "bg-amber-400",
      iconBg: "bg-amber-100/90 text-amber-700 border border-amber-200/60",
      bg: "bg-amber-50 text-amber-700",
      border: "border-amber-200/80",
      dot: "bg-amber-500",
      icon: Droplets,
    };
  }
  if (norm.includes("eléctric") || norm.includes("electric")) {
    return {
      label: catName || "Eléctrico",
      accent: "bg-amber-500",
      iconBg: "bg-yellow-100/90 text-yellow-800 border border-yellow-200/60",
      bg: "bg-amber-50 text-amber-800",
      border: "border-amber-300/80",
      dot: "bg-amber-500",
      icon: Zap,
    };
  }
  if (norm.includes("neumátic") || norm.includes("neumatic") || norm.includes("llanta")) {
    return {
      label: catName || "Neumáticos",
      accent: "bg-emerald-500",
      iconBg: "bg-emerald-100/90 text-emerald-600 border border-emerald-200/60",
      bg: "bg-emerald-50 text-emerald-700",
      border: "border-emerald-200/80",
      dot: "bg-emerald-500",
      icon: CircleDot,
    };
  }
  if (norm.includes("motor")) {
    return {
      label: catName || "Motor",
      accent: "bg-orange-500",
      iconBg: "bg-orange-100/90 text-orange-600 border border-orange-200/60",
      bg: "bg-orange-50 text-orange-700",
      border: "border-orange-200/80",
      dot: "bg-orange-500",
      icon: Cpu,
    };
  }
  return {
    label: catName || "Otros",
    accent: "bg-neutral-300",
    iconBg: "bg-neutral-100 text-neutral-600 border border-neutral-200/60",
    bg: "bg-neutral-100/90 text-neutral-600",
    border: "border-neutral-200/80",
    dot: "bg-neutral-400",
    icon: Package,
  };
};

interface CartItem extends Product { quantity: number }

type PayMethod = "cash" | "card" | "transfer";

export default function POSPage() {
  const router = useRouter();
  const { tenant } = useParams();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const quoteId = searchParams.get("quoteId");
  
  const { products, tenants, addInvoice, orders, services, technicians, invoices, updateOrder, cajas, addCajaMovement, updateProduct, addMovement, printSettings, customers, openTabs, addOpenTab, updateOpenTab, deleteOpenTab, quotes, updateQuote } = useStore();
  const currentTenant = tenants.find(t => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { name: "ServiTracks", phone: "", address: "", rnc: "", logo: "" };
  const tenantId = currentTenant?.id ?? "";
  const activeCaja = cajas?.find(c => c.tenant_id === tenantId && c.estado === 'ABIERTA');

  // Filtrar por tenantId para garantizar el aislamiento de datos multi-tenant
  const tenantProducts = tenantId ? products.filter((p) => p.tenantId === tenantId) : [];
  const tenantOrders = tenantId ? orders.filter((o) => o.tenantId === tenantId) : [];
  const tenantServices = tenantId ? services.filter((s) => s.tenantId === tenantId) : [];
  const tenantTechnicians = tenantId ? technicians.filter((t) => t.tenantId === tenantId) : [];

  const tenantOpenTabs = useMemo(() => {
    return openTabs.filter((t) => {
      if (!t) return false;
      if (tenantId && t.tenantId === tenantId) return true;
      if (currentTenant?.slug && t.tenantId === currentTenant.slug) return true;
      if (!t.tenantId) return true;
      return false;
    });
  }, [openTabs, tenantId, currentTenant?.slug]);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [allowExtraInventory, setAllowExtraInventory] = useState(false);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, [orderId]);

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

  const categoryCounts = allPosItems.reduce((acc, p) => {
    const cat = p.category || "Otros";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    // 1. Descartar clicks fantasma o no confiables (sintéticos)
    if (e && !e.isTrusted) {
      console.warn("[POS] Click no confiable descartado:", product.name);
      return;
    }

    // 2. Descartar clicks inmediatos al navegar o cargar (menos de 800ms)
    if (Date.now() - mountTimeRef.current < 800) {
      console.warn("[POS] Click descartado durante transición de pantalla:", product.name);
      return;
    }

    // 3. Si hay una orden activa vinculada y NO se ha habilitado agregar extras, bloquear adición
    // El usuario ordenó: "aqui no quiero que agregue nada de inventario, solo debe lo seleccionado en la cotizacion y ya"
    if (activeOrderId && !allowExtraInventory) {
      toast.warning("Venta vinculada a Orden/Cotización", {
        description: `Esta venta solo contiene los ítems aprobados en la cotización. Para agregar productos fuera de la orden, pulse '+ Permitir agregar extras' en la barra superior.`,
        duration: 4000,
      });
      return;
    }

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
      if (activeOrderId && !allowExtraInventory) {
        toast.warning("Venta vinculada a Orden/Cotización. Catálogo bloqueado para evitar agregar repuestos fuera de la cotización.");
        setSearch("");
        return;
      }
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
    setAllowExtraInventory(false);
    if (order.mechanicId) {
      setPosMechanicId(order.mechanicId);
    }
    if (order.customerId) {
      setPosCustomerId(order.customerId);
    }
    setDiscount(0);
    setDiscountType("fixed");
    
    // Set active service IDs immediately to filter inventory
    const sids = order.serviceIds || [];
    setActiveServiceIds(sids);
    setCategory("Todos");

    // Limpiar carrito por completo antes de cargar la orden para evitar arrastrar residuos
    setCart([]);

    // 1. Si la orden tiene items completos guardados (ej. desde una cotización), cargarlos directamente
    if ((order as any).items && (order as any).items.length > 0) {
      const rawItems = (order as any).items;
      // REGLA: Los servicios que no tienen un monto establecido (o monto < 1) NO deben pasar a facturación
      const itemsToLoad = rawItems.filter((it: any) => {
        const isService = Boolean(
          it.serviceId || 
          it.type === "service" ||
          it.category === "Servicios" ||
          tenantServices.some(s => s.id === it.serviceId || s.name.toLowerCase().trim() === it.name?.toLowerCase().trim()) ||
          (!it.productId && (
            it.name?.toLowerCase().includes("mantenimiento") ||
            it.name?.toLowerCase().includes("servicio") ||
            it.name?.toLowerCase().includes("mano de obra") ||
            it.name?.toLowerCase().includes("alineación") ||
            it.name?.toLowerCase().includes("alineacion") ||
            it.name?.toLowerCase().includes("diagnostico") ||
            it.name?.toLowerCase().includes("diagnóstico") ||
            it.name?.toLowerCase().includes("revisión") ||
            it.name?.toLowerCase().includes("revision") ||
            it.name?.toLowerCase().includes("chequeo") ||
            it.name?.toLowerCase().includes("labor")
          ))
        );

        const price = Number(it.unitPrice ?? it.price ?? it.salePrice ?? 0);
        if (isService && price < 1) {
          return false;
        }
        return true;
      });

      const newCart: CartItem[] = itemsToLoad.map((it: any) => {
        const taxRate = typeof it.taxPercentage === "number" ? it.taxPercentage : 18;
        const grossPrice = it.unitPrice ? it.unitPrice * (1 + taxRate / 100) : (it.price || it.salePrice || 0);

        const existingProduct = it.productId ? allPosItems.find((p) => p.id === it.productId) : null;
        const existingService = it.serviceId ? tenantServices.find((s) => s.id === it.serviceId) : null;

        if (existingProduct) {
          return {
            ...existingProduct,
            name: it.name || existingProduct.name,
            salePrice: grossPrice,
            tax: taxRate,
            quantity: it.quantity || 1,
          };
        }

        if (existingService) {
          return {
            ...serviceToProduct(existingService),
            name: it.name || existingService.name,
            salePrice: grossPrice,
            tax: taxRate,
            quantity: it.quantity || 1,
          };
        }

        const isService = Boolean(
          it.serviceId || 
          it.name?.toLowerCase().includes("mano de obra") || 
          it.name?.toLowerCase().includes("servicio") ||
          it.name?.toLowerCase().includes("diagnostico") ||
          it.name?.toLowerCase().includes("diagnóstico")
        );

        return {
          id: it.productId || it.serviceId || it.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenantId || order.tenantId,
          name: it.name,
          sku: isService ? "MANO-OBRA" : "REPUESTO",
          category: isService ? "Servicios" : "Repuestos",
          costPrice: 0,
          salePrice: grossPrice,
          laborPrice: isService ? grossPrice : undefined,
          stock: 9999,
          minStock: 0,
          tax: taxRate,
          quantity: it.quantity || 1,
        };
      });

      setCart(newCart);
      toast.success(`Orden vinculada — ${newCart.length} ítems agregados al carrito`);
      return;
    }

    if (sids.length > 0 || (order.parts && order.parts.length > 0) || (order.customServices && order.customServices.length > 0) || (order.customParts && order.customParts.length > 0)) {
      setCart(() => {
        let newCart: CartItem[] = [];
        
        // Add services con precio establecido >= 1
        if (sids.length > 0) {
          const servicesToAdd = tenantServices.filter(s => s && sids.includes(s.id));
          servicesToAdd.forEach(s => {
            const sPrice = Number(s.price || 0);
            const sLabor = Number(s.laborPrice || 0);
            if (sPrice >= 1 || sLabor >= 1) {
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
            if (!part || !part.productId || typeof part.productId !== 'string' || !part.productId.trim()) return;
            const product = allPosItems.find(p => p && p.id && p.id === part.productId);
            if (product) {
              const ex = newCart.find(i => i.id === product.id);
              const finalPrice = (part as any).price || product.salePrice;
              if (ex) {
                newCart = newCart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + (part.quantity || 1) } : i);
              } else {
                const isService = product.sku?.startsWith('SRV-') || product.category === 'Servicios';
                const calculatedLaborPrice = isService
                  ? product.laborPrice
                  : (product.laborPrice ? (product.salePrice * product.laborPrice) / 100 : undefined);
                newCart.push({ ...product, salePrice: finalPrice, quantity: part.quantity || 1, laborPrice: calculatedLaborPrice });
              }
            } else {
              // Fallback para repuestos no encontrados en el catálogo
              newCart.push({
                id: part.productId,
                tenantId: tenantId,
                name: (part as any).name || "Repuesto de Cotización",
                sku: "REPUESTO",
                category: "Repuestos",
                costPrice: 0,
                salePrice: (part as any).price || 0,
                stock: 9999,
                minStock: 0,
                tax: (part as any).tax ?? 18,
                quantity: part.quantity || 1,
              });
            }
          });
        }

        // Add custom services (e.g. ad-hoc labor from quotes)
        if (order.customServices && order.customServices.length > 0) {
          order.customServices.forEach((cs: any) => {
            if (!cs || !cs.name) return;
            const csPrice = Number(cs.price || 0);
            if (csPrice < 1) return; // REGLA: Los servicios sin monto establecido (< 1) no pasan a facturación
            newCart.push({
              id: `labor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              tenantId: tenantId,
              name: cs.name,
              sku: "MANO-OBRA",
              category: "Servicios",
              costPrice: 0,
              salePrice: csPrice,
              laborPrice: csPrice,
              stock: 9999,
              minStock: 0,
              tax: typeof cs.tax === 'number' ? cs.tax : 0,
              quantity: 1,
            });
          });
        }

        // Add custom/external parts (repuestos libres/externos sin afectar catálogo de inventario)
        if (order.customParts && order.customParts.length > 0) {
          order.customParts.forEach((cp: any) => {
            if (!cp || !cp.name) return;
            newCart.push({
              id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              tenantId: tenantId,
              name: cp.name,
              sku: "EXTERNO",
              category: "Repuestos Externos",
              costPrice: 0,
              salePrice: cp.price || 0,
              stock: 9999,
              minStock: 0,
              tax: typeof cp.tax === 'number' ? cp.tax : 18,
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

  // Cargar directamente desde una Cotización
  const handleLoadFromQuote = (targetQuote: any, linkedOrderId?: string) => {
    if (linkedOrderId) {
      setActiveOrderId(linkedOrderId);
    }
    setAllowExtraInventory(false);
    if (targetQuote.customerId) {
      setPosCustomerId(targetQuote.customerId);
    }
    if (targetQuote.discount && targetQuote.discount > 0) {
      setDiscount(targetQuote.discount);
      setDiscountType("fixed");
    } else {
      setDiscount(0);
      setDiscountType("fixed");
    }

    setCategory("Todos");
    setCart([]);

    const rawItems = targetQuote.items || [];
    // REGLA: Los servicios que no tienen un monto establecido (o monto < 1) NO deben pasar a facturación
    const itemsToLoad = rawItems.filter((it: any) => {
      const isService = Boolean(
        it.serviceId || 
        it.type === "service" ||
        it.category === "Servicios" ||
        tenantServices.some(s => s.id === it.serviceId || s.name.toLowerCase().trim() === it.name?.toLowerCase().trim()) ||
        (!it.productId && (
          it.name?.toLowerCase().includes("mantenimiento") ||
          it.name?.toLowerCase().includes("servicio") ||
          it.name?.toLowerCase().includes("mano de obra") ||
          it.name?.toLowerCase().includes("alineación") ||
          it.name?.toLowerCase().includes("alineacion") ||
          it.name?.toLowerCase().includes("diagnostico") ||
          it.name?.toLowerCase().includes("diagnóstico") ||
          it.name?.toLowerCase().includes("revisión") ||
          it.name?.toLowerCase().includes("revision") ||
          it.name?.toLowerCase().includes("chequeo") ||
          it.name?.toLowerCase().includes("labor")
        ))
      );

      const price = Number(it.unitPrice ?? it.price ?? it.salePrice ?? 0);
      if (isService && price < 1) {
        return false;
      }
      return true;
    });
    if (itemsToLoad.length > 0) {
      const newCart: CartItem[] = itemsToLoad.map((it: any) => {
        const taxRate = typeof it.taxPercentage === "number" ? it.taxPercentage : 18;
        // In Quote, unitPrice is net. In POS Cart, salePrice is gross (net * (1 + taxRate/100))
        const grossPrice = it.unitPrice ? it.unitPrice * (1 + taxRate / 100) : (it.salePrice || 0);

        const existingProduct = it.productId ? allPosItems.find((p) => p.id === it.productId) : null;
        const existingService = it.serviceId ? tenantServices.find((s) => s.id === it.serviceId) : null;

        if (existingProduct) {
          return {
            ...existingProduct,
            name: it.name || existingProduct.name,
            salePrice: grossPrice,
            tax: taxRate,
            quantity: it.quantity || 1,
          };
        }

        if (existingService) {
          return {
            ...serviceToProduct(existingService),
            name: it.name || existingService.name,
            salePrice: grossPrice,
            tax: taxRate,
            quantity: it.quantity || 1,
          };
        }

        const isService = Boolean(
          it.serviceId || 
          it.name?.toLowerCase().includes("mano de obra") || 
          it.name?.toLowerCase().includes("servicio") ||
          it.name?.toLowerCase().includes("diagnostico") ||
          it.name?.toLowerCase().includes("diagnóstico")
        );

        return {
          id: it.productId || it.serviceId || it.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenantId || targetQuote.tenantId,
          name: it.name,
          sku: isService ? "MANO-OBRA" : "REPUESTO",
          category: isService ? "Servicios" : "Repuestos",
          costPrice: 0,
          salePrice: grossPrice,
          laborPrice: isService ? grossPrice : undefined,
          stock: 9999,
          minStock: 0,
          tax: taxRate,
          quantity: it.quantity || 1,
        };
      });

      setCart(newCart);
      toast.success(`Cotización ${targetQuote.quoteNumber || ""} cargada al carrito (${newCart.length} ítems)`);
    } else {
      toast.info("La cotización no tiene artículos registrados");
    }
  };

  const autoLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const currentKey = `${orderId || ""}_${quoteId || ""}`;
    if (!currentKey || currentKey === "_") return;
    if (autoLoadedKeyRef.current === currentKey) return;

    // 1. Intentar cargar directamente desde cotización si quoteId está en la URL
    if (quoteId) {
      const targetQuote = quotes.find((q) => q.id === quoteId);
      if (targetQuote && targetQuote.items && targetQuote.items.length > 0) {
        autoLoadedKeyRef.current = currentKey;
        handleLoadFromQuote(targetQuote, orderId || undefined);
        return;
      }
    }

    // 2. Intentar cargar desde orden de trabajo
    if (orderId) {
      const targetOrder = orders.find((o) => o.id === orderId) || tenantOrders.find((o) => o.id === orderId);
      if (targetOrder) {
        autoLoadedKeyRef.current = currentKey;
        handleSelectOrder(targetOrder);
        return;
      }
    }
  }, [orderId, quoteId, orders, quotes, tenantOrders]);

  const handleCheckout = async (checkoutData: CheckoutConfirmData) => {
    if (!posMechanicId || posMechanicId === "none") {
      toast.error("Debe asignar un técnico o mecánico a la factura"); return;
    }

    const {
      type: customerFiscalType,
      rnc: customerRnc,
      name: customerName,
      isFiscalEnabled,
      condicionCobro,
      instrumentoPago,
      paidAmount,
      pendingAmount,
      cashReceived: receivedCash,
      change: cashChange,
      creditDays,
      referencia,
      desgloseMixto,
    } = checkoutData;

    const currentTenantConfig = tenants.find(t => t.id === tenantId)?.config;
    const ecfConfig = currentTenantConfig?.ecfConfig;
    const isEcfEnabled = Boolean(isFiscalEnabled && (ecfConfig?.token || ecfConfig?.rnc));
    
    // Determinar tipo de comprobante e-CF según orden o selección de checkout
    const orderNcfType = currentOrder?.ncfType;
    let invoiceType = "32";
    if (customerFiscalType === 'credito_fiscal' || orderNcfType === "E31" || currentOrder?.customerType === 'credito_fiscal') {
      invoiceType = "31";
    } else if (customerFiscalType === 'gubernamental' || orderNcfType === "E45" || currentOrder?.customerType === 'gubernamental') {
      invoiceType = "45";
    } else if (customerFiscalType === 'regimen_especial' || orderNcfType === "E44" || currentOrder?.customerType === 'regimen_especial') {
      invoiceType = "44";
    } else if (orderNcfType) {
      invoiceType = orderNcfType.replace(/\D/g, "");
    }

    let finalNcf: string | undefined = undefined;
    let securityCode: string | undefined = undefined;
    let qrUrl: string | undefined = undefined;
    let signatureDate: string | undefined = undefined;
    
    // Lógica para asignar e-NCF según tipo de cliente vía EF2 SOLO SI LA FACTURACIÓN FISCAL ESTÁ ACTIVADA
    if (isFiscalEnabled) {
      if (isEcfEnabled) {
        try {
          toast.info("Emitiendo Comprobante Fiscal Electrónico con EF2...", { id: "ecf-submit" });
          
          const activeToken = ecfConfig?.token?.trim() || EF2_DEFAULT_TEST_TOKEN;
          const buyerRnc = customerRnc || currentOrder?.customerRnc;
          const buyerName = customerName || currentOrder?.customerBusinessName;

          const docPayload = buildEf2InvoicePayload({
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
            payMethod: instrumentoPago === 'EFECTIVO' ? 'cash' : instrumentoPago === 'TARJETA' ? 'card' : 'transfer',
            issuer: {
              rnc: ecfConfig?.rnc || taller.rnc,
              businessName: ecfConfig?.businessName || taller.name,
              address: taller.address,
              phone: taller.phone,
            },
            buyer: (buyerRnc || buyerName) ? {
              rnc: buyerRnc,
              name: buyerName,
            } : undefined,
          });

          const result = await submitInvoiceToEf2(activeToken, docPayload);
          
          if (result && result.ncf) {
             finalNcf = result.ncf;
             securityCode = result.codigo_seguridad;
             qrUrl = result.qr_link;
             signatureDate = result.fecha_firma ? new Date(result.fecha_firma).toISOString() : new Date().toISOString();
             toast.success(`Factura Electrónica e-CF emitida exitosamente (${finalNcf})`, { id: "ecf-submit" });
          } else {
             throw new Error(result?.message || result?.error || "EF2 no devolvió un e-NCF válido");
          }
        } catch (err: any) {
          console.error("Error EF2 / DGII:", err);
          finalNcf = invoiceType === "31" ? `B01-${String(Date.now()).slice(-8)}` : `B02-${String(Date.now()).slice(-8)}`;
          toast.error(`Error al emitir con EF2: ${err.message || "Conexión fallida"}. Se generó comprobante NCF tradicional.`, { id: "ecf-submit", duration: 6000 });
        }
      } else {
        const isCreditFiscal = customerFiscalType === 'credito_fiscal' || (posCustomerId && posCustomerId !== "walk-in" && customers.find(c => c.id === posCustomerId)?.rnc);
        finalNcf = invoiceType === "31" || isCreditFiscal
          ? `B01-${String(Date.now()).slice(-8)}`
          : invoiceType === "45"
          ? `B15-${String(Date.now()).slice(-8)}`
          : invoiceType === "44"
          ? `B14-${String(Date.now()).slice(-8)}`
          : `B02-${String(Date.now()).slice(-8)}`;
      }
    }

    const finalCustomerId = currentOrder?.customerId || posCustomerId || "walk-in";
    const selectedTech = posMechanicId ? technicians.find(t => t.id === posMechanicId) : null;

    const finalPayMethod: 'cash' | 'card' | 'transfer' | 'credit' = 
      condicionCobro === 'CREDITO' ? 'credit' :
      instrumentoPago === 'EFECTIVO' ? 'cash' :
      instrumentoPago === 'TARJETA' ? 'card' :
      instrumentoPago === 'TRANSFERENCIA' ? 'transfer' : 'card';

    setPayMethod(finalPayMethod === 'credit' ? 'card' : finalPayMethod);
    setCashReceived(String(receivedCash));

    const inv = {
      id: `inv-${Date.now()}`,
      tenantId: tenantId,
      customerId: finalCustomerId,
      customerName: customerName || (finalCustomerId !== "walk-in" ? customers.find(c => c.id === finalCustomerId)?.name : undefined),
      customerRnc: customerRnc || undefined,
      vehicleId: currentOrder?.vehicleId || undefined,
      orderId: activeOrderId || undefined,
      mechanicId: posMechanicId || undefined,
      items: cart.map((i) => {
        const itemIsService = isServiceItem(i, tenantServices);
        let itemCommission = 0;
        if (selectedTech && selectedTech.pagoNomina && itemIsService) {
          if (selectedTech.tipoPago === "fijo") {
            itemCommission = selectedTech.pagoNomina;
          } else {
            itemCommission = (i.salePrice * selectedTech.pagoNomina) / 100;
          }
        } else if (itemIsService && (i.id.startsWith("labor-") || i.sku === "MANO-OBRA")) {
          itemCommission = i.laborPrice ?? i.salePrice;
        }

        return { 
          id: `ii-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: i.id, 
          serviceId: itemIsService ? ((i as any).serviceId || i.id) : undefined,
          name: i.name, 
          quantity: i.quantity, 
          unitPrice: i.salePrice / (1 + (i.tax ?? 18) / 100), 
          tax: (i.salePrice * i.quantity) - ((i.salePrice / (1 + (i.tax ?? 18) / 100)) * i.quantity),
          laborPrice: itemCommission,
          alreadyDeducted: (i as any).alreadyDeducted || false,
        };
      }),
      subtotal, tax: itbis, total, discount: discountAmount,
      paidAmount,
      pendingAmount,
      condicionCobro,
      paymentMethod: finalPayMethod,
      status: pendingAmount > 0 ? "pending" as const : "paid" as const,
      ncf: finalNcf,
      securityCode: securityCode || undefined,
      qrUrl: qrUrl || undefined,
      signatureDate: signatureDate || undefined,
      notes: JSON.stringify({
        condicionCobro,
        instrumentoPago,
        paidAmount,
        pendingAmount,
        creditDays,
        referencia,
        desgloseMixto,
      }),
      createdAt: new Date().toISOString(),
    };
    addInvoice(inv);

    if (activeCaja && paidAmount > 0) {
      let laborTotal = 0;
      cart.forEach(item => {
        if (item.id.startsWith("labor-") || item.name.toLowerCase() === "mano de obra") {
          laborTotal += ((item.laborPrice ?? item.salePrice) || 0) * item.quantity;
        } else {
          laborTotal += (item.laborPrice || 0) * item.quantity;
        }
      });
      const monto_mano_obra = laborTotal;

      const conceptoLabel = 
        condicionCobro === 'ANTICIPO' ? `Anticipo POS (${Math.round((paidAmount / total) * 100)}%) - Factura` :
        condicionCobro === 'CREDITO' ? `Abono Crédito POS - Factura` :
        `Venta POS - Factura`;

      const cajaMetodo = 
        instrumentoPago === 'EFECTIVO' ? 'EFECTIVO' :
        instrumentoPago === 'TARJETA' ? 'TARJETA' :
        instrumentoPago === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'TARJETA';

      addCajaMovement({
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: tenantId,
        caja_id: activeCaja.id,
        empleado_id: activeCaja.empleado_id,
        tipo: 'VENTA',
        concepto: `${conceptoLabel} ${inv.ncf || inv.id}`,
        monto: paidAmount,
        monto_mano_obra: monto_mano_obra > 0 ? (monto_mano_obra * (paidAmount / total)) : undefined,
        metodo: cajaMetodo,
        creado_en: new Date().toISOString(),
      });
    }
    if (activeOrderId) {
      updateOrder(activeOrderId, { status: "invoiced" });
    }
    if (quoteId) {
      updateQuote(quoteId, { status: "accepted" });
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
          : "h-full w-full overflow-hidden flex-1"
      )}>

        {/* ── Left: Products ── */}
        <div className="flex flex-1 flex-col bg-neutral-50 overflow-hidden">
          {currentOrder && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Badge className="bg-amber-500 text-white hover:bg-amber-600 font-bold">ORDEN #{currentOrder.id.slice(-6).toUpperCase()}</Badge>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 truncate max-w-[420px]">
                  <span>Facturando cotización:</span>
                  <span className="text-amber-800 font-medium truncate">{currentOrder.description}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-800 bg-amber-100/60 hidden sm:inline-flex">
                  🔒 Solo ítems de cotización
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-7 text-xs font-bold transition-all",
                    allowExtraInventory
                      ? "border-amber-400 bg-amber-100 text-amber-900"
                      : "border-amber-200 text-amber-800 hover:bg-amber-100/80 bg-white"
                  )}
                  onClick={() => setAllowExtraInventory(!allowExtraInventory)}
                >
                  {allowExtraInventory ? "Bloquear catálogo" : "+ Permitir agregar extras"}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-amber-800 hover:bg-amber-100 text-xs font-bold" onClick={() => { setActiveOrderId(null); setCart([]); setActiveServiceIds([]); setCategory("Todos"); setAllowExtraInventory(false); window.history.replaceState({}, '', window.location.pathname); }}>
                  <X className="h-3 w-3 mr-1" /> Quitar vínculo
                </Button>
              </div>
            </div>
          )}

          {/* Top bar */}
          <div id="tour-pos-search" className="flex items-center gap-3 bg-white border-b border-neutral-200 px-4 py-3 overflow-hidden">
            <div className="relative flex-1 min-w-[150px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input ref={searchRef} placeholder="Buscar producto (F1)..."
                className="pl-9 h-9 rounded-lg bg-neutral-50 border-neutral-200 text-sm w-full"
                value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleBarcodeScan} />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">

              <Button 
                onClick={() => setIsOpenTabsDialogOpen(true)}
                variant="outline"
                title="Cuentas Abiertas"
                className={cn(
                  "h-9 gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-all font-bold shrink-0",
                  isFullscreen ? "px-2.5 lg:px-4" : "px-2.5 2xl:px-4",
                  tenantOpenTabs.length > 0 && "border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                <span className={isFullscreen ? "hidden lg:inline" : "hidden 2xl:inline"}>Cuentas</span>
                {tenantOpenTabs.length > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">{tenantOpenTabs.length}</Badge>
                )}
              </Button>

              <Button 
                onClick={() => setIsLinkOrderOpen(true)}
                variant="outline"
                title="Vincular Orden"
                className={cn(
                  "h-9 gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-all font-bold shrink-0",
                  isFullscreen ? "px-2.5 lg:px-4" : "px-2.5 2xl:px-4"
                )}
              >
                <ClipboardList className="h-4 w-4 text-neutral-500" />
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
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0 custom-scrollbar bg-white/70 border-b border-neutral-200/70 items-center">
            {CATEGORIES.map((cat) => {
              const isAll = cat === "Todos";
              const details = isAll 
                ? { label: "Todos", icon: LayoutGrid, dot: "bg-neutral-900" } 
                : getCategoryDetails(cat);
              const CatIcon = details.icon;
              const count = isAll ? allPosItems.length : (categoryCounts[cat] || 0);
              const isSelected = category === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "h-8.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0",
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                      : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border-neutral-200/90 shadow-2xs hover:border-neutral-300"
                  )}
                >
                  <CatIcon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-white" : "text-neutral-400")} />
                  <span>{cat}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    isSelected ? "bg-neutral-800 text-neutral-200" : "bg-neutral-100 text-neutral-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Product grid: 5 columnas en fullscreen, 4 columnas en modo normal */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 pb-4">
            <div className={cn(
              "grid gap-3 sm:gap-3.5 items-stretch",
              isFullscreen
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
            )}>
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.id === product.id);
                const isService = product.category === "Servicios" || product.stock >= 9000 || product.sku?.startsWith("SRV") || product.name.toLowerCase().includes("alineación") || product.name.toLowerCase().includes("mantenimiento") || product.name.toLowerCase().includes("mano de obra");
                const isLowStock = !isService && product.stock > 0 && product.stock <= 5;
                const isOutOfStock = !isService && product.stock <= 0;
                const catDetails = getCategoryDetails(product.category, isService);
                const CatCardIcon = catDetails.icon;
                const isOrderLocked = Boolean(activeOrderId && !allowExtraInventory);

                return (
                  <button 
                    key={product.id} 
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(product, e);
                    }}
                    disabled={isOutOfStock || isOrderLocked}
                    title={isOrderLocked ? "Catálogo bloqueado a los ítems de la cotización activa" : product.name}
                    className={cn(
                      "relative text-left rounded-2xl border transition-all duration-200 group flex flex-col justify-between min-h-[195px] sm:min-h-[205px] min-w-0 bg-white shadow-2xs overflow-hidden",
                      isOutOfStock
                        ? "opacity-60 cursor-not-allowed bg-neutral-100 border-neutral-200"
                        : isOrderLocked
                          ? "opacity-65 cursor-not-allowed border-neutral-200 bg-neutral-50/50 hover:border-neutral-200"
                          : "border-neutral-200/90 hover:border-neutral-900 hover:shadow-md hover:-translate-y-1 active:scale-[0.98]",
                      inCart && "border-black ring-2 ring-black/10 shadow-sm bg-neutral-50/30"
                    )}>
                    {/* Barra Superior de Acento Suave */}
                    <div className={cn("h-1.5 w-full shrink-0", catDetails.accent)} />

                    <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
                      {/* Top: Categoría + Marca + Cantidad en Carrito */}
                      <div>
                        <div className="flex items-center justify-between gap-2 min-w-0 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform",
                              catDetails.iconBg
                            )}>
                              <CatCardIcon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-black text-neutral-900 leading-tight truncate">
                                {product.category || "Otros"}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 truncate mt-0.5">
                                {product.brand || "Genérico"}
                              </span>
                            </div>
                          </div>

                          {/* Badge de Cantidad en Carrito */}
                          {inCart && (
                            <div className="h-5.5 min-w-[22px] px-1.5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-black shadow-sm shrink-0">
                              {inCart.quantity}
                            </div>
                          )}
                        </div>

                        {/* Nombre del Producto / Servicio */}
                        <h3 className="text-xs sm:text-[13px] font-bold text-neutral-800 leading-snug line-clamp-2 my-1.5 group-hover:text-black transition-colors" title={product.name}>
                          {product.name}
                        </h3>
                        {product.sku && (
                          <span className="text-[10px] font-mono text-neutral-400 block truncate">
                            {product.sku}
                          </span>
                        )}
                      </div>

                      {/* Bottom: Fila de Stock independiente + Fila de Precio y Botón */}
                      <div className="pt-2 mt-3 border-t border-neutral-100 flex flex-col gap-2">
                        {/* Fila de Stock / Disponibilidad (Nunca colisiona con el precio) */}
                        <div className="flex items-center justify-between">
                          {isService ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-neutral-900 text-white shadow-2xs">
                              <Wrench className="h-3 w-3 text-neutral-300" />
                              <span>Servicio</span>
                            </div>
                          ) : (
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                              isOutOfStock ? "bg-rose-50 text-rose-700 border-rose-200" :
                              isLowStock ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            )}>
                              {isOutOfStock ? (
                                <><AlertTriangle className="h-3 w-3 shrink-0" /> <span>Agotado</span></>
                              ) : isLowStock ? (
                                <><Package className="h-3 w-3 shrink-0" /> <span>Solo {product.stock} disp.</span></>
                              ) : (
                                <><CheckCircle className="h-3 w-3 shrink-0 text-emerald-600" /> <span>{product.stock} disponibles</span></>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Fila de Precio */}
                        <div className="pt-2 border-t border-neutral-100 flex flex-col min-w-0">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400 leading-none">Precio</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            {product.salePrice > 0 ? (
                              <>
                                <span className="text-[10px] font-bold text-neutral-400">RD$</span>
                                <span className="text-base sm:text-lg font-black text-neutral-950 tracking-tight whitespace-nowrap">
                                  {product.salePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded uppercase">Variable</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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

          {/* Mobile Cart Toggle Bar */}
          <div className="lg:hidden bg-white border-t border-neutral-200 p-3 shrink-0 z-50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
            <Button onClick={() => setShowMobileCart(true)} className="w-full h-12 bg-black text-white font-bold rounded-xl flex items-center justify-between px-4 hover:bg-neutral-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Ver Carrito</span>
                <Badge className="bg-neutral-800 text-white ml-1 border-none font-bold hover:bg-neutral-800">{cart.length}</Badge>
              </div>
              <span>RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </Button>
          </div>
        </div>

        {/* ── Right: Cart ── */}
        <div id="tour-pos-payment" className={cn(
          "flex w-full lg:w-[380px] xl:w-[420px] 2xl:w-[440px] shrink-0 flex-col bg-white lg:border-l border-neutral-200",
          "fixed lg:relative inset-0 lg:inset-auto z-[200] lg:z-auto transition-transform duration-300",
          showMobileCart ? "translate-y-0" : "translate-y-full lg:translate-y-0"
        )}>
          <div className="border-b border-neutral-100 bg-white p-3.5 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-neutral-800" />
                <span className="font-bold text-lg">Venta</span>
              </div>
              <div className="flex items-center gap-3">
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
                    className="text-xs font-bold text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Vaciar
                  </button>
                )}
                <button className="lg:hidden p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors" onClick={() => setShowMobileCart(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Barra Superior de Opciones Rápidas: Cliente, Técnico y Descuento ── */}
            <div className="grid grid-cols-3 gap-1.5 w-full">
              {/* Cliente */}
              <div className="relative w-full">
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger className={cn(
                    "flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg border text-[11px] font-bold transition-all w-full min-w-0",
                    posCustomerId 
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm pr-6"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-neutral-300"
                  )}>
                    <User className={cn("h-3.5 w-3.5 shrink-0", posCustomerId ? "text-neutral-300" : "text-neutral-400")} />
                    <span className="truncate">
                      {posCustomerId ? tenantCustomers.find((c) => c.id === posCustomerId)?.name ?? "Cliente" : "Cliente"}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-2 z-[200] shadow-xl rounded-xl border border-neutral-200 bg-white" align="start">
                    <Input 
                      placeholder="Buscar por nombre, teléfono o RNC..." 
                      value={posCustomerSearch}
                      onChange={(e) => setPosCustomerSearch(e.target.value)}
                      className="h-9 mb-2 text-xs rounded-lg border-neutral-200"
                    />
                    <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                      <button 
                        onClick={() => { setPosCustomerId(""); setCustomerPopoverOpen(false); setPosCustomerSearch(""); }}
                        className={cn("w-full text-left px-3 py-2 text-xs rounded-lg font-bold transition-colors", !posCustomerId ? "bg-black text-white" : "hover:bg-neutral-100 text-rose-600")}
                      >
                        Consumidor Final (Sin Cliente)
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
                    "flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg border text-[11px] font-bold transition-all w-full min-w-0",
                    posMechanicId 
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm pr-6"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-neutral-300"
                  )}>
                    <UserCog className={cn("h-3.5 w-3.5 shrink-0", posMechanicId ? "text-neutral-300" : "text-neutral-400")} />
                    <span className="truncate">
                      {posMechanicId ? technicians.find((t) => t.id === posMechanicId)?.name ?? "Técnico" : "Técnico"}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-2 z-[200] shadow-xl rounded-xl border border-neutral-200 bg-white" align="center">
                    <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                      <button 
                        onClick={() => { setPosMechanicId(""); setTechnicianPopoverOpen(false); }}
                        className={cn("w-full text-left px-3 py-2 text-xs rounded-lg font-bold transition-colors", !posMechanicId ? "bg-black text-white" : "hover:bg-neutral-100 text-rose-600")}
                      >
                        Sin asignar
                      </button>
                      {tenantTechnicians.filter((t) => t.status === "active" || t.id === posMechanicId).map((t) => (
                        <button 
                          key={t.id}
                          onClick={() => { setPosMechanicId(t.id); setTechnicianPopoverOpen(false); }}
                          className={cn("w-full text-left px-3 py-2 text-xs rounded-lg transition-colors font-bold", posMechanicId === t.id ? "bg-black text-white text-left" : "hover:bg-neutral-100 text-left")}
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
                    "flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg border text-[11px] font-bold transition-all w-full min-w-0",
                    discount > 0
                      ? discountType === "fixed"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm pr-6"
                        : "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm pr-6"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-neutral-300"
                  )}>
                    <Tag className={cn("h-3.5 w-3.5 shrink-0", discount > 0 ? (discountType === "fixed" ? "text-emerald-600" : "text-indigo-600") : "text-neutral-400")} />
                    <span className="truncate">{discount > 0 ? (discountType === "fixed" ? `RD$${discount}` : `${discount}%`) : "Descuento"}</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-3 z-[200] shadow-xl rounded-xl border border-neutral-200 bg-white" align="end">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-bold text-neutral-700">
                        <span>Aplicar Descuento</span>
                        {discount > 0 && (
                          <button type="button" onClick={() => setDiscount(0)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">
                            Quitar
                          </button>
                        )}
                      </div>
                    <div className="flex items-center gap-2">
                      {/* Segmented control con colores distintivos */}
                      <div className="flex bg-neutral-100 p-0.5 rounded-lg text-xs font-bold border border-neutral-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDiscountType("fixed")}
                          className={cn(
                            "px-2.5 py-1 rounded-md transition-all text-[11px]",
                            discountType === "fixed"
                              ? "bg-emerald-600 text-white shadow-sm font-black"
                              : "text-neutral-500 hover:text-neutral-900"
                          )}
                        >
                          RD$
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType("percent")}
                          className={cn(
                            "px-2.5 py-1 rounded-md transition-all text-[11px]",
                            discountType === "percent"
                              ? "bg-indigo-600 text-white shadow-sm font-black"
                              : "text-neutral-500 hover:text-neutral-900"
                          )}
                        >
                          %
                        </button>
                      </div>

                      {/* Input de descuento con símbolo dinámico prefijado */}
                      <div className="relative flex-1 flex items-center">
                        <span className={cn(
                          "absolute left-2.5 text-[11px] font-black pointer-events-none select-none transition-colors",
                          discountType === "fixed" ? "text-emerald-600" : "text-indigo-600"
                        )}>
                          {discountType === "fixed" ? "RD$" : "%"}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max={discountType === "percent" ? "100" : undefined}
                          placeholder="0"
                          value={discount || ""}
                          onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className={cn(
                            "h-8 w-full text-right font-bold text-xs rounded-lg transition-colors border",
                            discountType === "fixed"
                              ? "pl-9 pr-2.5 border-emerald-200 focus-visible:ring-emerald-500 text-emerald-900"
                              : "pl-7 pr-2.5 border-indigo-200 focus-visible:ring-indigo-500 text-indigo-900"
                          )}
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
                  className={cn(
                    "absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors z-10 cursor-pointer",
                    discountType === "fixed" ? "hover:bg-emerald-200 text-emerald-700" : "hover:bg-indigo-200 text-indigo-700"
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <ShoppingCart className="h-10 w-10 text-neutral-200 mb-3" />
                <p className="text-sm text-neutral-400">Selecciona productos</p>
                <p className="text-xs text-neutral-300 mt-1">F1 buscar • F4 caja • F12 cobrar</p>
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
                            disabled={!item.sku?.startsWith('SRV-') && item.category !== 'Servicios' && !item.id.startsWith('labor-') && item.quantity >= (item.stock ?? 0)}
                            className="h-6 w-6 rounded-md border border-neutral-200 text-neutral-500 hover:border-black hover:text-black transition-colors flex items-center justify-center text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-neutral-200 disabled:hover:text-neutral-500">
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
          <div className="border-t border-neutral-200 bg-neutral-50/80 p-4 sm:p-5 space-y-3 shrink-0">
            {/* Card de Resumen con Subtotal, Descuento, ITBIS y Total */}
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-2xs space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm text-neutral-500">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold text-neutral-800">RD$ {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs sm:text-sm text-rose-600 font-semibold items-center">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Descuento {discountType === "percent" ? `(${discount}%)` : ''}
                  </span>
                  <span>- RD$ {discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-xs sm:text-sm text-neutral-500">
                <span className="font-medium">ITBIS (18%)</span>
                <span className="font-semibold text-neutral-800">RD$ {itbis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2.5 border-t border-neutral-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-black text-neutral-900 tracking-wide uppercase">TOTAL</span>
                  <span className="block text-[10px] font-medium text-neutral-400">Impuestos incluidos</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-[28px] font-black tracking-tight text-neutral-950">
                    RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  if (cart.length === 0) return;
                  
                  const customerObj = tenantCustomers.find(c => c.id === posCustomerId);
                  const tabName = customerObj ? customerObj.name : "Consumidor Final";
                  
                  // Descontar inventario inmediatamente
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
                    tenantId: tenantId || currentTenant?.id || currentTenant?.slug || "general",
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
                  toast.success("Cuenta guardada en espera. Inventario descontado.");
                  clearSale();
                }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black transition-all uppercase flex items-center justify-center gap-1.5",
                  cart.length === 0
                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200 active:scale-[0.98] shadow-2xs"
                )}>
                <Pause className="h-4 w-4 shrink-0" />
                <span>Pausar</span>
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
                  "h-12 rounded-xl text-base font-black transition-all flex items-center justify-center gap-2",
                  cart.length === 0
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-black text-white hover:bg-neutral-800 active:scale-[0.98] shadow-md"
                )}>
                <span>COBRAR</span>
                <span className="bg-white/20 text-neutral-300 font-mono text-[10px] px-1.5 py-0.5 rounded font-normal">F12</span>
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
        {isCheckout && (() => {
          const posCustomer = tenantCustomers.find((c) => c.id === posCustomerId);
          const initialData = {
            type: currentOrder?.customerType || (posCustomer?.taxReceiptType === "B01" || posCustomer?.type === "Empresa" ? "credito_fiscal" : "consumidor_final"),
            rnc: currentOrder?.customerRnc || posCustomer?.rnc || "",
            name: currentOrder?.customerBusinessName || posCustomer?.businessName || (posCustomer?.type === "Empresa" ? posCustomer?.name : "") || "",
          };
          const currentTenantConfig = tenants.find(t => t.id === tenantId)?.config;
          const defaultFiscalActive = Boolean(currentTenantConfig?.ecfConfig?.is_active);

          return (
            <LazyCheckout
              open={isCheckout}
              onOpenChange={setIsCheckout}
              total={total}
              customer={posCustomer || null}
              initialCustomerData={initialData}
              defaultFiscalActive={defaultFiscalActive}
              onConfirm={handleCheckout}
            />
          );
        })()}
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
