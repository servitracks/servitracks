"use client";

import { useState, useMemo } from "react";
import { useStore, type Inspection, type InspectionItem } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, AlertTriangle, XCircle, Minus,
  Camera, Fuel, Shield, ChevronDown, ChevronUp,
  Save, FileCheck, Car, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// PLANTILLA DE INSPECCIÓN ESTÁNDAR AUTOMOTRIZ
// ═══════════════════════════════════════════════════════════════════════════

const INSPECTION_TEMPLATE: { category: string; items: string[] }[] = [
  {
    category: "Motor y Transmisión",
    items: [
      "Nivel de aceite de motor",
      "Color/estado del aceite",
      "Filtro de aire",
      "Nivel de refrigerante",
      "Correas y mangueras",
      "Transmisión / Caja de cambios",
    ],
  },
  {
    category: "Frenos",
    items: [
      "Pastillas delanteras",
      "Pastillas traseras",
      "Discos delanteros",
      "Discos traseros",
      "Líquido de frenos",
      "Freno de mano / Estacionamiento",
    ],
  },
  {
    category: "Suspensión y Dirección",
    items: [
      "Amortiguadores delanteros",
      "Amortiguadores traseros",
      "Rótulas y terminales",
      "Bujes de suspensión",
      "Dirección hidráulica / EPS",
    ],
  },
  {
    category: "Neumáticos",
    items: [
      "Neumático delantero izquierdo",
      "Neumático delantero derecho",
      "Neumático trasero izquierdo",
      "Neumático trasero derecho",
      "Neumático de repuesto",
      "Alineación / Balanceo",
    ],
  },
  {
    category: "Sistema Eléctrico",
    items: [
      "Batería",
      "Alternador / Carga",
      "Luces delanteras",
      "Luces traseras",
      "Direccionales / Intermitentes",
      "Luces de freno",
    ],
  },
  {
    category: "Fluidos y Filtros",
    items: [
      "Líquido limpiaparabrisas",
      "Líquido de dirección",
      "Filtro de combustible",
      "Filtro de cabina / A/C",
    ],
  },
  {
    category: "Carrocería y Seguridad",
    items: [
      "Parabrisas (grietas/chips)",
      "Limpiaparabrisas",
      "Espejos retrovisores",
      "Cinturones de seguridad",
      "Bocina / Claxon",
    ],
  },
];

const FUEL_LEVELS = [
  { value: "empty" as const, label: "Vacío", width: "w-0" },
  { value: "1/4" as const, label: "1/4", width: "w-1/4" },
  { value: "1/2" as const, label: "1/2", width: "w-1/2" },
  { value: "3/4" as const, label: "3/4", width: "w-3/4" },
  { value: "full" as const, label: "Lleno", width: "w-full" },
];

const CONDITION_CONFIG = {
  ok: {
    label: "OK",
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    icon: CheckCircle2,
    ring: "ring-emerald-300",
    badge: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    label: "Atención",
    color: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: AlertTriangle,
    ring: "ring-amber-300",
    badge: "bg-amber-100 text-amber-700",
  },
  critical: {
    label: "Crítico",
    color: "bg-rose-500 hover:bg-rose-600 text-white",
    icon: XCircle,
    ring: "ring-rose-300",
    badge: "bg-rose-100 text-rose-700",
  },
  unchecked: {
    label: "Sin Revisar",
    color: "bg-neutral-200 hover:bg-neutral-300 text-neutral-600",
    icon: Minus,
    ring: "ring-neutral-200",
    badge: "bg-neutral-100 text-neutral-500",
  },
};

interface InspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  customerId: string;
  workOrderId?: string;
  tenantId: string;
  existingInspection?: Inspection | null;
}

