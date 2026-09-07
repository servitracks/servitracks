"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useParams, useRouter } from "@/lib/next-compat";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  AlertTriangle, 
  Barcode, 
  ClipboardList, 
  Clock, 
  Search,
  PackageX,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Printer,
  X
} from "lucide-react";

export default function MovimientosDashboard() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const { movements, inventorySessions, products, tenants, users, technicians, currentUserId } = useStore();

  // Resolver el ID real del tenant a partir del slug de la URL
  const currentTenant = tenants.find(t => t.slug === tenantSlug);
  const tenantId = currentTenant?.id || '';

  const [activeTab, setActiveTab] = useState<'movimientos' | 'auditorias' | 'stock_minimo' | 'alertas'>('movimientos');
  const [searchTerm, setSearchTerm] = useState("");
  const [periodo, setPeriodo] = useState<'hoy' | 'mes' | 'anual'>('hoy');
  const [filterType, setFilterType] = useState<'in' | 'out' | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const tenantProducts = useMemo(() => {
    return products.filter(p => p.tenantId === tenantId);
  }, [products, tenantId]);

  const lowStockProducts = useMemo(() => {
    return tenantProducts.filter(p => p.stock <= p.minStock && p.stock > 0);
  }, [tenantProducts]);

  const zeroStockProducts = useMemo(() => {
    return tenantProducts.filter(p => p.stock <= 0);
  }, [tenantProducts]);

  const tenantMovements = useMemo(() => {
    return movements
      .filter(m => m.tenantId === tenantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, tenantId]);

  const movementsWithRunningStock = useMemo(() => {
    // 1. Group movements by product
    const byProduct: Record<string, typeof tenantMovements> = {};
    tenantMovements.forEach(m => {
      if (!byProduct[m.productId]) byProduct[m.productId] = [];
      byProduct[m.productId].push(m);
    });

    // 2. Compute running stock in reverse chronological order
    const result: (typeof tenantMovements[0] & { resultingStock: number, unitCost: number })[] = [];
    
    for (const productId in byProduct) {
      const product = tenantProducts.find(p => p.id === productId);
      let currentStock = product ? product.stock : 0;
      let currentCost = product ? product.costPrice : 0;

      // movements are already sorted descending by date
      const sortedDesc = byProduct[productId].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      sortedDesc.forEach(m => {
        result.push({
          ...m,
          resultingStock: currentStock,
          unitCost: currentCost
        });
        // Reverse the movement to find the stock BEFORE this movement
        if (m.type === 'in') {
          currentStock -= m.quantity;
        } else if (m.type === 'out') {
          currentStock += m.quantity;
        } else if (m.type === 'adjustment') {
          currentStock -= m.quantity;
        }
      });
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tenantMovements, tenantProducts]);

  const tenantSessions = useMemo(() => {
    return inventorySessions
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [inventorySessions, tenantId]);

  // Generación Automática de Alertas Inteligentes
  const alertas = useMemo(() => {
    const list: any[] = [];
    const now = new Date().toISOString();
    
    // 1. Discrepancias en sesiones de inventario
    tenantSessions.forEach(session => {
      session.discrepancies.forEach(disc => {
        if (disc.difference !== 0) {
          list.push({
            id: `disc-${session.id}-${disc.productId}`,
            type: 'discrepancy',
            icon: 'alert',
            title: `Discrepancia en ${disc.productName}`,
            description: `${disc.difference > 0 ? 'Sobran' : 'Faltan'} ${Math.abs(disc.difference)} unidades. Nota: ${disc.notes || 'Sin justificación'}`,
            date: session.createdAt,
            severity: Math.abs(disc.difference) > 5 ? 'high' : 'medium'
          });
        }
      });
    });

    // 2. Salidas "huérfanas" (Sin factura asociada)
    tenantMovements.filter(m => m.type === 'out').forEach(mov => {
      if (!mov.invoiceId && !mov.reason.toLowerCase().includes('factura') && !mov.reason.toLowerCase().includes('venta') && !mov.reason.toLowerCase().includes('cancelación')) {
        list.push({
          id: `huerfano-${mov.id}`,
          type: 'orphan_output',
          icon: 'alert',
          title: `Salida sin facturar: ${mov.productName}`,
          description: `Se retiraron ${mov.quantity} unidades. Motivo: "${mov.reason}". No hay factura vinculada.`,
          date: mov.date,
          severity: 'high'
        });
      }
    });

    return list.sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
      const aSev = severityOrder[a.severity] ?? 3;
      const bSev = severityOrder[b.severity] ?? 3;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [tenantSessions, tenantMovements]);

  // Filtro por periodo para los KPIs
  const movimientosFiltrados = useMemo(() => {
    const now = new Date();
    return tenantMovements.filter(m => {
      const d = new Date(m.date);
      if (periodo === 'hoy') {
        return d.toDateString() === now.toDateString();
      } else if (periodo === 'mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else {
        return d.getFullYear() === now.getFullYear();
      }
    });
  }, [tenantMovements, periodo]);

  const periodoLabel = periodo === 'hoy' ? 'Hoy' : periodo === 'mes' ? 'Este Mes' : 'Este Año';

  const displayedMovements = useMemo(() => {
    return movementsWithRunningStock.filter(m => {
      // Filtro por tipo (entrada/salida)
      if (filterType && m.type !== filterType) return false;
      // Filtro por búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          m.productName.toLowerCase().includes(term) ||
          m.reason.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [movementsWithRunningStock, filterType, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header Compacto y Unificado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">Control de Movimientos</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Supervisión total de entradas, salidas y auditorías de inventario.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Periodo */}
          <div className="flex items-center bg-neutral-100/90 p-1 rounded-xl border border-neutral-200/70">
            {(['hoy', 'mes', 'anual'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodo === p 
                    ? 'bg-white text-neutral-900 shadow-xs' 
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {p === 'hoy' ? 'Hoy' : p === 'mes' ? 'Mensual' : 'Anual'}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push(`/${tenantSlug}/inventory/scanner`)}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            <Barcode className="w-4 h-4" />
            <span>Pasar Inventario</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido (KPIs) — Clickeables y Compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => { setActiveTab('movimientos'); setSearchTerm(''); setFilterType(filterType === 'in' && activeTab === 'movimientos' ? null : 'in'); }}
          className={`bg-white p-3.5 sm:p-4 rounded-2xl border shadow-2xs flex items-center gap-3 text-left transition-all hover:shadow-xs cursor-pointer active:scale-[0.98] ${filterType === 'in' && activeTab === 'movimientos' ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-neutral-200/80 hover:border-neutral-300'}`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider truncate">Entradas · {periodoLabel}</p>
            <p className="text-xl sm:text-2xl font-black text-neutral-900">
              {movimientosFiltrados.filter(m => m.type === 'in').length}
            </p>
          </div>
        </button>
        
        <button
          onClick={() => { setActiveTab('movimientos'); setSearchTerm(''); setFilterType(filterType === 'out' && activeTab === 'movimientos' ? null : 'out'); }}
          className={`bg-white p-3.5 sm:p-4 rounded-2xl border shadow-2xs flex items-center gap-3 text-left transition-all hover:shadow-xs cursor-pointer active:scale-[0.98] ${filterType === 'out' && activeTab === 'movimientos' ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/20' : 'border-neutral-200/80 hover:border-neutral-300'}`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider truncate">Salidas · {periodoLabel}</p>
            <p className="text-xl sm:text-2xl font-black text-neutral-900">
              {movimientosFiltrados.filter(m => m.type === 'out').length}
            </p>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('stock_minimo'); setFilterType(null); }}
          className={`bg-white p-3.5 sm:p-4 rounded-2xl border shadow-2xs flex items-center gap-3 text-left transition-all hover:shadow-xs cursor-pointer active:scale-[0.98] ${activeTab === 'stock_minimo' ? 'border-orange-400 ring-2 ring-orange-100 bg-orange-50/20' : 'border-neutral-200/80 hover:border-neutral-300'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lowStockProducts.length + zeroStockProducts.length > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider truncate">Bajo Stock</p>
            <p className={`text-xl sm:text-2xl font-black ${lowStockProducts.length + zeroStockProducts.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {lowStockProducts.length + zeroStockProducts.length}
            </p>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('alertas'); setFilterType(null); }}
          className={`bg-white p-3.5 sm:p-4 rounded-2xl border shadow-2xs flex items-center gap-3 text-left transition-all hover:shadow-xs cursor-pointer active:scale-[0.98] ${activeTab === 'alertas' ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20' : 'border-neutral-200/80 hover:border-neutral-300'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alertas.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider truncate">Alertas</p>
            <p className={`text-xl sm:text-2xl font-black ${alertas.length > 0 ? 'text-rose-600' : 'text-green-600'}`}>{alertas.length}</p>
          </div>
        </button>
      </div>

      {/* Navegación por Tabs y Contenedor Principal */}
      <div className="bg-white rounded-2xl shadow-xs border border-neutral-200/80 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-neutral-200/80 p-2 sm:p-2.5 gap-2 bg-neutral-50/70">
          <div className="flex flex-wrap items-center gap-1.5">
            <button 
              onClick={() => { setActiveTab('movimientos'); setFilterType(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === 'movimientos' ? 'bg-white shadow-xs text-neutral-900 border border-neutral-200/80' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              Historial de Movimientos
              {filterType && activeTab === 'movimientos' && (
                <span className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${filterType === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {filterType === 'in' ? 'Entradas' : 'Salidas'}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('auditorias'); setFilterType(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === 'auditorias' ? 'bg-white shadow-xs text-neutral-900 border border-neutral-200/80' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              Pases de Inventario
            </button>
            <button 
              onClick={() => { setActiveTab('stock_minimo'); setFilterType(null); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === 'stock_minimo' ? 'bg-white shadow-xs text-orange-600 border border-orange-200' : 'text-neutral-500 hover:bg-orange-50 hover:text-orange-600'}`}
            >
              Stock Mínimo
              {(lowStockProducts.length + zeroStockProducts.length) > 0 && (
                <span className="bg-orange-100 text-orange-700 px-1.5 rounded-full text-[11px] font-bold">{lowStockProducts.length + zeroStockProducts.length}</span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('alertas'); setFilterType(null); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === 'alertas' ? 'bg-white shadow-xs text-rose-600 border border-rose-200' : 'text-neutral-500 hover:bg-rose-50 hover:text-rose-600'}`}
            >
              Alertas de Seguridad
              {alertas.length > 0 && (
                <span className="bg-rose-100 text-rose-700 px-1.5 rounded-full text-[11px] font-bold">{alertas.length}</span>
              )}
            </button>
          </div>

          {/* Botón de limpiar filtro cuando hay uno activo */}
          {filterType && activeTab === 'movimientos' && (
            <button
              onClick={() => setFilterType(null)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>✕ Quitar filtro</span>
            </button>
          )}
        </div>

        {/* Contenido de la Tab Activa */}
        <div className="p-4 sm:p-5 bg-white">
          
          {activeTab === 'movimientos' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="text"
                    placeholder="Buscar producto, motivo, técnico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs text-neutral-500 font-medium">
                    {displayedMovements.length} {displayedMovements.length === 1 ? 'movimiento' : 'movimientos'}
                  </span>
                </div>
              </div>
              
              <div 
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f8fafc' }}
                className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-white shadow-2xs [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-neutral-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100"
              >
                <table className="w-full text-left text-xs min-w-[960px]">
                  <thead className="bg-neutral-50/90 border-b border-neutral-200/80 text-neutral-600">
                    <tr>
                      <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Fecha</th>
                      <th className="px-3.5 py-3 font-semibold">Producto</th>
                      <th className="px-3.5 py-3 font-semibold">Usuario</th>
                      <th className="px-3.5 py-3 font-semibold">Comentario / Motivo</th>
                      <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Entra</th>
                      <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Sale</th>
                      <th className="px-3 py-3 font-bold text-neutral-900 text-center whitespace-nowrap">Saldo</th>
                      <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Costo</th>
                      <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Balance Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {displayedMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="px-3.5 py-2.5 text-neutral-600 whitespace-nowrap font-mono text-[11px]">
                          {new Date(mov.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-neutral-900 max-w-[240px]">
                          <span className="line-clamp-2">{mov.productName}</span>
                        </td>
                        <td className="px-3.5 py-2.5 text-neutral-700 whitespace-nowrap">
                          {(() => {
                            const effectiveUserId = mov.userId || (!mov.technicianId ? currentUserId : undefined);
                            let name = null;
                            let role = null;

                            if (mov.technicianId) {
                              const tech = technicians.find(t => t.id === mov.technicianId);
                              name = tech?.name;
                              role = 'mechanic';
                            } else if (effectiveUserId === 'admin') {
                              name = currentTenant?.name || 'Administrador';
                              role = 'owner';
                            } else if (effectiveUserId) {
                              const user = users.find(u => u.id === effectiveUserId);
                              name = user?.name;
                              role = user?.role;
                            }

                            const roleLabels: Record<string, string> = {
                              owner: 'Dueño', admin: 'Admin', mechanic: 'Técnico',
                              receptionist: 'Recepción', warehouse: 'Almacén', cashier: 'Caja'
                            };

                            const roleColors: Record<string, string> = {
                              owner: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700',
                              mechanic: 'bg-orange-100 text-orange-700', receptionist: 'bg-emerald-100 text-emerald-700',
                              warehouse: 'bg-amber-100 text-amber-700', cashier: 'bg-teal-100 text-teal-700'
                            };

                            const roleLabel = role ? roleLabels[role] || role : '';
                            const roleColor = role ? roleColors[role] || 'bg-neutral-100 text-neutral-700' : '';

                            return name ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-neutral-200/70 flex items-center justify-center text-[9px] font-bold text-neutral-700 uppercase">
                                    {name.charAt(0)}
                                  </span>
                                  <span className="text-xs font-medium text-neutral-900">{name}</span>
                                </span>
                                {roleLabel && (
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded w-fit ml-6.5 ${roleColor}`}>
                                    {roleLabel}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[10px] italic">Sistema</span>
                            );
                          })()}
                        </td>
                        <td className="px-3.5 py-2.5 text-neutral-600 text-xs max-w-[220px] truncate" title={mov.reason}>
                          {mov.reason}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {mov.type === 'in' || (mov.type === 'adjustment' && mov.quantity > 0) ? (
                            <span className="font-bold text-emerald-600">+{Math.abs(mov.quantity)}</span>
                          ) : <span className="text-neutral-300">-</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {mov.type === 'out' || (mov.type === 'adjustment' && mov.quantity < 0) ? (
                            <span className="font-bold text-rose-600">-{Math.abs(mov.quantity)}</span>
                          ) : <span className="text-neutral-300">-</span>}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-neutral-900 text-center whitespace-nowrap bg-blue-50/40">
                          {mov.resultingStock}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-neutral-600 font-mono whitespace-nowrap">
                          RD${mov.unitCost.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-neutral-900 font-mono whitespace-nowrap bg-neutral-50/50">
                          RD${(mov.resultingStock * mov.unitCost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {displayedMovements.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-neutral-400">
                          No se encontraron movimientos {searchTerm ? 'con ese criterio de búsqueda' : 'registrados'}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'auditorias' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenantSessions.map(session => (
                <div 
                  key={session.id} 
                  className="p-5 border border-neutral-200 rounded-2xl hover:border-blue-300 hover:shadow-md cursor-pointer bg-white transition-all"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                        {session.name}
                      </h3>
                      <p className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md uppercase">
                      {session.status}
                    </span>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3 text-sm">
                    <p className="font-medium text-neutral-700 mb-2">Resumen de Escaneos:</p>
                    <p className="text-neutral-600">Total artículos revisados: <span className="font-bold">{session.discrepancies.length}</span></p>
                    <p className="text-neutral-600">
                      Discrepancias encontradas: <span className="font-bold text-rose-600">{session.discrepancies.filter(d => d.difference !== 0).length}</span>
                    </p>
                    
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <p className="text-xs text-neutral-500 mb-1.5">Realizado por:</p>
                      {(() => {
                        const effectiveUserId = session.auditorId || currentUserId;
                        let name = null;
                        let role = null;

                        if (effectiveUserId === 'admin') {
                          name = currentTenant?.name || 'Administrador';
                          role = 'owner';
                        } else if (effectiveUserId) {
                          const user = users.find(u => u.id === effectiveUserId);
                          name = user?.name;
                          role = user?.role;
                        }

                        const roleLabels: Record<string, string> = {
                          owner: 'Dueño',
                          admin: 'Admin',
                          mechanic: 'Técnico',
                          receptionist: 'Recepción',
                          warehouse: 'Almacén',
                          cashier: 'Caja'
                        };

                        const roleColors: Record<string, string> = {
                          owner: 'bg-purple-100 text-purple-700',
                          admin: 'bg-blue-100 text-blue-700',
                          mechanic: 'bg-orange-100 text-orange-700',
                          receptionist: 'bg-emerald-100 text-emerald-700',
                          warehouse: 'bg-amber-100 text-amber-700',
                          cashier: 'bg-teal-100 text-teal-700'
                        };

                        const roleLabel = role ? roleLabels[role] || role : '';
                        const roleColor = role ? roleColors[role] || 'bg-neutral-100 text-neutral-700' : '';

                        return name ? (
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-[10px] font-bold text-neutral-600 uppercase">
                              {name.charAt(0)}
                            </span>
                            <span className="text-sm font-bold text-neutral-800">{name}</span>
                            {roleLabel && (
                              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${roleColor}`}>
                                {roleLabel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-xs italic">Sistema</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
              {tenantSessions.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <ClipboardList className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                  <p className="text-neutral-500">No se han realizado pases de inventario.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stock_minimo' && (
            <div>
              {(lowStockProducts.length + zeroStockProducts.length) > 0 ? (
                <div 
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f8fafc' }}
                  className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-white shadow-2xs [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-neutral-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100"
                >
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead className="bg-orange-50/60 border-b border-orange-100 text-neutral-700">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Producto</th>
                        <th className="px-4 py-3 font-semibold">SKU</th>
                        <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Stock Actual</th>
                        <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Stock Mínimo</th>
                        <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Diferencia</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {[...zeroStockProducts, ...lowStockProducts].map(p => {
                        const diff = p.stock - p.minStock;
                        const isZero = p.stock <= 0;
                        return (
                          <tr key={p.id} className={`transition-colors ${isZero ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-orange-50/30'}`}>
                            <td className="px-4 py-2.5 font-semibold text-neutral-900">{p.name}</td>
                            <td className="px-4 py-2.5 text-neutral-500 font-mono text-[11px]">{p.sku || '—'}</td>
                            <td className={`px-4 py-2.5 text-center font-bold text-base ${isZero ? 'text-red-600' : 'text-orange-600'}`}>{p.stock}</td>
                            <td className="px-4 py-2.5 text-center font-medium text-neutral-600">{p.minStock}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${isZero ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                {diff}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {isZero ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-600 text-white">
                                  <PackageX className="w-3 h-3" /> Agotado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-orange-100 text-orange-700">
                                  <TrendingDown className="w-3 h-3" /> Bajo
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900">Todo en Orden</h3>
                  <p className="text-neutral-500">Todos los productos están por encima de su stock mínimo.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alertas' && (
            <div className="space-y-3">
              {alertas.map(alerta => {
                const colors = alerta.severity === 'critical' 
                  ? { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', title: 'text-red-900', desc: 'text-red-700', badge: 'bg-red-600 text-white', badgeLabel: 'CRÍTICO' }
                  : alerta.severity === 'high'
                  ? { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', title: 'text-rose-900', desc: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', badgeLabel: 'ALTO' }
                  : { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', title: 'text-amber-900', desc: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', badgeLabel: 'MEDIO' };

                const IconComponent = alerta.icon === 'package' ? PackageX : alerta.icon === 'trending' ? TrendingDown : AlertTriangle;

                return (
                  <div key={alerta.id} className={`p-4 rounded-xl border flex gap-4 ${colors.bg} ${colors.border}`}>
                    <IconComponent className={`w-6 h-6 shrink-0 mt-0.5 ${colors.icon}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold ${colors.title}`}>{alerta.title}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${colors.badge}`}>{colors.badgeLabel}</span>
                      </div>
                      <p className={`text-sm ${colors.desc}`}>{alerta.description}</p>
                    </div>
                  </div>
                );
              })}
              {alertas.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900">Almacén Seguro</h3>
                  <p className="text-neutral-500">No hay movimientos inusuales, stock mínimo ni discrepancias.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
      {/* Modal Detalles de Sesión */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-neutral-900">
                  Detalles del Pase de Inventario
                </h3>
                <p className="text-sm text-neutral-500">{selectedSession.name} • {new Date(selectedSession.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Imprimir"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto print:overflow-visible flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-xl">Producto</th>
                    <th className="px-4 py-3 font-semibold text-center">Esperado</th>
                    <th className="px-4 py-3 font-semibold text-center">Físico</th>
                    <th className="px-4 py-3 font-semibold text-center">Dif.</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-xl">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {selectedSession.discrepancies.map((disc: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{disc.productName}</td>
                      <td className="px-4 py-3 text-center text-neutral-500">{disc.expectedQuantity}</td>
                      <td className="px-4 py-3 text-center font-bold">{disc.actualQuantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                          disc.difference > 0 ? 'bg-green-100 text-green-700' :
                          disc.difference < 0 ? 'bg-rose-100 text-rose-700' :
                          'bg-neutral-100 text-neutral-500'
                        }`}>
                          {disc.difference > 0 ? `+${disc.difference}` : disc.difference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs">{disc.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-5 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl flex justify-end print:hidden">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-5 py-2.5 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
