"use client";

import { useState, useMemo } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileText,
  AlertTriangle,
  TrendingUp,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Quote, QuoteStatus } from "@/store/types";
import QuotationCreateDialog from "./QuotationCreateDialog";
import QuotationDetailDialog from "./QuotationDetailDialog";

const statusColors: Record<QuoteStatus, string> = {
  draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
  sent: "bg-blue-50 text-blue-700 border-blue-100",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
  expired: "bg-amber-50 text-amber-700 border-amber-100",
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

export default function CotizacionesPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allQuotes = useStore((s) => s.quotes);
  const allCustomers = useStore((s) => s.customers);
  const allVehicles = useStore((s) => s.vehicles);
  const deleteQuote = useStore((s) => s.deleteQuote);

  const quotes = useMemo(() => 
    tenantId ? allQuotes.filter((q) => q.tenantId === tenantId) : [],
    [allQuotes, tenantId]
  );

  const customers = useMemo(() => 
    tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [],
    [allCustomers, tenantId]
  );

  const vehicles = useMemo(() => 
    tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : [],
    [allVehicles, tenantId]
  );

  // States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  
  // Dialog controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQuoteIdToEdit, setSelectedQuoteIdToEdit] = useState<string | null>(null);
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<Quote | null>(null);

  // Filters logic
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const customer = customers.find((c) => c.id === q.customerId);
      const vehicle = vehicles.find((v) => v.id === q.vehicleId);

      const customerName = customer?.name?.toLowerCase() || "";
      const quoteNo = q.quoteNumber?.toLowerCase() || "";
      const plate = vehicle?.plate?.toLowerCase() || "";

      const query = search.toLowerCase();
      const matchSearch =
        customerName.includes(query) ||
        quoteNo.includes(query) ||
        plate.includes(query);

      const matchStatus =
        statusFilter === "Todos" || q.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [quotes, customers, vehicles, search, statusFilter]);

  // KPIs calculations
  const kpis = useMemo(() => {
    const totalAmount = quotes.reduce((acc, q) => acc + q.total, 0);
    const pendingCount = quotes.filter((q) => q.status === "draft" || q.status === "sent").length;
    const acceptedQuotes = quotes.filter((q) => q.status === "accepted");
    const acceptedCount = acceptedQuotes.length;
    const conversionRate = quotes.length > 0 
      ? Math.round((acceptedCount / quotes.length) * 100) 
      : 0;

    return {
      totalAmount,
      pendingCount,
      acceptedCount,
      conversionRate,
    };
  }, [quotes]);

  const handleDelete = (id: string, num: string) => {
    if (confirm(`¿Está seguro de que desea eliminar la cotización ${num}?`)) {
      deleteQuote(id);
      toast.success(`Cotización ${num} eliminada`);
    }
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuoteIdToEdit(quote.id);
    setIsCreateOpen(true);
  };

  const handleViewDetail = (quote: Quote) => {
    setSelectedQuoteDetail(quote);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Cotizaciones</h1>
          <p className="text-neutral-500">Administra presupuestos, cotizaciones de clientes y flujos de aprobación.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2 h-10 font-bold"
            onClick={() => { setSelectedQuoteIdToEdit(null); setIsCreateOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Nueva Cotización
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Cotizado",
            value: `RD$ ${kpis.totalAmount.toLocaleString("es-DO")}`,
            icon: DollarSign,
            color: "text-neutral-700",
            bg: "bg-neutral-100",
          },
          {
            label: "Cotizaciones Pendientes",
            value: kpis.pendingCount,
            icon: Calendar,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Aprobadas",
            value: kpis.acceptedCount,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Conversión de Presupuestos",
            value: `${kpis.conversionRate}%`,
            icon: FileCheck,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">{kpi.label}</p>
                <p className="text-xl font-black text-neutral-900">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar por cotización, cliente o placa..."
            className="rounded-full border-neutral-200 bg-neutral-50/30 pl-10 h-10 text-sm focus-visible:ring-black"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto self-end sm:self-auto">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "Todos")}>
            <SelectTrigger className="w-44 h-10 rounded-full border-neutral-200 bg-white text-xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-neutral-400" />
              <SelectValue placeholder="Filtrar por Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos los Estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="accepted">Aceptada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
              <SelectItem value="expired">Expirada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List Table */}
      <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow>
              <TableHead className="w-[140px]">Cotización</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Vence en</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[100px] text-center">Estado</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-neutral-400">
                  No se encontraron cotizaciones registradas.
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes.map((quote) => {
                const customer = customers.find((c) => c.id === quote.customerId);
                const vehicle = vehicles.find((v) => v.id === quote.vehicleId);

                return (
                  <TableRow key={quote.id} className="group hover:bg-neutral-50/30">
                    <TableCell className="font-semibold text-neutral-900 text-sm">
                      <button
                        onClick={() => handleViewDetail(quote)}
                        className="hover:underline text-black font-bold cursor-pointer text-left"
                      >
                        {quote.quoteNumber}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-neutral-950 text-sm">{customer?.name || "Cliente General"}</p>
                        {customer?.phone && <p className="text-[10px] text-neutral-400">{customer.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vehicle ? (
                        <div>
                          <p className="font-semibold text-neutral-900 text-sm">{vehicle.brand} {vehicle.model}</p>
                          <Badge variant="outline" className="text-[9px] h-4.5 font-mono px-1.5 py-0 bg-neutral-50 border-neutral-200">
                            {vehicle.plate.toUpperCase()}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-600 text-xs">
                      {new Date(quote.createdAt).toLocaleDateString("es-DO")}
                    </TableCell>
                    <TableCell className="text-neutral-600 text-xs">
                      {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("es-DO") : <span className="text-neutral-450">—</span>}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-right">
                      RD$ {quote.total.toLocaleString("es-DO")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[10px] font-bold border rounded-full px-2 py-0.5 inline-block text-center w-20", statusColors[quote.status])}>
                        {statusLabels[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 outline-none transition-colors">
                          <MoreVertical className="h-4 w-4 text-neutral-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-44">
                          <div className="px-2 pb-1 pt-0.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">OPCIONES</div>
                          <DropdownMenuItem
                            className="rounded-lg py-2 cursor-pointer gap-2"
                            onClick={() => handleViewDetail(quote)}
                          >
                            <FileText className="h-4 w-4 text-neutral-500" /> Ver Detalle
                          </DropdownMenuItem>
                          
                          {quote.status !== "accepted" && (
                            <DropdownMenuItem
                              className="rounded-lg py-2 cursor-pointer gap-2"
                              onClick={() => handleEdit(quote)}
                            >
                              <Edit className="h-4 w-4 text-neutral-500" /> Editar
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="rounded-lg py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
                            onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Creator/Editor Dialog */}
      <QuotationCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        quoteIdToEdit={selectedQuoteIdToEdit}
        tenantId={tenantId}
      />

      {/* Viewer/Printer Dialog */}
      <QuotationDetailDialog
        open={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedQuoteDetail(null); }}
        quote={selectedQuoteDetail}
        tenantId={tenantId}
      />

    </div>
  );
}
