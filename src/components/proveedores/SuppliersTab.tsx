"use client";

import { useState } from "react";
import type { Supplier } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Star, 
  Truck,
  List,
  LayoutGrid,
  Phone,
  Mail,
  CreditCard,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SupplierFormDialog from "./SupplierFormDialog";
import SupplierDetailDialog from "./SupplierDetailDialog";

const typeLabels: Record<string, string> = { 
  repuestos: "Repuestos", 
  lubricantes: "Lubricantes", 
  neumaticos: "Neumáticos", 
  herramientas: "Herramientas", 
  servicios_externos: "Servicios Ext." 
};

export default function SuppliersTab({ tenantId }: { tenantId: string }) {
  const allSuppliers = useStore((s) => s.suppliers);
  const suppliers = allSuppliers.filter((s) => s.tenantId === tenantId);
  const { deleteSupplier } = useStore();
  
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser = currentUserId === 'admin' ? { role: 'owner' } : users.find((u) => u.id === currentUserId);
  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const isOwner = ['owner', 'superadmin', 'super_admin', 'admin'].includes((simulatedRole || currentUser?.role || '').toLowerCase());
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  const filtered = suppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || 
      s.commercialName.toLowerCase().includes(q) || 
      (s.legalName || "").toLowerCase().includes(q) || 
      s.code.toLowerCase().includes(q) || 
      (s.rnc || "").includes(q) ||
      s.contacts.some(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    const matchType = typeFilter === "Todos" || s.type === typeFilter;
    const matchStatus = statusFilter === "Todos" || s.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleDelete = (s: Supplier) => { 
    deleteSupplier(s.id); 
    toast.success(`Proveedor "${s.commercialName}" eliminado correctamente`); 
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros & Switch de Vistas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Switch de Vista: Lista / Tarjetas */}
          <div className="flex rounded-xl border border-neutral-200/90 overflow-hidden bg-white p-0.5 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista de Lista"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>

          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <Input 
              placeholder="Buscar proveedor, código, RNC, contacto..." 
              className="rounded-xl border-neutral-200 bg-white pl-9 pr-7 h-9 text-xs shadow-2xs" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro Tipo */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "Todos")}>
            <SelectTrigger className="w-36 h-9 rounded-xl border-neutral-200 bg-white text-xs font-medium text-neutral-700 shrink-0 shadow-2xs cursor-pointer">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-neutral-200">
              <SelectItem value="Todos" className="text-xs">Todos los tipos</SelectItem>
              {Object.entries(typeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Estado */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
            <SelectTrigger className="w-32 h-9 rounded-xl border-neutral-200 bg-white text-xs font-medium text-neutral-700 shrink-0 shadow-2xs cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-neutral-200">
              <SelectItem value="Todos" className="text-xs">Todos</SelectItem>
              <SelectItem value="activo" className="text-xs">Activo</SelectItem>
              <SelectItem value="suspendido" className="text-xs">Suspendido</SelectItem>
              <SelectItem value="bloqueado" className="text-xs">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isOwner && (
          <Button 
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-1.5 h-9 px-4 text-xs font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0" 
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Proveedor</span>
          </Button>
        )}
      </div>

      {/* VISTA DE LISTA */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-neutral-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100">
            <Table className="w-full text-xs min-w-[750px]">
              <TableHeader className="bg-neutral-50/80">
                <TableRow className="border-b border-neutral-200/80">
                  <TableHead className="w-[80px] py-3.5 pl-6 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                    Código
                  </TableHead>
                  <TableHead className="min-w-[220px] py-3.5 pl-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Proveedor & RNC
                  </TableHead>
                  <TableHead className="w-[120px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
                    Categoría
                  </TableHead>
                  <TableHead className="w-[160px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Contacto Principal
                  </TableHead>
                  <TableHead className="w-[110px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
                    Score
                  </TableHead>
                  <TableHead className="w-[110px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
                    Estado
                  </TableHead>
                  <TableHead className="w-[90px] py-3.5 pr-6 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                          <Truck className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-neutral-800 text-sm">
                          No se encontraron proveedores
                        </p>
                        <p className="text-xs text-neutral-500">
                          {search
                            ? `No hay proveedores que coincidan con "${search}".`
                            : "No hay registros con los filtros seleccionados."}
                        </p>
                        {(search || typeFilter !== "Todos" || statusFilter !== "Todos") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setTypeFilter("Todos");
                              setStatusFilter("Todos");
                            }}
                            className="mt-2 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => {
                    const avg = ((s.ratingDelivery + s.ratingQuality + s.ratingPrice + s.ratingService) / 4).toFixed(1);
                    const contact = s.contacts[0];
                    return (
                      <TableRow 
                        key={s.id} 
                        className="group hover:bg-neutral-50/70 bg-white border-b border-neutral-100 transition-colors cursor-pointer" 
                        onClick={() => setDetailSupplier(s)}
                      >
                        <TableCell className="py-3.5 pl-6 font-mono font-bold text-xs text-neutral-400">
                          {s.code}
                        </TableCell>
                        <TableCell className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                              <Truck className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-900 text-xs sm:text-sm leading-snug line-clamp-1">{s.commercialName}</p>
                              {s.rnc ? (
                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">RNC: {s.rnc}</p>
                              ) : (
                                <span className="text-[10px] text-neutral-300 italic">Sin RNC</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-center whitespace-nowrap">
                          <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 text-[10px] font-semibold px-2.5 py-0.5">
                            {typeLabels[s.type] || s.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {contact ? (
                            <div>
                              <p className="font-semibold text-neutral-900 text-xs truncate max-w-[150px]">{contact.name}</p>
                              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{contact.phone || contact.email || "—"}</p>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/70">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-mono font-bold text-amber-900">{avg}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-center whitespace-nowrap">
                          {s.status === "activo" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-emerald-200/80 bg-emerald-50 text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Activo
                            </span>
                          ) : s.status === "suspendido" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-amber-200/80 bg-amber-50 text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              Suspendido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-rose-200/80 bg-rose-50 text-rose-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                              Bloqueado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 pr-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailSupplier(s)}
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Ver Ficha Detallada"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => setEditSupplier(s)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                                title="Editar Proveedor"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 outline-none transition-colors cursor-pointer">
                                <MoreVertical className="h-4 w-4 text-neutral-400" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-neutral-100 p-2 shadow-xl w-44">
                                <div className="px-2 pb-1 pt-0.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">OPCIONES</div>
                                <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => setDetailSupplier(s)}>
                                  <Eye className="h-4 w-4 text-neutral-500" /> Ver Detalle
                                </DropdownMenuItem>
                                {isOwner && (
                                  <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => setEditSupplier(s)}>
                                    <Edit className="h-4 w-4 text-neutral-500" /> Editar
                                  </DropdownMenuItem>
                                )}
                                {isOwner && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                                    <DropdownMenuItem className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium" onClick={() => handleDelete(s)}>
                                      <Trash2 className="h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* VISTA DE TARJETAS (Grid Mode) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs">
              <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                <Truck className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                No se encontraron proveedores
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                {search ? `No hay resultados para "${search}".` : "No hay proveedores registrados con estos filtros."}
              </p>
            </div>
          ) : (
            filtered.map((s) => {
              const avg = ((s.ratingDelivery + s.ratingQuality + s.ratingPrice + s.ratingService) / 4).toFixed(1);
              const contact = s.contacts[0];
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Card */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 text-[10px] font-semibold px-2 py-0.5">
                        {typeLabels[s.type] || s.type}
                      </Badge>

                      <div className="flex items-center gap-1">
                        {s.status === "activo" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-emerald-200/80 bg-emerald-50 text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </span>
                        ) : s.status === "suspendido" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-amber-200/80 bg-amber-50 text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Suspendido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-rose-200/80 bg-rose-50 text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Bloqueado
                          </span>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 outline-none transition-colors cursor-pointer">
                            <MoreVertical className="h-3.5 w-3.5 text-neutral-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-neutral-100 p-2 shadow-xl w-44">
                            <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => setDetailSupplier(s)}>
                              <Eye className="h-4 w-4 text-neutral-500" /> Ver Detalle
                            </DropdownMenuItem>
                            {isOwner && (
                              <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => setEditSupplier(s)}>
                                <Edit className="h-4 w-4 text-neutral-500" /> Editar
                              </DropdownMenuItem>
                            )}
                            {isOwner && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                                <DropdownMenuItem className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium" onClick={() => handleDelete(s)}>
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Avatar & Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-11 w-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-neutral-900 text-sm leading-snug line-clamp-1">
                          {s.commercialName}
                        </h4>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                          {s.code} {s.rnc ? `• RNC: ${s.rnc}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Contact & Terms Info */}
                    <div className="space-y-1.5 bg-neutral-50/70 p-2.5 rounded-xl border border-neutral-200/60 mb-3 text-xs">
                      {contact?.name && (
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-[10px] text-neutral-400 uppercase font-semibold">Contacto</span>
                          <span className="font-semibold text-neutral-800 truncate max-w-[160px]">{contact.name}</span>
                        </div>
                      )}
                      {contact?.phone && (
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-[10px] text-neutral-400 uppercase font-semibold">Teléfono</span>
                          <span className="font-mono text-neutral-700">{contact.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-neutral-600">
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Crédito</span>
                        <span className="font-mono font-bold text-neutral-800">
                          {s.creditDays ? `${s.creditDays} días` : "Contado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating & Actions */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/70">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-amber-900">{avg} / 5</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailSupplier(s)}
                        className="h-8 rounded-xl text-xs font-semibold border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                      >
                        Ver Detalle
                      </Button>
                      {isOwner && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditSupplier(s)}
                          className="h-8 rounded-xl text-xs font-semibold border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Dialogs */}
      <SupplierFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} tenantId={tenantId} />
      {editSupplier && (
        <SupplierFormDialog 
          open={!!editSupplier} 
          onOpenChange={(o) => { if (!o) setEditSupplier(null); }} 
          tenantId={tenantId} 
          editSupplier={editSupplier} 
        />
      )}
      <SupplierDetailDialog 
        supplier={detailSupplier} 
        open={!!detailSupplier} 
        onOpenChange={(o) => { if (!o) setDetailSupplier(null); }} 
        tenantId={tenantId} 
        onEdit={(sup) => {
          setDetailSupplier(null);
          setEditSupplier(sup);
        }}
      />
    </div>
  );
}
