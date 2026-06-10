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
import { Search, Filter, MoreVertical, Plus, Edit, Trash2, Eye, Star, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SupplierFormDialog from "./SupplierFormDialog";
import SupplierDetailDialog from "./SupplierDetailDialog";

const statusColors: Record<string, string> = { activo: "bg-emerald-100 text-emerald-700", suspendido: "bg-amber-100 text-amber-700", bloqueado: "bg-rose-100 text-rose-700" };
const typeLabels: Record<string, string> = { repuestos: "Repuestos", lubricantes: "Lubricantes", neumaticos: "Neumáticos", herramientas: "Herramientas", servicios_externos: "Servicios Ext." };

export default function SuppliersTab({ tenantId }: { tenantId: string }) {
  const allSuppliers = useStore((s) => s.suppliers);
  const suppliers = allSuppliers.filter((s) => s.tenantId === tenantId);
  const { deleteSupplier } = useStore();
  
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser = currentUserId === 'admin' ? { role: 'owner' } : users.find((u) => u.id === currentUserId);
  const isOwner = currentUser?.role === 'owner';
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  const filtered = suppliers.filter((s) => {
    const matchSearch = s.commercialName.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()) || (s.rnc || "").includes(search);
    const matchType = typeFilter === "Todos" || s.type === typeFilter;
    const matchStatus = statusFilter === "Todos" || s.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleDelete = (s: Supplier) => { deleteSupplier(s.id); toast.success(`"${s.commercialName}" eliminado`); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input placeholder="Buscar proveedor, código, RNC..." className="rounded-full border-neutral-200 bg-white pl-10 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "Todos")}>
            <SelectTrigger className="w-36 h-9 rounded-full border-neutral-200 bg-white"><Filter className="h-3.5 w-3.5 mr-1 text-neutral-400" /><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos los tipos</SelectItem>
              {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
            <SelectTrigger className="w-32 h-9 rounded-full border-neutral-200 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="suspendido">Suspendido</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isOwner && (
          <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo Proveedor
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow>
              <TableHead className="w-[60px]">Código</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-neutral-400">No se encontraron proveedores.</TableCell></TableRow>
            ) : filtered.map((s) => {
              const avg = ((s.ratingDelivery + s.ratingQuality + s.ratingPrice + s.ratingService) / 4).toFixed(1);
              const contact = s.contacts[0];
              return (
                <TableRow key={s.id} className="group hover:bg-neutral-50/50 cursor-pointer" onClick={() => setDetailSupplier(s)}>
                  <TableCell className="font-mono text-xs text-neutral-500">{s.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{s.commercialName}</p>
                        {s.rnc && <p className="text-xs text-neutral-400">RNC: {s.rnc}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-600 border-none text-xs">{typeLabels[s.type]}</Badge></TableCell>
                  <TableCell>
                    {contact ? (
                      <div><p className="text-sm text-neutral-700">{contact.name}</p><p className="text-xs text-neutral-400">{contact.phone}</p></div>
                    ) : <span className="text-xs text-neutral-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold">{avg}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className={cn("text-xs border-none", statusColors[s.status])}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 outline-none"><MoreVertical className="h-4 w-4 text-neutral-400" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-44">
                        <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => setDetailSupplier(s)}><Eye className="h-4 w-4" /> Ver Detalle</DropdownMenuItem>
                        {isOwner && <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => setEditSupplier(s)}><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>}
                        {isOwner && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2" onClick={() => handleDelete(s)}><Trash2 className="h-4 w-4" /> Eliminar</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <SupplierFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} tenantId={tenantId} />
      {editSupplier && <SupplierFormDialog open={!!editSupplier} onOpenChange={(o) => { if (!o) setEditSupplier(null); }} tenantId={tenantId} editSupplier={editSupplier} />}
      <SupplierDetailDialog supplier={detailSupplier} open={!!detailSupplier} onOpenChange={(o) => { if (!o) setDetailSupplier(null); }} tenantId={tenantId} />
    </div>
  );
}
