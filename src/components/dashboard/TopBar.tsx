"use client";

import { useState, useEffect } from "react";
import { Bell, Search, User, Headphones, LogOut, MessageSquare, Save, Shield, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertsPanel } from "@/components/maintenance/AlertsPanel";
import { MessagesPanel } from "@/components/maintenance/MessagesPanel";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabaseAdmin } from "@/lib/supabase";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const params = useParams();
  const tenantSlug = params.tenant || "autocheck";
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";
  
  const allAlerts = useStore((s) => s.maintenanceAlerts);
  const maintenanceAlerts = allAlerts.filter((a) => a.tenantId === tenantId);
  const allLogs = useStore((s) => s.whatsappLogs);
  const whatsappLogs = allLogs.filter((l) => l.tenantId === tenantId);
  const users = useStore((s) => s.users);
  const updateUser = useStore((s) => s.updateUser);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUserId = useStore((s) => s.setCurrentUserId);
  const navigate = useNavigate();
  
  const pendingAlertsCount = maintenanceAlerts.filter((a: any) => a.status === 'pending').length;
  const pendingMessagesCount = whatsappLogs.filter((l: any) => l.status === 'failed' || l.status === 'pending').length;

  // Current user (dynamic)
  const currentUser = (() => {
    if (currentUserId === 'admin') {
      return { id: 'admin', name: 'Super Administrador', email: 'admin@servitracks.com', role: 'superadmin' as const };
    }
    
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = localStorage.getItem("servitracks-session");
        if (sessionStr && JSON.parse(sessionStr).role === 'superadmin') {
          return { id: 'admin', name: 'Super Administrador', email: 'admin@servitracks.com', role: 'superadmin' as const };
        }
      } catch (e) {}
    }

    return users.find((u) => u.id === currentUserId);
  })();

  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const activeRole = simulatedRole || currentUser?.role || 'receptionist';
  const isOwner = currentUser?.role === 'owner' || !!simulatedRole;

  const roleNames: Record<string, string> = {
    'owner': 'Administrador',
    'cashier': 'Cajera',
    'warehouse': 'Almacén',
    'mechanic': 'Mecánico',
    'receptionist': 'Recepcionista',
    'superadmin': 'Super Admin'
  };
  const displayRole = roleNames[activeRole] || 'Usuario';

  // Recovery: If the user is authenticated but not in the local store (e.g. after login or refresh), fetch them
  useEffect(() => {
    if (currentUserId && currentUserId !== 'admin' && !currentUser) {
      async function fetchMissingUser() {
        const { data: rows, error } = await supabaseAdmin
          .from("tenant_users")
          .select("*")
          .eq("user_id", currentUserId)
          .limit(1);
        
        const data = rows?.[0];
        if (data && !error) {
          useStore.getState().addUser({
            id: currentUserId!, // Use auth user_id as the store ID
            tenantId: data.tenant_id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            createdAt: data.created_at || new Date().toISOString()
          });
        }
      }
      fetchMissingUser();
    }
  }, [currentUserId, currentUser]);

  // Profile dialog
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
  });

  const handleOpenProfile = () => {
    setProfileForm({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
    });
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (!profileForm.name.trim()) { toast.error("El nombre es requerido"); return; }

    // Update local store
    updateUser(currentUser.id, { name: profileForm.name, email: profileForm.email });

    // Persist to Supabase (tenant_users table)
    try {
      const { error } = await supabaseAdmin
        .from("tenant_users")
        .update({ name: profileForm.name, email: profileForm.email })
        .eq("user_id", currentUser.id);

      if (error) {
        // Fallback: try matching by email if user_id doesn't match
        const { error: error2 } = await supabaseAdmin
          .from("tenant_users")
          .update({ name: profileForm.name })
          .eq("email", currentUser.email);
        
        if (error2) {
          console.error("[Profile] Error saving to Supabase:", error, error2);
          toast.warning("Perfil actualizado localmente. Error al sincronizar con servidor.");
          setProfileOpen(false);
          return;
        }
      }
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      console.error("[Profile] Exception:", err);
      toast.warning("Perfil actualizado localmente");
    }
    setProfileOpen(false);
  };

  const handleSupport = () => {
    const message = encodeURIComponent("*SOPORTE SERVITRACKS* 🛠️\n¡Hola equipo! 👋🏼\nEstoy utilizando el sistema y necesito asistencia técnica con mi cuenta.");
    window.open(`https://wa.me/18299681720?text=${message}`, "_blank");
    toast.info("Abriendo WhatsApp de soporte...");
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    useStore.getState().setAuthenticated(false);
    localStorage.removeItem("servitracks-session");
    toast.success("Sesión cerrada correctamente");
    navigate("/login");
  };

  const initials = currentUser
    ? currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "YA";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-100 bg-white/80 px-4 sm:px-8 backdrop-blur-md">
        <div className="flex w-full max-w-md items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-full flex-shrink-0 cursor-pointer text-neutral-500 hover:bg-neutral-50"
            onClick={onMenuClick}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              placeholder="Buscar órdenes, clientes, vehículos..."
              className="w-full rounded-full border-neutral-100 bg-neutral-50 pl-10 h-10 text-sm focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Messages Button */}
          <Popover>
            <PopoverTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-50 outline-none">
              <MessageSquare className="h-5 w-5" />
              {pendingMessagesCount > 0 && (
                <span className="absolute right-2 top-2 h-4 min-w-4 flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white px-1 ring-2 ring-white">
                  {pendingMessagesCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none mt-2" align="end">
              <MessagesPanel />
            </PopoverContent>
          </Popover>

          {/* Alerts Button */}
          <Popover>
            <PopoverTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-50 outline-none">
              <Bell className="h-5 w-5" />
              {pendingAlertsCount > 0 && (
                <span className="absolute right-2 top-2 h-4 min-w-4 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white px-1 ring-2 ring-white">
                  {pendingAlertsCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none mt-2" align="end">
              <AlertsPanel />
            </PopoverContent>
          </Popover>
          
          <div className="h-6 w-px bg-neutral-100 mx-2" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-full pl-1 pr-2 hover:bg-neutral-50 outline-none">
              <Avatar className="h-8 w-8 ring-2 ring-neutral-100">
                <AvatarImage src="" />
                <AvatarFallback className="bg-neutral-900 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold text-neutral-900">{currentUser?.name || "Usuario"}</p>
                <p className="text-xs text-neutral-500">{displayRole}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-neutral-100 p-2 shadow-xl">
              <div className="px-2 pb-1 pt-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">MI CUENTA</div>
              <DropdownMenuItem onClick={handleOpenProfile} className="rounded-lg py-2 cursor-pointer gap-2">
                <User className="h-4 w-4 text-neutral-400" /> Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSupport} className="rounded-lg py-2 cursor-pointer gap-2">
                <Headphones className="h-4 w-4 text-neutral-400" /> Soporte
              </DropdownMenuItem>

              {isOwner && !simulatedRole && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-lg py-2 cursor-pointer gap-2">
                    <Shield className="h-4 w-4 text-neutral-400" /> Simular Rol
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="z-[105]">
                      <div className="px-2 pb-1 pt-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Modo Prueba</div>
                      <DropdownMenuItem onClick={() => { localStorage.setItem("simulated-role", "cashier"); toast.success("Simulando vista de Cajera"); window.location.reload(); }} className="cursor-pointer text-xs">Cajera (POS y Caja)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { localStorage.setItem("simulated-role", "warehouse"); toast.success("Simulando vista de Almacén"); window.location.reload(); }} className="cursor-pointer text-xs">Almacén (Inventario y OT)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { localStorage.setItem("simulated-role", "mechanic"); toast.success("Simulando vista de Mecánico"); window.location.reload(); }} className="cursor-pointer text-xs">Mecánico (OT y Comisiones)</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}
              {simulatedRole && (
                <DropdownMenuItem onClick={() => { localStorage.removeItem("simulated-role"); toast.success("Modo Dueño restaurado"); window.location.reload(); }} className="rounded-lg py-2 cursor-pointer gap-2 text-emerald-600 focus:text-emerald-700 font-bold bg-emerald-50 mt-1">
                  <Shield className="h-4 w-4" /> Restaurar Acceso Admin
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="rounded-lg py-2 text-red-600 focus:text-red-600 cursor-pointer gap-2">
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="h-9 w-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              Mi Perfil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-neutral-900 text-white text-xl font-black flex items-center justify-center">
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">{profileForm.name || "Sin nombre"}</p>
                <p className="text-xs text-neutral-500">{profileForm.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="h-3 w-3 text-neutral-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {currentUser?.role === "owner" ? "Dueño / Admin" : currentUser?.role || "Usuario"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-600">Nombre Completo</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="h-10 rounded-xl border-neutral-200 text-sm"
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-600">Correo Electrónico</Label>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="h-10 rounded-xl border-neutral-200 text-sm"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setProfileOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 gap-2" onClick={handleSaveProfile}>
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
