"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore, Customer, Vehicle, Product, Service, SERVICE_CATEGORY_TO_PRODUCT_CATEGORIES } from "@/store/useStore";
import { Search, ChevronDown, Trash2, Plus, Percent, DollarSign, Package, Wrench } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Quote, QuoteItem, QuoteStatus } from "@/store/types";

interface QuotationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteIdToEdit?: string | null;
  tenantId: string;
}

export default function QuotationCreateDialog({
  open,
  onOpenChange,
  quoteIdToEdit,
  tenantId,
}: QuotationCreateDialogProps) {
  const allCustomers = useStore((s) => s.customers);
  const allVehicles = useStore((s) => s.vehicles);
  const allProducts = useStore((s) => s.products);
  const allServices = useStore((s) => s.services);
  const quotes = useStore((s) => s.quotes);
  
  const addQuote = useStore((s) => s.addQuote);
  const updateQuote = useStore((s) => s.updateQuote);

  const customers = useMemo(() => 
    tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [],
    [allCustomers, tenantId]
  );
  
  const vehicles = useMemo(() => 
    tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : [],
    [allVehicles, tenantId]
  );

  const products = useMemo(() => 
    tenantId ? allProducts.filter((p) => p.tenantId === tenantId) : [],
    [allProducts, tenantId]
  );

  const services = useMemo(() => 
    tenantId ? allServices.filter((s) => s.tenantId === tenantId) : [],
    [allServices, tenantId]
  );

  // Form states
  const [customerId, setCustomerId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [items, setItems] = useState<QuoteItem[]>([]);

  // Search states
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  // Get available vehicles for selected customer
  const availableVehicles = useMemo(() => 
    vehicles.filter((v) => v.customerId === customerId),
    [vehicles, customerId]
  );

  // Load quote data if editing
  useEffect(() => {
    if (open) {
      if (quoteIdToEdit) {
        const existingQuote = quotes.find((q) => q.id === quoteIdToEdit);
        if (existingQuote) {
          setCustomerId(existingQuote.customerId);
          setVehicleId(existingQuote.vehicleId);
          setValidUntil(existingQuote.validUntil || "");
          setNotes(existingQuote.notes || "");
          setStatus(existingQuote.status);
          setItems(existingQuote.items);
          return;
        }
      }

      // Default state for new quote
      setCustomerId("");
      setVehicleId("");
      setNotes("");
      setStatus("draft");
      setItems([]);
      
      // Default validity date: 15 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 15);
      setValidUntil(defaultDate.toISOString().split("T")[0]);
    }
  }, [open, quoteIdToEdit, quotes]);

  // Clean vehicle selection if customer changes
  useEffect(() => {
    if (customerId) {
      const isVehicleValid = availableVehicles.some(v => v.id === vehicleId);
      if (!isVehicleValid) {
        setVehicleId(availableVehicles[0]?.id || "");
      }
    } else {
      setVehicleId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Calculate totals
  const summary = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let discount = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * ((item.discountPercentage || 0) / 100);
      const itemTaxable = itemSubtotal - itemDiscount;
      const itemTax = itemTaxable * (item.taxPercentage / 100);

      subtotal += itemSubtotal;
      discount += itemDiscount;
      tax += itemTax;
    });

    return {
      subtotal,
      tax: Math.round(tax),
      discount: Math.round(discount),
      total: Math.round(subtotal - discount + tax),
    };
  }, [items]);

  // Search filtered items
  const filteredProducts = useMemo(() => {
    const selectedServiceIds = items.filter((i) => i.serviceId).map((i) => i.serviceId!);
    let list = products;

    // Filter parts by selected services if any are added
    if (selectedServiceIds.length > 0) {
      list = products.filter((p) => {
        // 1. Explicit link: If product has specific serviceIds, use them
        if (p.serviceIds && p.serviceIds.length > 0) {
          return p.serviceIds.some((sid) => selectedServiceIds.includes(sid));
        }

        // 2. Implicit link: Check matching categories
        const activeServices = services.filter((s) => selectedServiceIds.includes(s.id));
        const allowedProductCategories = activeServices.flatMap((s) => {
          const cat = s.maintenanceCategory || s.category || "";
          return SERVICE_CATEGORY_TO_PRODUCT_CATEGORIES[cat] || [];
        });

        if (allowedProductCategories.length > 0) {
          return allowedProductCategories.includes(p.category);
        }

        return true; // fallback if no specific rule
      });
    }

    if (!itemSearch.trim()) return list.slice(0, 8);
    const q = itemSearch.toLowerCase();
    return list.filter((p) => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, services, items, itemSearch]);

  const filteredServices = useMemo(() => {
    if (!itemSearch.trim()) return services.slice(0, 8);
    const q = itemSearch.toLowerCase();
    return services.filter((s) => 
      s.name.toLowerCase().includes(q) || 
      (s.category && s.category.toLowerCase().includes(q))
    );
  }, [services, itemSearch]);

  // Add Item to Quotation
  const handleAddItem = (item: Product | Service, type: "product" | "service") => {
    const isProduct = type === "product";
    const existingIndex = items.findIndex(
      (i) => (isProduct ? i.productId === item.id : i.serviceId === item.id)
    );

    if (existingIndex > -1) {
      // Increment quantity
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total = calculateItemTotal(newItems[existingIndex]);
      setItems(newItems);
      toast.success(`Incrementado "${item.name}"`);
    } else {
      // Add new item
      const taxRate = isProduct ? (item as Product).tax : 18; // Default to 18% for services if not specified
      const newItem: QuoteItem = {
        id: `qi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        quantity: 1,
        unitPrice: isProduct ? ((item as Product).salePrice / (1 + taxRate / 100)) : (item as Service).price,
        taxPercentage: taxRate,
        discountPercentage: 0,
        total: 0,
      };

      if (isProduct) {
        newItem.productId = item.id;
      } else {
        newItem.serviceId = item.id;
      }

      newItem.total = calculateItemTotal(newItem);
      setItems([...items, newItem]);
      toast.success(`Agregado "${item.name}"`);
    }
  };

  const handleAddCustomLabor = (customName?: string) => {
    const name = customName?.trim() || "Mano de Obra";
    const newItem: QuoteItem = {
      id: `qi-custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      quantity: 1,
      unitPrice: 0,
      taxPercentage: 18,
      discountPercentage: 0,
      total: 0,
      serviceId: `custom-${Date.now()}`,
    };

    newItem.total = calculateItemTotal(newItem);
    setItems([...items, newItem]);
    toast.success(`Agregada mano de obra "${name}"`);
  };

  const calculateItemTotal = (item: QuoteItem) => {
    const sub = item.quantity * item.unitPrice;
    const disc = sub * ((item.discountPercentage || 0) / 100);
    const tax = (sub - disc) * (item.taxPercentage / 100);
    return Math.round(sub - disc + tax);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => 
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...updates };
        updated.total = calculateItemTotal(updated);
        return updated;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Debe seleccionar un cliente");
      return;
    }
    if (!vehicleId) {
      toast.error("Debe seleccionar un vehículo");
      return;
    }
    if (items.length === 0) {
      toast.error("Debe agregar al menos un artículo a la cotización");
      return;
    }

    if (quoteIdToEdit) {
      // Update
      updateQuote(quoteIdToEdit, {
        customerId,
        vehicleId,
        status,
        validUntil: validUntil || undefined,
        subtotal: summary.subtotal,
        tax: summary.tax,
        discount: summary.discount,
        total: summary.total,
        notes: notes || undefined,
        items,
      });
      toast.success("Cotización actualizada correctamente");
    } else {
      // Create new
      const sequenceNumber = quotes.length + 1;
      const quoteNumber = `COT-${new Date().getFullYear()}-${String(sequenceNumber).padStart(4, "0")}`;
      
      const newQuote: Quote = {
        id: `q-${Date.now()}`,
        tenantId,
        customerId,
        vehicleId,
        quoteNumber,
        status,
        validUntil: validUntil || undefined,
        subtotal: summary.subtotal,
        tax: summary.tax,
        discount: summary.discount,
        total: summary.total,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items,
      };

      addQuote(newQuote);
      toast.success(`Cotización ${quoteNumber} creada exitosamente`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl rounded-2xl p-6 bg-white overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="mb-2 shrink-0">
          <DialogTitle className="text-xl font-bold text-neutral-900">
            {quoteIdToEdit ? "Editar Cotización" : "Crear Nueva Cotización"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            
            {/* Left Column: Client, Vehicle & Settings */}
            <div className="space-y-4 lg:col-span-1 bg-neutral-50/50 p-4 rounded-xl border border-neutral-100 overflow-y-auto max-h-full">
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 mb-2">Información de la Cotización</h3>
              
              {/* Customer */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Cliente *</Label>
                <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                  <PopoverTrigger className="flex w-full items-center justify-between px-3 h-10 rounded-xl border border-neutral-200 bg-white text-sm hover:border-neutral-300 transition-colors focus:outline-none text-left">
                    <span className={cn("truncate", !customerId && "text-neutral-400")}>
                      {customerId
                        ? customers.find((c) => c.id === customerId)?.name ?? "Seleccionar cliente"
                        : "Seleccionar cliente..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-neutral-500 opacity-50 shrink-0" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 z-[250] shadow-xl rounded-xl border border-neutral-200 bg-white" align="start">
                    <Input 
                      placeholder="Buscar por nombre, teléfono..." 
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="h-9 mb-2 text-xs rounded-lg border-neutral-200"
                    />
                    <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).map(c => (
                        <button 
                          key={c.id}
                          type="button"
                          onClick={() => { setCustomerId(c.id); setIsCustomerPopoverOpen(false); setCustomerSearch(""); }}
                          className={cn("w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex flex-col", customerId === c.id ? "bg-black text-white" : "hover:bg-neutral-100")}
                        >
                          <div className="font-bold">{c.name}</div>
                          {c.phone && <div className={cn("text-[10px] mt-0.5", customerId === c.id ? "text-neutral-300" : "text-neutral-500")}>{c.phone}</div>}
                        </button>
                      ))}
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                        <div className="text-center text-xs text-neutral-400 py-4">No se encontraron clientes</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Vehicle */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Vehículo *</Label>
                <Select 
                  value={vehicleId || ""} 
                  onValueChange={(v) => setVehicleId(v || "")} 
                  disabled={!customerId}
                  items={availableVehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} — ${v.plate}` }))}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                    <SelectValue placeholder={customerId ? "Seleccionar vehículo" : "Primero selecciona un cliente"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[250]">
                    {availableVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {`${v.brand} ${v.model} — ${v.plate}`}
                      </SelectItem>
                    ))}
                    {availableVehicles.length === 0 && (
                      <SelectItem value="none" disabled>No hay vehículos registrados</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Fecha de Validez</Label>
                <Input 
                  type="date" 
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-10 rounded-xl border-neutral-200 bg-white text-sm"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[250]">
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="accepted">Aceptada</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-600">Notas / Términos de Cotización</Label>
                <textarea 
                  placeholder="Ej: Precios válidos por 15 días. Sujetos a cambios sin previo aviso." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[100px] text-xs p-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 resize-y"
                />
              </div>

            </div>

            {/* Right Column: Search & Added Items */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden max-h-full space-y-4">
              
              {/* Item Searcher */}
              <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-100 space-y-3 shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400">Agregar Repuestos o Mano de Obra</h3>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      placeholder="Buscar repuesto por nombre, SKU o marca..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => { handleAddCustomLabor(itemSearch); setItemSearch(""); }}
                    className="h-10 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-xs px-4 whitespace-nowrap"
                  >
                    + Mano de Obra
                  </Button>
                </div>

                {/* Search Results List (Only products/repuestos) */}
                {itemSearch.trim() && (
                  <div className="border border-neutral-200 rounded-xl bg-white p-2 max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar shrink-0 shadow-inner">
                    {filteredProducts.length > 0 ? (
                      <>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase px-3 pt-1 pb-1.5 flex justify-between items-center border-b border-neutral-50 mb-1">
                          <span>Repuestos</span>
                          {items.some((i) => i.serviceId) && (
                            <span className="text-[8px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">Filtrado por compatibilidad</span>
                          )}
                        </div>
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { handleAddItem(p, "product"); setItemSearch(""); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50 rounded-lg flex justify-between items-center transition-colors border-b border-neutral-50"
                          >
                            <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              {p.name} <span className="text-[10px] font-mono text-neutral-400">({p.sku})</span>
                            </span>
                            <span className="font-bold text-neutral-900">RD$ {p.salePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="text-center text-xs text-neutral-400 py-4">No se encontraron repuestos</div>
                    )}
                  </div>
                )}
              </div>

              {/* Items List Table */}
              <div className="flex-1 border border-neutral-100 rounded-xl overflow-hidden flex flex-col bg-white">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-400 font-bold uppercase text-[9px] tracking-wider border-b border-neutral-100">
                        <th className="py-2.5 px-4">Artículo</th>
                        <th className="py-2.5 px-3 w-[70px] text-center">Cant.</th>
                        <th className="py-2.5 px-3 w-[120px]">Precio Unit.</th>
                        <th className="py-2.5 px-3 w-[80px]">ITBIS %</th>
                        <th className="py-2.5 px-3 w-[80px]">Desc. %</th>
                        <th className="py-2.5 px-3 w-[110px] text-right">Total</th>
                        <th className="py-2.5 px-3 w-[40px] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-neutral-400 py-12">
                            No has agregado repuestos ni mano de obra a esta cotización.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-neutral-50/30 group">
                            <td className="py-2.5 px-4 font-semibold text-neutral-900">
                              <div className="flex items-center gap-1.5">
                                {item.productId ? (
                                  <Package className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                ) : (
                                  <Wrench className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                )}
                                <span className="truncate max-w-[200px]">{item.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {item.serviceId ? (
                                <span className="font-bold text-neutral-400 text-sm">—</span>
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                                  className="w-12 h-7 rounded border border-neutral-200 text-center font-bold focus:outline-none focus:border-neutral-400"
                                />
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-medium">RD$</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                                  onChange={(e) => handleUpdateItem(item.id, { unitPrice: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  className="w-full h-7 pl-7 pr-1 rounded border border-neutral-200 font-semibold focus:outline-none focus:border-neutral-400"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={item.taxPercentage}
                                onChange={(e) => handleUpdateItem(item.id, { taxPercentage: Number(e.target.value) })}
                                className="w-full h-7 px-1 rounded border border-neutral-200 bg-white focus:outline-none"
                              >
                                <option value="18">18%</option>
                                <option value="16">16%</option>
                                <option value="0">0%</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPercentage === 0 ? "" : item.discountPercentage}
                                  onChange={(e) => handleUpdateItem(item.id, { discountPercentage: e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value))) })}
                                  className="w-full h-7 pr-4 pl-1 rounded border border-neutral-200 text-right focus:outline-none focus:border-neutral-400"
                                />
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400 text-[9px] font-bold">%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-neutral-900 text-right">
                              RD$ {item.total.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-neutral-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer summary inside panel */}
                <div className="border-t border-neutral-100 bg-neutral-50/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                  <div className="text-xs text-neutral-400 italic flex items-end">
                    * Todos los cálculos de impuestos (ITBIS) y descuentos se actualizan automáticamente.
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-neutral-600 font-medium">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-neutral-900">RD$ {summary.subtotal.toLocaleString("es-DO")}</span>
                    </div>
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Descuento aplicado:</span>
                        <span className="font-semibold">- RD$ {summary.discount.toLocaleString("es-DO")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>ITBIS acumulado:</span>
                      <span className="font-semibold text-neutral-900">RD$ {summary.tax.toLocaleString("es-DO")}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-neutral-900 pt-1.5 border-t border-neutral-200/60">
                      <span>Total estimado:</span>
                      <span>RD$ {summary.total.toLocaleString("es-DO")}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          <DialogFooter className="gap-2 shrink-0 border-t border-neutral-100 pt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10 px-4 font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-black text-white hover:bg-neutral-800 h-10 px-6 font-bold"
            >
              {quoteIdToEdit ? "Guardar Cambios" : "Crear Cotización"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
