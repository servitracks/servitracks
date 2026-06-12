import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";

interface AdminPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function AdminPinModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Autorización de Administrador Requerida",
  description = "Por favor, introduzca el PIN del Administrador para realizar esta acción.",
}: AdminPinModalProps) {
  const { tenants, users, currentUserId } = useStore();
  
  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const tenant = tenants.find((t) => t.id === currentUser?.tenantId) || tenants[0];
  const adminPin = tenant?.adminPin || "1234";

  const [pinValue, setPinValue] = useState("");
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinValue === adminPin) {
      toast.success("Autorización concedida");
      onSuccess();
      onOpenChange(false);
      setPinValue("");
    } else {
      toast.error("PIN incorrecto. Autorización denegada.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl p-6 bg-white border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-2 pb-2">
          <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-1">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="font-heading text-lg font-black text-neutral-900 tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block text-center">PIN Administrativo</Label>
            <div className="relative max-w-[200px] mx-auto">
              <Input
                type={showPin ? "text" : "password"}
                maxLength={4}
                className="h-12 rounded-xl border-neutral-200 pr-10 font-mono text-center text-2xl tracking-[0.5em] font-black focus:ring-rose-500 focus:border-rose-500"
                placeholder="••••"
                value={pinValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPinValue(val);
                }}
                autoFocus
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent hover:text-neutral-600"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPinValue("");
              }}
              className="rounded-xl flex-1 border-neutral-200 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 text-xs font-bold"
            >
              Autorizar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
