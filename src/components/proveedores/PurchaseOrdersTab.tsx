"use client";
import { useState } from "react";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreVertical, Send, PackageCheck, XCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PurchaseOrderDialog from "./PurchaseOrderDialog";
import GoodsReceiptDialog from "./GoodsReceiptDialog";
import DirectPurchaseDialog from "./DirectPurchaseDialog";

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  borrador: { label: "Borrador", color: "bg-neutral-100 text-neutral-600" },
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  enviada: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
  recibida_parcial: { label: "Parcial", color: "bg-orange-100 text-orange-700" },
  recibida_completa: { label: "Completa", color: "bg-emerald-100 text-emerald-700" },
  cancelada: { label: "Cancelada", color: "bg-rose-100 text-rose-700" },
};

export default function PurchaseOrdersTab({ tenantId }: { tenantId: string }) {
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const { updatePurchaseOrder, deletePurchaseOrder } = useStore();
  
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser = currentUserId === 'admin' ? { role: 'owner' } : users.find((u) => u.id === currentUserId);
  const isOwner = currentUser?.role === 'owner';
  
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDirectPurchaseOpen, setIsDirectPurchaseOpen] = useState(false);
  const [receiptPO, setReceiptPO] = useState<PurchaseOrder | null>(null);

  const filtered = purchaseOrders
    .filter((po) => statusFilter === "Todos" || po.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.commercialName || "—";

  const changeStatus = (po: PurchaseOrder, newStatus: PurchaseOrderStatus) => {
    updatePurchaseOrder(po.id, { status: newStatus });
    toast.success(`${po.number} → ${statusConfig[newStatus].label}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "Todos")}>
          <SelectTrigger className="w-40 h-9 rounded-full border-neutral-200 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="Todos">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg gap-2" onClick={() => setIsCreateOpen(true)}>
            Crear Borrador
          </Button>
          <Button className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 gap-2" onClick={() => setIsDirectPurchaseOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar Compra
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow>
              <TableHead>Nº OC</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-neutral-400">Sin órdenes de compra.</TableCell></TableRow>
            ) : filtered.map((po) => (
              <TableRow key={po.id} className="hover:bg-neutral-50/50">
                <TableCell className="font-mono font-bold text-sm">{po.number}</TableCell>
                <TableCell className="text-sm">{getSupplierName(po.supplierId)}</TableCell>
                <TableCell className="text-sm text-neutral-600">{new Date(po.createdAt).toLocaleDateString("es-DO")}</TableCell>
                <TableCell className="font-bold text-sm">RD$ {po.total.toLocaleString("es-DO")}</TableCell>
                <TableCell><Badge className={cn("text-xs border-none", statusConfig[po.status].color)}>{statusConfig[po.status].label}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 outline-none"><MoreVertical className="h-4 w-4 text-neutral-400" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-52">
                      {po.status === "borrador" && <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => changeStatus(po, "pendiente")}><Send className="h-4 w-4" /> Marcar Pendiente</DropdownMenuItem>}
                      {po.status === "pendiente" && <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => changeStatus(po, "enviada")}><Send className="h-4 w-4" /> Marcar Enviada</DropdownMenuItem>}
                      {(po.status === "enviada" || po.status === "recibida_parcial") && <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2 text-emerald-600" onClick={() => setReceiptPO(po)}><PackageCheck className="h-4 w-4" /> Recibir Mercancía</DropdownMenuItem>}
                      {isOwner && po.status !== "cancelada" && po.status !== "recibida_completa" && <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2 text-rose-600" onClick={() => changeStatus(po, "cancelada")}><XCircle className="h-4 w-4" /> Cancelar</DropdownMenuItem>}
                      {isOwner && po.status === "borrador" && <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2 text-rose-600" onClick={() => { deletePurchaseOrder(po.id); toast.success("Orden eliminada"); }}><Trash2 className="h-4 w-4" /> Eliminar</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PurchaseOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} tenantId={tenantId} />
      <DirectPurchaseDialog open={isDirectPurchaseOpen} onOpenChange={setIsDirectPurchaseOpen} tenantId={tenantId} />
      {receiptPO && <GoodsReceiptDialog open={!!receiptPO} onOpenChange={(o) => { if (!o) setReceiptPO(null); }} purchaseOrder={receiptPO} tenantId={tenantId} />}
    </div>
  );
}
