"use client";

import { useState } from "react";
import type { Product, QuoteRequest } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tenantId: string;
}

export default function QuoteRequestDialog({ open, onOpenChange, product, tenantId }: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId && s.status === "activo");
  const { addQuoteRequest } = useStore();

  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  if (!product) return null;

  const filteredSuppliers = suppliers.filter((s) =>
    s.commercialName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSupplier = (id: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === filteredSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(filteredSuppliers.map((s) => s.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuppliers.length === 0) {
      toast.error("Selecciona al menos un proveedor");
      return;
    }

    const qr: QuoteRequest = {
      id: `qr_${Date.now()}`,
      tenantId,
      productName: product.name,
      description: `Cotización solicitada para ${product.name} (SKU: ${product.sku})`,
      supplierIds: selectedSuppliers,
      responses: [],
      status: "pendiente",
      createdAt: new Date().toISOString(),
    };

    addQuoteRequest(qr);
    toast.success(`Cotización enviada a ${selectedSuppliers.length} proveedores`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Solicitar Cotización
          </DialogTitle>
          <p className="text-sm text-neutral-500">
            Producto: <strong className="text-neutral-900">{product.name}</strong>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Seleccionar Proveedores</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Buscar proveedor..."
                className="pl-9 rounded-xl border-neutral-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="bg-neutral-50 p-2 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-2">Proveedores ({filteredSuppliers.length})</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSelectAll}>
                {selectedSuppliers.length === filteredSuppliers.length && filteredSuppliers.length > 0 ? "Deseleccionar Todos" : "Seleccionar Todos"}
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              {filteredSuppliers.length === 0 ? (
                <p className="text-sm text-center text-neutral-400 py-4">No se encontraron proveedores activos.</p>
              ) : (
                filteredSuppliers.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      selectedSuppliers.includes(s.id) ? "bg-blue-50/50" : "hover:bg-neutral-50"
                    )}
                  >
                    <Checkbox
                      checked={selectedSuppliers.includes(s.id)}
                      onCheckedChange={() => toggleSupplier(s.id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{s.commercialName}</p>
                      <p className="text-[10px] text-neutral-500 capitalize">{s.type.replace('_', ' ')}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 gap-2">
              <Send className="h-4 w-4" /> Enviar Solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
