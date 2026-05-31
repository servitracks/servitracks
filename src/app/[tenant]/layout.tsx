"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { HydrationGuard } from "@/components/dashboard/HydrationGuard";
import { TourController } from "@/components/dashboard/TourController";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { useHydration } from "@/store/useHydration";
import { supabase } from "@/lib/supabase";

import { CreditCard, ShieldAlert, Sparkles, CheckCircle2, RefreshCw, Shield, MessageCircle, LogOut, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logout } from "@/lib/storage";
import { motion } from "framer-motion";

export default function DashboardLayout() {
  const params = useParams();
  const navigate = useNavigate();
  const hydrated = useHydration();
  const { tenants, updateTenant, currentUserId } = useStore();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSoporteModal, setShowSoporteModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  const tenantSlug =
    params.tenant && params.tenant !== "undefined"
      ? (params.tenant as string)
      : null;

  // IMPORTANTE: No usar || tenants[0] como fallback para evitar que datos
  // de otros tenants (ej. "autocheck") aparezcan en nuevos usuarios.
  const currentTenant = tenantSlug
    ? tenants.find((t) => t.slug === tenantSlug) ?? null
    : null;
  const isPending = currentTenant?.status === "pending";

  // Redirigir a login si no está autenticado o si el tenant no existe (una vez hidratado el store)
  useEffect(() => {
    if (!hydrated) return;
    if (!currentUserId) {
      navigate("/login");
      return;
    }
    // Si el slug en la URL no coincide con ningún tenant del usuario, redirigir a login
    if (tenantSlug && tenants.length > 0 && !tenants.find((t) => t.slug === tenantSlug)) {
      navigate("/login");
    }
  }, [hydrated, currentUserId, tenantSlug, tenants, navigate]);

  // Cerrar sidebar al cambiar de página
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // --- ESCUCHA GLOBAL EN TIEMPO REAL PARA WHATSAPP ---
  useEffect(() => {
    if (!currentTenant?.id) return;

    // Limpieza semanal silenciosa de mensajes y chats antiguos (> 7 días)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("wa_messages")
      .delete()
      .lt("created_at", oneWeekAgo)
      .eq("tenant_id", currentTenant.id)
      .then(() => {
        supabase
          .from("wa_conversations")
          .delete()
          .lt("last_message_at", oneWeekAgo)
          .eq("tenant_id", currentTenant.id);
      });

    async function fetchUnreadCount() {
      if (!currentTenant?.id) return;
      const { data, error } = await supabase
        .from("wa_conversations")
        .select("unread_count")
        .eq("tenant_id", currentTenant.id);
      
      if (!error && data) {
        const total = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadChatsCount(total);
      }
    }

    fetchUnreadCount();

    const ch = supabase
      .channel(`chat_tenant_global:${currentTenant.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wa_conversations",
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, (payload) => {
        console.log("[Global RT conv]", payload.eventType, payload.new);
        fetchUnreadCount();
        // Despachar evento nativo para que la página de conversaciones se entere
        window.dispatchEvent(new CustomEvent("wa_conversation_updated", { detail: payload }));
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wa_messages",
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, (payload) => {
        console.log("[Global RT msg]", payload.eventType, payload.new);
        
        if (payload.eventType === "INSERT") {
          const newMsg = payload.new;
          if (newMsg && newMsg.role === "user") {
            // Play sound
            const audio = new Audio("/nuevo_mensaje.mp3.mpeg");
            audio.play().catch((err) => console.log("Audio play blocked by browser policy:", err));
            
            // Toast notification if on other screens
            if (!window.location.pathname.includes("/conversaciones")) {
              toast.info("💬 Nuevo mensaje de WhatsApp recibido");
            }
          }
        }
        
        fetchUnreadCount();
        // Despachar evento nativo para que la página de conversaciones se entere
        window.dispatchEvent(new CustomEvent("wa_message_received", { detail: payload }));
      })
      .subscribe((status, err) => {
        console.log("[Global RT Subscription]", status, err || "");
      });

    window.addEventListener("wa_force_unread_update", fetchUnreadCount);

    return () => { 
      supabase.removeChannel(ch); 
      window.removeEventListener("wa_force_unread_update", fetchUnreadCount);
    };
  }, [currentTenant?.id]);

  if (!currentTenant) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50/50">
        <span className="text-sm font-medium text-neutral-500">Cargando sucursal...</span>
      </div>
    );
  }
  
  const trialDays = currentTenant.trial_hasta ? Math.max(0, Math.ceil((new Date(currentTenant.trial_hasta).getTime() - Date.now()) / 86400000)) : 0;
  const isTrialExpired = currentTenant?.estado === "TRIAL" && currentTenant.trial_hasta && new Date(currentTenant.trial_hasta).getTime() < Date.now();
  const isSuspended = currentTenant?.estado === "SUSPENDIDO" || currentTenant?.estado === "CANCELADO";

  function onLogout() {
    logout();
    window.location.assign("/login");
  }

  const handleSimulatePayment = () => {
    if (!currentTenant) return;
    setIsProcessing(true);
    
    // Simulate payment gateway delay (2 seconds)
    setTimeout(() => {
      updateTenant(currentTenant.id, { status: "active" });
      setIsProcessing(false);
      toast.success(`💳 ¡Pago procesado con éxito! La sucursal "${currentTenant.name}" ya se encuentra activa.`);
    }, 2000);
  };

  if (isPending) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50/50 relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} unreadChatsCount={unreadChatsCount} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <HydrationGuard>
            <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-neutral-100 p-8 text-center space-y-6 relative overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300">
                {/* Background glow decorator */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Status Indicator Icon */}
                <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center shadow-inner relative">
                  <ShieldAlert className="h-8 w-8 text-rose-600 animate-pulse" />
                  <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 shadow-sm">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                    Membresía Pendiente
                  </h2>
                  <p className="text-neutral-500 text-sm leading-relaxed">
                    Para poder operar en la sucursal <strong className="text-neutral-800 capitalize">{currentTenant.name}</strong> y acceder a los módulos de trabajo, debes activar su membresía.
                  </p>
                </div>

                {/* Plan detail card */}
                <div className="bg-neutral-50 rounded-2xl p-5 text-left border border-neutral-100 space-y-3">
                  <div className="flex justify-between items-center pb-2.5 border-b border-neutral-200/60">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Plan de Sucursal</h4>
                      <p className="text-sm font-black text-neutral-800">ServiTracks Premium MultiSede</p>
                    </div>
                    <span className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Inactivo
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-neutral-400 font-semibold">Costo Mensual:</span>
                    <span className="text-xl font-black text-neutral-900">RD$ 2,500.00 <span className="text-xs text-neutral-400 font-normal">/ mes</span></span>
                  </div>

                  {/* Included bullets */}
                  <ul className="text-[11px] text-neutral-500 space-y-1.5 pt-1.5 border-t border-neutral-200/40">
                    <li className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span>Facturación e Inventario ilimitados</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span>Control de caja chica y turnos diarios</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span>Acceso independiente para mecánicos y técnicos</span>
                    </li>
                  </ul>
                </div>

                {/* Checkout simulation button */}
                <Button 
                  onClick={handleSimulatePayment} 
                  disabled={isProcessing}
                  className="w-full rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-black h-12 shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Procesando pago...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Simular Pago de Membresía
                    </>
                  )}
                </Button>

                <p className="text-[10px] text-neutral-400 leading-tight">
                  Al pulsar el botón se simulará una transacción segura de tarjeta de crédito para fines de demostración del flujo de sucursales.
                </p>
              </div>
            </main>
          </HydrationGuard>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50/50 relative">
      {/* Overlay de Suspensión Premium Compacto */}
      {isSuspended && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/40 bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            <div className="relative p-6 pt-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive text-white shadow-xl ring-2 ring-white">
                <Shield className="h-6 w-6" />
              </div>
              
              <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-destructive mb-3 border border-destructive/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive"></span>
                </span>
                Cuenta Suspendida
              </div>

              <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                Acceso pausado
              </h2>
              
              <p className="mx-auto max-w-[240px] text-[13px] font-medium leading-relaxed text-slate-500">
                El acceso para el taller <span className="text-slate-900 font-bold">{currentTenant.name}</span> ha sido restringido temporalmente.
              </p>
            </div>
            
            <div className="p-6 pt-0 space-y-4">
              <div className="rounded-xl bg-slate-900/5 p-4 text-center">
                <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                  Contacta a soporte para reactivar tu cuenta y servicios.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="h-11 flex-1 rounded-xl bg-slate-950 text-white text-xs font-bold shadow-lg transition-all active:scale-95 group cursor-pointer"
                  onClick={() => window.open(`https://wa.me/18299681720?text=Hola ServiTracks, mi taller ${currentTenant.name} tiene el acceso suspendido. Quisiera más información.`, "_blank")}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Soporte
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-11 flex-1 rounded-xl text-slate-600 text-xs font-bold border-slate-200 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                  onClick={onLogout}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Salir
                </Button>
              </div>

              <div className="text-center pt-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ServiTracks · ID: {currentTenant.id.slice(0, 8)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Overlay de Prueba Vencida Premium */}
      {isTrialExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/40 bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            <div className="relative p-6 pt-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xl ring-2 ring-white">
                <Shield className="h-6 w-6 animate-pulse" />
              </div>
              
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700 mb-3 border border-amber-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                Prueba Expirada
              </div>

              <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                Periodo de Prueba Finalizado
              </h2>
              
              <p className="mx-auto max-w-[320px] text-[13px] font-medium leading-relaxed text-slate-500 mb-6">
                Tu período de prueba gratuito para el taller <span className="text-slate-900 font-bold">{currentTenant.name}</span> ha expirado. Debes adquirir un plan activo para seguir utilizando ServiTracks.
              </p>

              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => setShowSoporteModal(true)}
                  >
                    <MessageCircle className="h-4 w-4" /> Contactar soporte
                  </Button>
                  
                  <Button 
                    className="h-11 w-full rounded-xl bg-primary hover:bg-primary/95 text-white text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => window.location.assign(`/t/${currentTenant.slug}/settings?tab=plan`)}
                  >
                    <CreditCard className="h-4 w-4" /> Ver planes
                  </Button>
                </div>

                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    className="h-11 w-32 rounded-xl text-slate-600 text-sm font-bold border-slate-200 hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    onClick={onLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Salir
                  </Button>
                </div>
              </div>

              <div className="text-center pt-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ServiTracks · ID: {currentTenant.id.slice(0, 8)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Soporte */}
      {showSoporteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/40 bg-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl p-6 space-y-5">
            <div className="text-center">
              <h3 className="font-display text-xl font-black text-slate-900 mb-1">
                Para contactar con Soporte:
              </h3>
              <p className="text-xs text-slate-500">
                Elige la opción que prefieras para contactarnos.
              </p>
            </div>

            <div className="grid gap-3">
              {/* Tarjeta 1: Llamar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Llámanos al:
                </span>
                <span className="text-lg font-bold text-slate-900">+1 (829) 968-1720</span>
              </div>

              {/* Tarjeta 2: WhatsApp */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center gap-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Contacta por WhatsApp</span>
                <Button 
                  className="h-9 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => window.open(`https://wa.me/18299681720?text=Hola ServiTracks, la prueba gratis de mi taller ${currentTenant.name} ha expirado. Quisiera más información sobre los planes pagos.`, "_blank")}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
                </Button>
              </div>
            </div>

            <Button 
              variant="ghost" 
              className="h-10 w-full rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
              onClick={() => setShowSoporteModal(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} unreadChatsCount={unreadChatsCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <HydrationGuard>
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </HydrationGuard>
      </div>
      <TourController />
    </div>
  );
}
