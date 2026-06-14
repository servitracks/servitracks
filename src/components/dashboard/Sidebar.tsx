"use client";

import { useMemo } from "react";
import { Link, usePathname, useParams, useRouter } from "@/lib/next-compat";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import {
  LayoutDashboard,
  Wrench,
  Car,
  Users,
  Package,
  ReceiptText,
  Settings,
  Bell,
  BarChart3,
  ChevronDown,
  Activity,
  UserCog,
  Wallet,
  MessageCircle,
  Truck,
  Briefcase,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Dashboard", href: "", icon: LayoutDashboard, roles: ['owner', 'cashier', 'receptionist'] },
  { name: "Órdenes de Trabajo", href: "/orders", icon: Wrench, roles: ['owner', 'cashier', 'warehouse', 'mechanic', 'receptionist'] },
  { name: "Cotizaciones", href: "/cotizaciones", icon: FileText, roles: ['owner', 'cashier', 'receptionist'] },
  { name: "Facturación POS", href: "/pos", icon: ReceiptText, roles: ['owner', 'cashier'] },
  { name: "Control de Caja", href: "/caja", icon: Wallet, roles: ['owner', 'cashier'] },
  { name: "Conversaciones", href: "/conversaciones", icon: MessageCircle, roles: ['owner', 'cashier', 'receptionist'] },
  { name: "Recordatorios", href: "/reminders", icon: Bell, roles: ['owner', 'cashier', 'receptionist'] },
  { name: "Clientes", href: "/customers", icon: Users, roles: ['owner', 'cashier', 'receptionist'] },
  { name: "Inventario", href: "/inventory", icon: Package, roles: ['owner', 'warehouse'] },
  { name: "Servicios", href: "/services", icon: LayoutDashboard, roles: ['owner'] },
  { name: "Proveedores", href: "/proveedores", icon: Truck, roles: ['owner', 'warehouse'] },
  { name: "Mis Comisiones", href: "/mis-comisiones", icon: Wallet, roles: ['mechanic'] },
  { name: "Nómina", href: "/nomina", icon: Briefcase, roles: ['owner'] },
  { name: "Reportes", href: "/reports", icon: BarChart3, roles: ['owner'] },
  { name: "Mantenimiento", href: "/maintenance", icon: Activity, roles: ['owner', 'cashier'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  unreadChatsCount?: number;
}

export function Sidebar({ isOpen = false, onClose, unreadChatsCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const tenants = useStore((s) => s.tenants);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);

  const tenantSlug =
    params.tenant && params.tenant !== "undefined"
      ? (params.tenant as string)
      : "autocheck";

  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === tenantId) || null;
  }, [users, currentUserId, tenantId]);

  const allowedTenants = useMemo(() => {
    if (!currentUser) return currentTenant ? [currentTenant] : [];
    if (currentUser.email === "admin@servitracks.com") return tenants;
    const sameEmailUsers = users.filter((u) => u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
    const allowedIds = new Set(sameEmailUsers.map((u) => u.tenantId));
    return tenants.filter((t) => allowedIds.has(t.id));
  }, [currentUser, users, tenants, currentTenant]);
  const lowStockCount = products.filter((p) => p.tenantId === tenantId && p.stock <= p.minStock).length;
  const pendingOrdersCount = orders.filter((o) => o.tenantId === tenantId && o.status === "pending").length;
  const tenantName = currentTenant ? currentTenant.name : tenantSlug.replace(/-/g, " ");

  const handleTenantChange = (newSlug: string) => {
    const currentPath = pathname;
    const newPath = currentPath.replace(`/${tenantSlug}`, `/${newSlug}`);
    router.push(newPath);
  };

  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const activeRole = simulatedRole || currentUser?.role || 'owner';

  const filteredNavigation = navigation.filter((item) => {
    return item.roles.includes(activeRole);
  });

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "flex h-full w-64 flex-col bg-white border-r border-neutral-100 flex-shrink-0 transition-transform duration-300 ease-in-out",
        "fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo / Tenant Dropdown Selector */}
        <div className="flex flex-col items-center gap-1.5 px-4 py-3 border-b border-neutral-100">
          <Link 
            href="/" 
            onClick={onClose}
            className="h-20 w-auto flex items-center justify-center overflow-hidden -mb-4 hover:opacity-85 transition-opacity active:scale-[0.98] cursor-pointer"
          >
            <img src="/logo.servitracks.png" alt="ServiTracks" className="h-full w-auto object-contain" />
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] transition-all outline-none border border-neutral-200 shadow-sm cursor-pointer w-full text-left bg-white">
              <div className="h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {currentTenant?.logo ? (
                  <img src={currentTenant.logo} alt={tenantName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-neutral-500 uppercase">
                    {tenantName.substring(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate capitalize text-[13px] font-bold text-neutral-900 leading-tight">
                    {tenantName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                </div>
                <span className="truncate text-[10px] font-medium text-neutral-400 leading-tight mt-0.5">
                  www.servitracks.com/{tenantSlug}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 rounded-xl border-neutral-100 p-2 shadow-lg bg-white z-[100]">
              <div className="px-2 pb-1 pt-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cambiar de Sucursal</div>
              {allowedTenants.map((t) => (
                <DropdownMenuItem 
                  key={t.id} 
                  className={cn(
                    "rounded-lg py-2 cursor-pointer transition-colors px-2 flex items-center justify-between gap-2",
                    t.slug === tenantSlug ? "bg-neutral-900 text-white font-bold hover:bg-neutral-900 focus:bg-neutral-900 focus:text-white" : "text-neutral-700 hover:bg-neutral-50"
                  )}
                  onClick={() => {
                    handleTenantChange(t.slug);
                    onClose?.();
                  }}
                >
                  <span className="truncate">{t.name}</span>
                  {t.status === "pending" && (
                    <span className={cn(
                      "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0",
                      t.slug === tenantSlug ? "bg-white/20 text-white" : "bg-rose-50 text-rose-600 border border-rose-100"
                    )}>
                      Pendiente
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-4">
          {filteredNavigation.map((item) => {
            const href = `/${tenantSlug}${item.href}`;
            const isActive =
              item.href === ""
                ? pathname === `/${tenantSlug}`
                : pathname === href || pathname.startsWith(href + "/");
            const badge =
              item.href === "/inventory" && lowStockCount > 0
                ? lowStockCount
                : item.href === "/orders" && pendingOrdersCount > 0
                ? pendingOrdersCount
                : item.href === "/conversaciones" && unreadChatsCount > 0 && !isActive
                ? unreadChatsCount
                : null;


            return (
              <Link
                key={item.name}
                href={href}
                id={item.href === "/orders" ? "tour-sidebar-orders" : undefined}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-neutral-950 text-white shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive
                        ? "text-white"
                        : "text-neutral-400 group-hover:text-neutral-700"
                    )}
                  />
                  {item.name}
                </div>
                {badge != null && (
                  <span
                    className={cn(
                      "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-rose-100 text-rose-600"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom settings (only for owners) */}
        {(!currentUser || activeRole === 'owner') && (
          <div className="border-t border-neutral-100 p-3">
            <Link
              href={`/${tenantSlug}/settings`}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 transition-all hover:bg-neutral-50 hover:text-neutral-900",
                pathname.includes("/settings") && "bg-neutral-50 text-neutral-900"
              )}
            >
              <Settings className="h-4 w-4 text-neutral-400" />
              Configuración
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
