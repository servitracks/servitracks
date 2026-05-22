"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar, Bell, ChevronRight, User, ArrowUpRight, ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, useParams } from "@/lib/next-compat";

import { Switch } from "@/components/ui/switch";

export function MessagesPanel() {
  const router = useRouter();
  const { tenant } = useParams();
  const tenantSlug = tenant || "autocheck";
  const whatsappLogs = useStore((s) => s.whatsappLogs);
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [autoPilot, setAutoPilot] = useState(false);
  
  const messageTemplates = [
    { title: "Alerta Crítica", desc: "Mantenimiento urgente", color: "bg-rose-50 text-rose-600", hoverColor: "hover:bg-rose-50/80 hover:border-rose-100", badgeColor: "bg-rose-600 text-white shadow-rose-200 animate-pulse", type: "notification", keyword: "urgente" },
    { title: "Alerta Preventiva", desc: "Mantenimiento pronto", color: "bg-amber-50 text-amber-600", hoverColor: "hover:bg-amber-50/80 hover:border-amber-100", badgeColor: "bg-neutral-900 text-white", type: "notification", keyword: "pron" },
    { title: "Recordatorios", desc: "Citas programadas", color: "bg-blue-50 text-blue-600", hoverColor: "hover:bg-blue-50/80 hover:border-blue-100", badgeColor: "bg-neutral-900 text-white", type: "reminder" },
    { title: "Seguimiento", desc: "Post-servicio", color: "bg-emerald-50 text-emerald-600", hoverColor: "hover:bg-emerald-50/80 hover:border-emerald-100", badgeColor: "bg-neutral-900 text-white", type: "notification", keyword: "listo" },
  ];

  const getFilteredLogs = () => {
    if (!activeFilter) return whatsappLogs;
    const template = messageTemplates.find(t => t.title === activeFilter);
    if (!template) return whatsappLogs;
    
    return whatsappLogs.filter(log => {
      const matchType = log.type === template.type;
      if (!template.keyword) return matchType;
      return matchType && log.message.toLowerCase().includes(template.keyword.toLowerCase());
    });
  };

  const filteredLogs = getFilteredLogs();
  const displayedLogs = showAll ? filteredLogs : filteredLogs.slice(0, 5);

  const getCount = (title: string) => {
    const template = messageTemplates.find(t => t.title === title);
    if (!template) return 0;
    return whatsappLogs.filter(log => {
      const matchType = log.type === template.type;
      if (!template.keyword) return matchType;
      return matchType && log.message.toLowerCase().includes(template.keyword.toLowerCase());
    }).length;
  };

  return (
    <div className="w-[400px] max-h-[calc(100vh-100px)] md:max-h-[490px] overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-neutral-100">
      <div className="p-6 border-b border-neutral-100 bg-white flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">Centro de Mensajes</h3>
          <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Integración WhatsApp API</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-neutral-50 px-2 py-1 rounded-full border border-neutral-100">
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Piloto Automático</span>
            <Switch checked={autoPilot} onCheckedChange={setAutoPilot} className="scale-75" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pr-1.5 custom-scrollbar">
        {/* Templates — hide when showing all messages */}
        {!showAll && (
          <div className="grid grid-cols-2 gap-2 p-2">
            {messageTemplates.map((template) => {
              const count = getCount(template.title);
              const isActive = activeFilter === template.title;
              return (
                <button 
                  type="button"
                  key={template.title} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFilter(isActive ? null : template.title);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-2 p-3 rounded-2xl transition-all text-left group relative cursor-pointer outline-none border",
                    isActive ? "bg-white ring-2 ring-neutral-900 shadow-md z-10 scale-[1.02] border-transparent" : `bg-neutral-50 ${template.hoverColor} border-transparent`,
                    count === 0 && !isActive ? "opacity-60" : ""
                  )}
                >
                  {count > 0 && (
                    <span className={cn("absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-black px-1.5 shadow-sm", template.badgeColor)}>
                      {count}
                    </span>
                  )}
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", template.color)}>
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{template.title}</p>
                    <p className="text-[10px] text-neutral-400 font-medium leading-tight">{template.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 px-4 py-3">
          <div className="flex items-center justify-between mb-4 min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate mr-2 flex-1">
              {showAll ? `Todos los Mensajes (${filteredLogs.length})` : activeFilter ? `Filtrado por "${activeFilter}"` : "Mensajes Recientes"}
            </h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {activeFilter && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFilter(null);
                  }}
                  className="text-[10px] font-bold h-6 px-2 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all text-rose-600 flex items-center gap-1 whitespace-nowrap flex-shrink-0 cursor-pointer border-none outline-none active:scale-95"
                >
                  <X className="h-2.5 w-2.5" />
                  Limpiar Filtro
                </button>
              )}
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation();
                  setShowAll(!showAll); 
                  if (activeFilter) setActiveFilter(null); 
                }}
                className="text-[10px] font-bold h-6 px-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-all text-neutral-600 flex items-center gap-1 whitespace-nowrap flex-shrink-0 cursor-pointer border-none outline-none active:scale-95"
              >
                {showAll ? (
                  <><ArrowLeft className="h-2.5 w-2.5" /> Volver</>
                ) : (
                  <>Ver todo</>
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-3 pb-4">
            {displayedLogs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-neutral-50 flex items-center justify-center mx-auto mb-3 opacity-50">
                  <MessageSquare className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Sin resultados</p>
                <p className="text-[11px] text-neutral-400 mt-1">No hay mensajes en esta categoría.</p>
              </div>
            ) : displayedLogs.map((log) => (
              <div 
                key={log.id} 
                onClick={() => router.push(`/${tenantSlug}/reminders?customerId=${log.customerId}&action=new_message`)}
                className="flex gap-3 p-3 rounded-2xl border border-neutral-50 hover:border-neutral-100 hover:shadow-sm transition-all group cursor-pointer bg-white"
              >
                <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {log.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-900 truncate">{log.customerName}</p>
                    <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-2">{format(new Date(log.sentAt), 'p', { locale: es })}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{log.message}</p>
                </div>
                <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-neutral-100 bg-neutral-50/50">
        <Button 
          onClick={() => router.push(`/${tenantSlug}/reminders?action=new_message`)}
          className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black h-12 shadow-lg shadow-emerald-200"
        >
          Nuevo Mensaje Directo
        </Button>
      </div>
    </div>
  );
}
