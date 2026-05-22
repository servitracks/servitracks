"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  History, 
  Car, 
  Trash2, 
  Wrench, 
  CheckCircle2, 
  Inbox, 
  Search,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VehicleMaintenanceHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any;
}

export function VehicleMaintenanceHistoryModal({ 
  isOpen, 
  onOpenChange, 
  vehicle 
}: VehicleMaintenanceHistoryModalProps) {
  const { maintenanceHistory, deleteMaintenanceHistoryItem, customers } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  if (!vehicle) return null;

  // Find customer associated with vehicle
  const customer = customers.find(c => c.id === vehicle.customerId);

  // Filter history records for this specific vehicle
  const vehicleHistory = maintenanceHistory
    .filter(item => item.vehicleId === vehicle.id)
    .filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const handleDelete = (id: string, name: string) => {
    deleteMaintenanceHistoryItem(id);
    toast.success(`Registro de "${name}" eliminado del historial.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 bg-white shadow-xl overflow-hidden flex flex-col"
        style={{ width: 580, maxWidth: '95vw', height: '80vh', maxHeight: '700px', borderRadius: 16, border: '1px solid #e5e5e5' }}
      >
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="p-6 pb-4 border-b border-neutral-100 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100/50">
              <History className="h-5 w-5 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                Historial de Mantenimiento
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 font-semibold mt-0.5 uppercase tracking-wider">
                {vehicle.brand} {vehicle.model} • <span className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-neutral-700 font-bold">{vehicle.plate}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ═══════════════ SEARCH / METRICS ═══════════════ */}
        <div className="px-6 py-3 bg-neutral-50/50 border-b border-neutral-100 flex-shrink-0 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Buscar por servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 rounded-lg text-xs border-neutral-200 bg-white focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
            />
          </div>
          <div className="text-[10px] text-neutral-500 font-bold uppercase bg-white border border-neutral-200 rounded-full px-3 py-1 flex items-center gap-1">
            <span>Servicios registrados:</span>
            <span className="text-emerald-600 font-extrabold">{vehicleHistory.length}</span>
          </div>
        </div>

        {/* ═══════════════ HISTORY TIMELINE (Scrollable) ═══════════════ */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-neutral-50/20">
          {vehicleHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="h-16 w-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center border border-neutral-200/50">
                <Inbox size={26} />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-sm font-bold text-neutral-900">Sin registros en la bitácora</h3>
                <p className="text-[11px] text-neutral-400 leading-normal font-semibold">
                  {searchQuery 
                    ? "No se encontraron coincidencias para tu búsqueda." 
                    : "Los ciclos de mantenimiento completados aparecerán organizados cronológicamente aquí."}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative border-l border-neutral-200 ml-4 pl-6 space-y-6">
              {vehicleHistory.map((item, idx) => {
                const completedDate = new Date(item.completedAt);
                const prevDate = new Date(item.serviceDate);

                return (
                  <div key={item.id} className="relative group/item">
                    {/* Timeline Node Icon */}
                    <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-4 ring-white border-2 border-emerald-500 group-hover/item:scale-110 transition-transform">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>

                    {/* Timeline Content Card */}
                    <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-neutral-900 tracking-tight uppercase flex items-center gap-1.5">
                            {item.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 font-semibold">
                            <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                              <Calendar size={11} />
                              Realizado: {format(completedDate, "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                            <span className="text-neutral-300">•</span>
                            <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {item.serviceKm.toLocaleString()} km
                            </span>
                          </div>
                        </div>

                        {/* Action Delete Log */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="h-7 w-7 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>

                      {/* Detail / Description / Notes */}
                      {item.notes && (
                        <div className="mt-3 text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 font-semibold leading-relaxed">
                          📝 {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════════ FOOTER - Fixed at bottom ═══════════════ */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex-shrink-0 flex items-center justify-between">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            {customer ? `Cliente: ${customer.name}` : "ServiTracks Pro"}
          </div>
          <Button 
            onClick={() => onOpenChange(false)}
            size="sm"
            className="rounded-xl font-bold bg-neutral-950 hover:bg-black text-[11px] px-4 cursor-pointer"
          >
            Cerrar Historial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
