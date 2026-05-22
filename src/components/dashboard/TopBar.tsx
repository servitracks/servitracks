"use client";

import { useState } from "react";
import { Bell, Search, User, Headphones, LogOut, MessageSquare, Save, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

export function TopBar() {
  const maintenanceAlerts = useStore((s) => s.maintenanceAlerts);
  const whatsappLogs = useStore((s) => s.whatsappLogs);
  const users = useStore((s) => s.users);
  const updateUser = useStore((s) => s.updateUser);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUserId = useStore((s) => s.setCurrentUserId);
  const navigate = useNavigate();
  const params = useParams();
  const tenantSlug = params.tenant || "autocheck";
  
  const pendingAlertsCount = maintenanceAlerts.filter((a: any) => a.status === 'pending').length;
  const pendingMessagesCount = whatsappLogs.filter((l: any) => l.status === 'failed' || l.status === 'pending').length;

  // Current user (dynamic)
  const currentUser = currentUserId === 'admin'
    ? { id: 'admin', name: 'Super Administrador', email: 'admin@servitracks.com', role: 'superadmin' }
    : users.find((u) => u.id === currentUserId);

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

  const handleSaveProfile = () => {
    if (!currentUser) return;
    if (!profileForm.name.trim()) { toast.error("El nombre es requerido"); return; }
    updateUser(currentUser.id, { name: profileForm.name, email: profileForm.email });
    toast.success("Perfil actualizado correctamente");
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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-100 bg-white/80 px-8 backdrop-blur-md">
        <div className="flex w-full max-w-md items-center">
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
                <p className="text-xs text-neutral-500">Administrador</p>
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
