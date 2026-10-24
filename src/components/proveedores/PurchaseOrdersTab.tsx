"use client";

import { useState } from "react";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  MoreVertical, 
  Send, 
  PackageCheck, 
  XCircle, 
  Trash2, 
  Edit,
  ShoppingCart,
  Truck,
  Package,
  Calendar,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PurchaseOrderDialog from "./PurchaseOrderDialog";
import GoodsReceiptDialog from "./GoodsReceiptDialog";
import DirectPurchaseDialog from "./DirectPurchaseDialog";

const statusConfig: Record<PurchaseOrderStatus, { label: string; badge: string; dot: string }> = {
  borrador: { 
    label: "Borrador", 
    badge: "bg-neutral-100 text-neutral-700 border-neutral-200", 
    dot: "bg-neutral-400" 
  },
  pendiente: { 
    label: "Pendiente", 
    badge: "bg-amber-50 text-amber-700 border-amber-200/80", 
    dot: "bg-amber-500" 
  },
  enviada: { 
    label: "Enviada", 
    badge: "bg-blue-50 text-blue-700 border-blue-200/80", 
    dot: "bg-blue-500" 
  },
  recibida_parcial: { 
    label: "Parcial", 
    badge: "bg-orange-50 text-orange-700 border-orange-200/80", 
    dot: "bg-orange-500" 
  },
  recibida_completa: { 
    label: "Completa", 
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", 
    dot: "bg-emerald-500" 
  },
  cancelada: { 
    label: "Cancelada", 
    badge: "bg-rose-50 text-rose-700 border-rose-200/80", 
    dot: "bg-rose-500" 
  },
};

