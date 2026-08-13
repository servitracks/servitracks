"use client";

import { useState } from "react";
import { useStore, ActivityLog } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  History, User, Activity, Search, ShieldAlert,
  ShoppingCart, Wrench, Package, Settings, Wallet, 
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  admin: "bg-purple-100 text-purple-700",
  cashier: "bg-emerald-100 text-emerald-700",
  mechanic: "bg-blue-100 text-blue-700",
  receptionist: "bg-amber-100 text-amber-700",
  warehouse: "bg-indigo-100 text-indigo-700",
};

const roleNames: Record<string, string> = {
  owner: "Dueño",
  admin: "Dueño",
  cashier: "Cajero",
  mechanic: "Mecánico",
  receptionist: "Recepción",
  warehouse: "Almacén",
};

const moduleIcons: Record<string, any> = {
  POS: ShoppingCart,
  ORDENES: Wrench,
  INVENTARIO: Package,
  AJUSTES: Settings,
  CAJA: Wallet,
  CRM: User,
  MANTENIMIENTO: Activity,
};

export default function ActivityLogPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug);
  const tenantId = currentTenant?.id;
  
  const allLogs = useStore((s) => s.activityLogs);
  const logs = allLogs.filter(l => 
    l.tenantId === tenantId && 
    !['owner', 'admin', 'superadmin'].includes(l.userRole)
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || log.userRole === selectedRole;
    const matchesModule = selectedModule === "all" || log.module === selectedModule;
    return matchesSearch && matchesRole && matchesModule;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <History className="h-8 w-8 text-indigo-600" />
            Registro de Actividad
          </h1>
          <p className="text-neutral-500">Supervisa las acciones de los usuarios según sus roles en tiempo real.</p>
        </div>
      </div>

      <Card className="border-neutral-200/60 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input 
                placeholder="Buscar por usuario o acción..." 
                className="pl-9 bg-neutral-50 border-none rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-3 py-2 rounded-xl border-none bg-neutral-50 text-sm font-medium outline-none text-neutral-700"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">Todos los Roles</option>
              <option value="owner">Dueño / Admin</option>
              <option value="cashier">Cajero</option>
              <option value="receptionist">Recepción</option>
              <option value="mechanic">Mecánico</option>
              <option value="warehouse">Almacén</option>
            </select>
            <select 
              className="px-3 py-2 rounded-xl border-none bg-neutral-50 text-sm font-medium outline-none text-neutral-700"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="all">Todas las Áreas</option>
              <option value="POS">Facturación POS</option>
              <option value="ORDENES">Órdenes de Trabajo</option>
              <option value="INVENTARIO">Inventario</option>
              <option value="CAJA">Control de Caja</option>
              <option value="AJUSTES">Ajustes / Usuarios</option>
            </select>
          </div>

          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 before:to-transparent">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 flex flex-col items-center">
                <ShieldAlert className="h-12 w-12 text-neutral-300 mb-3" />
                <p>No se encontraron registros de actividad con los filtros seleccionados.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const Icon = moduleIcons[log.module] || Activity;
                return (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Icon className="h-4 w-4 text-neutral-500" />
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-neutral-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 text-sm">{log.userName}</span>
                          <Badge className={cn("border-none text-[10px] uppercase px-1.5 py-0", roleColors[log.userRole] || "bg-neutral-100 text-neutral-700")}>
                            {roleNames[log.userRole] || log.userRole}
                          </Badge>
                        </div>
                        <time className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.createdAt), "dd MMM HH:mm", { locale: es })}
                        </time>
                      </div>
                      <div className="text-sm text-neutral-600">
                        {log.details}
                      </div>
                      <div className="mt-3 flex">
                         <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50 border border-neutral-100 px-2 py-1 rounded-md">
                           Módulo: {log.module}
                         </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
