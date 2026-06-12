"use client";

import { useMemo, useState } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { Wallet, Activity, ArrowRight, ShieldAlert, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRD } from "@/lib/utils";

export default function MisComisionesPage() {
  const { tenant } = useParams();
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenant);
  const tenantId = currentTenant?.id ?? "";

  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUser = users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === tenantId) || null;

  const technicians = useStore((s) => s.technicians);
  const invoices = useStore((s) => s.invoices);

  // Intentar vincular el usuario actual con un técnico (por nombre)
  const miPerfilTecnico = useMemo(() => {
    if (!currentUser) return null;
    return technicians.find(t => 
      t.tenantId === tenantId && 
      t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
    );
  }, [technicians, currentUser, tenantId]);

  // Si no se encuentra el vínculo exacto, mostramos una lista general o mensaje
  // Pero lo ideal es que coincida.
  
  const techId = miPerfilTecnico?.id;

  const pendingInvoices = useMemo(() => {
    if (!techId) return [];
    return invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      inv.mechanicId === techId && 
      !inv.isCommissionPaid
    );
  }, [invoices, tenantId, techId]);

  const { totalComision, itemsPendientes } = useMemo(() => {
    let globalTotal = 0;
    const items = pendingInvoices.map(inv => {
      let comisionTotal = 0;
      let manoObraTotal = 0;

      (inv.items || []).forEach(item => {
        if (!item) return;
        const isManoObra = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
        if (isManoObra) {
          manoObraTotal += ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
        } else {
          comisionTotal += (item.laborPrice || 0) * (item.quantity || 1);
        }
      });
      
      const totalFila = comisionTotal + manoObraTotal;
      globalTotal += totalFila;

      return {
        factura: inv.ncf || inv.id,
        fecha: inv.createdAt,
        comisionTotal,
        manoObraTotal,
        totalFila
      };
    });

    return { totalComision: globalTotal, itemsPendientes: items };
  }, [pendingInvoices]);

  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const activeRole = simulatedRole || currentUser?.role || 'receptionist';

  if (!currentUser || (activeRole !== 'mechanic' && activeRole !== 'owner')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-neutral-800">Acceso Restringido</h2>
        <p className="text-neutral-500 mt-2">No tienes permiso para ver esta sección.</p>
      </div>
    );
  }

  if (!miPerfilTecnico) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Activity className="h-16 w-16 text-amber-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-neutral-800">Perfil de Técnico no vinculado</h2>
        <p className="text-neutral-500 mt-2 max-w-md mx-auto">
          Tu cuenta de usuario "{currentUser.name}" no coincide con ningún técnico registrado.
          Pídele al administrador que verifique que tu nombre de usuario y nombre de técnico coincidan exactamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Mis Comisiones</h1>
        <p className="text-neutral-500">Hola {miPerfilTecnico.name}, aquí puedes ver tus ingresos pendientes por liquidar.</p>
      </div>

      <Card className="border-blue-200 bg-blue-600 shadow-lg shadow-blue-600/20 rounded-2xl overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <CardContent className="p-8 flex flex-col justify-center text-white relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-blue-200" />
            <span className="text-sm font-semibold text-blue-100 uppercase tracking-wider">Total Pendiente de Pago</span>
          </div>
          <h3 className="text-5xl font-black drop-shadow-md">{formatRD(totalComision)}</h3>
          <p className="text-blue-100 text-sm mt-3 flex items-center gap-1.5 opacity-90">
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
            Fondos calculados automáticamente por el sistema
          </p>
        </CardContent>
      </Card>

      <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/50">
          <h3 className="font-bold text-neutral-900">Desglose de Trabajos</h3>
          <p className="text-xs text-neutral-500">Historial de facturas cerradas con tu participación</p>
        </div>
        <div className="p-0">
          {itemsPendientes.length === 0 ? (
            <div className="p-10 text-center text-neutral-400 font-medium">
              No tienes comisiones pendientes. ¡A trabajar! 🛠️
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 border-b border-neutral-100 text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Factura / NCF</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Comisión (%)</th>
                    <th className="px-4 py-3 text-right">Mano de Obra (RD$)</th>
                    <th className="px-4 py-3 text-right">Total Generado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {itemsPendientes.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {item.factura}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                        {new Date(item.fecha).toLocaleString('es-DO', { 
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {item.comisionTotal > 0 ? formatRD(item.comisionTotal) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">
                        {item.manoObraTotal > 0 ? formatRD(item.manoObraTotal) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-neutral-900">
                        {formatRD(item.totalFila)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