export default function InspectionDialog({
  open,
  onOpenChange,
  vehicleId,
  customerId,
  workOrderId,
  tenantId,
  existingInspection,
}: InspectionDialogProps) {
  const vehicles = useStore((s) => s.vehicles);
  const customers = useStore((s) => s.customers);
  const technicians = useStore((s) => s.technicians).filter((t) => t.tenantId === tenantId);
  const { addInspection, updateInspection } = useStore();

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const customer = customers.find((c) => c.id === customerId);

  // Initialize items from template or existing inspection
  const initialItems: InspectionItem[] = useMemo(() => {
    if (existingInspection) return existingInspection.items;
    return INSPECTION_TEMPLATE.flatMap((cat) =>
      cat.items.map((name) => ({
        id: `${cat.category}-${name}`.replace(/\s/g, "_").toLowerCase(),
        category: cat.category,
        name,
        condition: "unchecked" as const,
        notes: "",
        photoUrl: "",
      }))
    );
  }, [existingInspection]);

  const [items, setItems] = useState<InspectionItem[]>(initialItems);
  const [fuelLevel, setFuelLevel] = useState<Inspection["fuelLevel"]>(
    existingInspection?.fuelLevel || "1/2"
  );
  const [bodyDamageNotes, setBodyDamageNotes] = useState(
    existingInspection?.bodyDamageNotes || ""
  );
  const [technicianId, setTechnicianId] = useState(
    existingInspection?.technicianId || ""
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(INSPECTION_TEMPLATE.map((c) => c.category))
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const setCondition = (itemId: string, condition: InspectionItem["condition"]) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, condition } : item))
    );
  };

  const setItemNotes = (itemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  };

  const handlePhotoCapture = (itemId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, photoUrl: dataUrl } : item
            )
          );
          toast.success("Foto capturada correctamente");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Statistics
  const stats = useMemo(() => {
    const ok = items.filter((i) => i.condition === "ok").length;
    const warning = items.filter((i) => i.condition === "warning").length;
    const critical = items.filter((i) => i.condition === "critical").length;
    const unchecked = items.filter((i) => i.condition === "unchecked").length;
    const total = items.length;
    const progress = Math.round(((total - unchecked) / total) * 100);
    return { ok, warning, critical, unchecked, total, progress };
  }, [items]);

  const handleSave = (complete: boolean) => {
    const now = new Date().toISOString();
    const inspection: Inspection = {
      id: existingInspection?.id || `insp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      vehicleId,
      customerId,
      workOrderId,
      technicianId: technicianId || undefined,
      status: complete ? "completed" : "draft",
      fuelLevel,
      bodyDamageNotes: bodyDamageNotes || undefined,
      items,
      createdAt: existingInspection?.createdAt || now,
      completedAt: complete ? now : undefined,
    };

    if (existingInspection) {
      updateInspection(existingInspection.id, inspection);
    } else {
      addInspection(inspection);
    }

    toast.success(
      complete
        ? "✅ Inspección completada exitosamente"
        : "💾 Borrador guardado"
    );
    onOpenChange(false);
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const map = new Map<string, InspectionItem[]>();
    items.forEach((item) => {
      const arr = map.get(item.category) || [];
      arr.push(item);
      map.set(item.category, arr);
    });
    return map;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl p-0 bg-white">
        {/* ─── Epic Header ──────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 pb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
            <div className="absolute -left-5 -bottom-5 h-32 w-32 rounded-full bg-white/10" />
          </div>
          <div className="relative z-10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="h-10 w-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                Inspección Digital Multi-Punto
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-1">
                Evaluación profesional del estado del vehículo
              </DialogDescription>
            </DialogHeader>

            {/* Vehicle & Customer Info */}
            <div className="mt-4 flex flex-wrap gap-3">
              {vehicle && (
                <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
                  <Car className="h-4 w-4 text-blue-200" />
                  <span className="text-sm font-bold">
                    {vehicle.brand} {vehicle.model} ({vehicle.plate})
                  </span>
                </div>
              )}
              {customer && (
                <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="text-sm font-medium">{customer.name}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  Progreso de Inspección
                </span>
                <span className="text-sm font-black">{stats.progress}%</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
            </div>

            {/* Stats Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className="bg-emerald-500/30 text-emerald-100 border-none font-bold gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {stats.ok} OK
              </Badge>
              <Badge className="bg-amber-500/30 text-amber-100 border-none font-bold gap-1.5 px-3 py-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {stats.warning} Atención
              </Badge>
              <Badge className="bg-rose-500/30 text-rose-100 border-none font-bold gap-1.5 px-3 py-1">
                <XCircle className="h-3.5 w-3.5" /> {stats.critical} Crítico
              </Badge>
              <Badge className="bg-white/20 text-blue-100 border-none font-bold gap-1.5 px-3 py-1">
                <Minus className="h-3.5 w-3.5" /> {stats.unchecked} Pendientes
              </Badge>
            </div>
          </div>
        </div>

        {/* ─── Body ─────────────────────────────────────────── */}
        <div className="p-6 space-y-6">
          {/* Reception Section: Fuel + Body Damage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fuel Level */}
            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200">
              <h3 className="font-black text-sm text-neutral-800 flex items-center gap-2 mb-4">
                <Fuel className="h-4 w-4 text-amber-600" /> Nivel de Combustible
              </h3>
              <div className="flex gap-2">
                {FUEL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setFuelLevel(level.value)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                      fuelLevel === level.value
                        ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30 scale-105"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-amber-300"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Damage Notes */}
            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200">
              <h3 className="font-black text-sm text-neutral-800 flex items-center gap-2 mb-4">
                <Car className="h-4 w-4 text-blue-600" /> Daños Previos en Carrocería
              </h3>
              <Textarea
                placeholder="Ej: Rayón en puerta trasera derecha, golpe en bumper delantero..."
                className="rounded-xl border-neutral-200 text-sm resize-none h-[72px]"
                value={bodyDamageNotes}
                onChange={(e) => setBodyDamageNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Technician Select */}
          {technicians.length > 0 && (
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 flex items-center gap-4">
              <span className="text-sm font-bold text-neutral-700">Técnico Inspector:</span>
              <select
                className="flex-1 h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ─── Inspection Categories ──────────────────────── */}
          <div className="space-y-3">
            {Array.from(groupedItems.entries()).map(([category, catItems]) => {
              const isExpanded = expandedCategories.has(category);
              const catOk = catItems.filter((i) => i.condition === "ok").length;
              const catWarn = catItems.filter((i) => i.condition === "warning").length;
              const catCrit = catItems.filter((i) => i.condition === "critical").length;
              const catUnchecked = catItems.filter((i) => i.condition === "unchecked").length;

              return (
                <div
                  key={category}
                  className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Category Header */}
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-black text-sm text-neutral-900">{category}</h4>
                        <p className="text-xs text-neutral-400">
                          {catItems.length} puntos de inspección
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                      {catOk > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center px-1.5">
                          {catOk}
                        </span>
                      )}
                      {catWarn > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center px-1.5">
                          {catWarn}
                        </span>
                      )}
                      {catCrit > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center px-1.5">
                          {catCrit}
                        </span>
                      )}
                      {catUnchecked > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-black flex items-center justify-center px-1.5">
                          {catUnchecked}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                  </button>

                  {/* Category Items */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                      {catItems.map((item) => {
                        const cfg = CONDITION_CONFIG[item.condition];
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-4 transition-colors",
                              item.condition === "critical" && "bg-rose-50/40",
                              item.condition === "warning" && "bg-amber-50/30"
                            )}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              {/* Item Name */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-neutral-800">
                                  {item.name}
                                </p>
                              </div>

                              {/* Semaphore Buttons */}
                              <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 mt-2 sm:mt-0">
                                {(["ok", "warning", "critical"] as const).map(
                                  (cond) => {
                                    const condCfg = CONDITION_CONFIG[cond];
                                    const CondIcon = condCfg.icon;
                                    const isActive = item.condition === cond;
                                    return (
                                      <button
                                        key={cond}
                                        onClick={() => setCondition(item.id, cond)}
                                        className={cn(
                                          "h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all",
                                          isActive
                                            ? `${condCfg.color} shadow-md ring-2 ${condCfg.ring} scale-105`
                                            : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                                        )}
                                      >
                                        <CondIcon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{condCfg.label}</span>
                                      </button>
                                    );
                                  }
                                )}

                                {/* Camera Button */}
                                <button
                                  onClick={() => handlePhotoCapture(item.id)}
                                  className={cn(
                                    "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                                    item.photoUrl
                                      ? "bg-blue-500 text-white shadow-md"
                                      : "bg-neutral-100 text-neutral-400 hover:bg-blue-100 hover:text-blue-600"
                                  )}
                                  title="Tomar foto de evidencia"
                                >
                                  <Camera className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Photo Preview */}
                            {item.photoUrl && (
                              <div className="mt-3">
                                <img
                                  src={item.photoUrl}
                                  alt={`Evidencia: ${item.name}`}
                                  className="h-24 w-auto rounded-xl border-2 border-blue-200 object-cover shadow-sm"
                                />
                              </div>
                            )}

                            {/* Notes (visible when warning or critical) */}
                            {(item.condition === "warning" || item.condition === "critical") && (
                              <div className="mt-3">
                                <Input
                                  placeholder="Notas del técnico (ej: desgaste al 70%, necesita cambio pronto)"
                                  className="h-9 rounded-xl border-neutral-200 text-sm"
                                  value={item.notes || ""}
                                  onChange={(e) => setItemNotes(item.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Action Footer ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-100">
            <Button
              variant="outline"
              className="h-12 rounded-xl border-neutral-200 font-bold flex-1 gap-2"
              onClick={() => handleSave(false)}
            >
              <Save className="h-4 w-4" /> Guardar Borrador
            </Button>
            <Button
              className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 gap-2 shadow-lg shadow-emerald-600/20"
              onClick={() => handleSave(true)}
              disabled={stats.unchecked > 0}
            >
              <FileCheck className="h-4 w-4" /> Completar Inspección
              {stats.unchecked > 0 && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full ml-1">
                  {stats.unchecked} pendientes
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