export default function PurchaseOrdersTab({ tenantId }: { tenantId: string }) {
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const { updatePurchaseOrder, deletePurchaseOrder } = useStore();
  
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser = currentUserId === 'admin' ? { role: 'owner' } : users.find((u) => u.id === currentUserId);
  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const isOwner = ['owner', 'superadmin', 'super_admin', 'admin'].includes((simulatedRole || currentUser?.role || '').toLowerCase());
  
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDirectPurchaseOpen, setIsDirectPurchaseOpen] = useState(false);
  const [receiptPO, setReceiptPO] = useState<PurchaseOrder | null>(null);
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null);

  const filtered = purchaseOrders
    .filter((po) => statusFilter === "Todos" || po.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.commercialName || "Proveedor";

  const changeStatus = (po: PurchaseOrder, newStatus: PurchaseOrderStatus) => {
    updatePurchaseOrder(po.id, { status: newStatus });
    toast.success(`${po.number} actualizada a "${statusConfig[newStatus].label}"`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
            <SelectTrigger className="w-44 h-9 rounded-xl border-neutral-200 bg-white text-xs font-medium text-neutral-700 shadow-2xs cursor-pointer">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-neutral-200">
              <SelectItem value="Todos" className="text-xs">Todos los estados</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
            Mostrando <strong>{filtered.length}</strong> de {purchaseOrders.length} órdenes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-2xs" 
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Crear Borrador</span>
          </Button>

          <Button 
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-1.5 h-9 px-4 text-xs font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer" 
            onClick={() => setIsDirectPurchaseOpen(true)}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Registrar Compra</span>
          </Button>
        </div>
      </div>

      {/* Tabla de Órdenes de Compra */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-neutral-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100">
          <Table className="w-full text-xs min-w-[750px]">
            <TableHeader className="bg-neutral-50/80">
              <TableRow className="border-b border-neutral-200/80">
                <TableHead className="w-[140px] py-3.5 pl-6 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                  Nº Orden
                </TableHead>
                <TableHead className="min-w-[220px] py-3.5 pl-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Proveedor
                </TableHead>
                <TableHead className="w-[130px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Fecha Emisión
                </TableHead>
                <TableHead className="w-[150px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-right">
                  Monto Total
                </TableHead>
                <TableHead className="w-[120px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
                  Estado
                </TableHead>
                <TableHead className="w-[110px] py-3.5 pr-6 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center bg-white">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-neutral-800 text-sm">
                        No hay órdenes de compra
                      </p>
                      <p className="text-xs text-neutral-500">
                        Genera pedidos de reposición o registra facturas de compra directa a tus suplidores.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((po) => {
                  const status = statusConfig[po.status] || statusConfig.pendiente;
                  return (
                    <TableRow key={po.id} className="group hover:bg-neutral-50/70 bg-white border-b border-neutral-100 transition-colors">
                      <TableCell className="py-3.5 pl-6 font-mono font-bold text-xs sm:text-sm text-neutral-900">
                        {po.number}
                        <span className="block text-[10px] font-normal text-neutral-400 font-mono mt-0.5">
                          {po.items.length} {po.items.length === 1 ? "ítem" : "ítems"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Truck className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-neutral-900">
                            {getSupplierName(po.supplierId)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-xs text-neutral-600">
                        {new Date(po.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="py-3.5 text-right font-mono font-black text-xs sm:text-sm text-neutral-900 tabular-nums">
                        RD$ {po.total.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-3.5 text-center whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border", status.badge)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", status.dot)} />
                          <span>{status.label}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {(po.status === "enviada" || po.status === "recibida_parcial") && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setReceiptPO(po)}
                              className="h-8 px-2.5 text-xs font-semibold rounded-lg border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 gap-1 cursor-pointer"
                              title="Recibir Mercancía en Almacén"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Recibir</span>
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditPO(po)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Editar Orden"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 outline-none transition-colors cursor-pointer">
                              <MoreVertical className="h-4 w-4 text-neutral-400" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl border-neutral-100 p-2 shadow-xl w-52">
                              <div className="px-2 pb-1 pt-0.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">OPCIONES</div>
                              <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => setEditPO(po)}>
                                <Edit className="h-4 w-4 text-neutral-500" /> Editar Orden
                              </DropdownMenuItem>
                              {po.status === "borrador" && (
                                <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => changeStatus(po, "pendiente")}>
                                  <Send className="h-4 w-4 text-neutral-500" /> Marcar Pendiente
                                </DropdownMenuItem>
                              )}
                              {po.status === "pendiente" && (
                                <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium" onClick={() => changeStatus(po, "enviada")}>
                                  <Send className="h-4 w-4 text-blue-600" /> Marcar Enviada
                                </DropdownMenuItem>
                              )}
                              {(po.status === "enviada" || po.status === "recibida_parcial") && (
                                <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium text-emerald-700" onClick={() => setReceiptPO(po)}>
                                  <PackageCheck className="h-4 w-4 text-emerald-600" /> Recibir Mercancía
                                </DropdownMenuItem>
                              )}
                              {isOwner && po.status !== "cancelada" && po.status !== "recibida_completa" && (
                                <>
                                  <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                                  <DropdownMenuItem className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium text-rose-600" onClick={() => changeStatus(po, "cancelada")}>
                                    <XCircle className="h-4 w-4" /> Cancelar Orden
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isOwner && (
                                <DropdownMenuItem 
                                  className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium text-rose-600 focus:text-rose-600" 
                                  onClick={() => { deletePurchaseOrder(po.id); toast.success("Orden de compra eliminada"); }}
                                >
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
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

      {/* Dialogs */}
      {(isCreateOpen || !!editPO) && (
        <PurchaseOrderDialog 
          open={true} 
          onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditPO(null); } }} 
          tenantId={tenantId} 
          editOrder={editPO || undefined} 
          isOwner={isOwner} 
        />
      )}
      <DirectPurchaseDialog 
        open={isDirectPurchaseOpen} 
        onOpenChange={setIsDirectPurchaseOpen} 
        tenantId={tenantId} 
        isOwner={isOwner} 
      />
      {receiptPO && (
        <GoodsReceiptDialog 
          open={!!receiptPO} 
          onOpenChange={(o) => { if (!o) setReceiptPO(null); }} 
          purchaseOrder={receiptPO} 
          tenantId={tenantId} 
        />
      )}
    </div>
  );
}
