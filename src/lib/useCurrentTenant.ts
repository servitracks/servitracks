import { useMemo } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore, Tenant } from "@/store/useStore";

/**
 * Hook centralizado y ultrarrápido para resolver el taller (tenant) actual.
 * Evita fallos por mayúsculas/minúsculas en la URL y resuelve de inmediato
 * el tenantId desde memoria local sin retrasar el renderizado de la UI.
 */
export function useCurrentTenant(): {
  currentTenant: Tenant | null;
  tenantId: string;
  tenantSlug: string;
} {
  const params = useParams();
  const rawSlug = (params?.tenant as string) || "";
  const tenants = useStore((s) => s.tenants);
  const storeTenant = useStore((s) => s.currentTenant);

  const currentTenant = useMemo(() => {
    if (!rawSlug) return storeTenant || null;
    const slugLower = rawSlug.toLowerCase().trim();

    // 1. Si storeTenant ya coincide (por slug insensible a mayúsculas o por id)
    if (
      storeTenant &&
      (storeTenant.slug?.toLowerCase().trim() === slugLower ||
        storeTenant.id?.toLowerCase().trim() === slugLower)
    ) {
      return storeTenant;
    }

    // 2. Buscar en la lista de tenants cargados en el store
    const found = tenants.find(
      (t) =>
        t.slug?.toLowerCase().trim() === slugLower ||
        t.id?.toLowerCase().trim() === slugLower
    );
    if (found) return found;

    // 3. Fallback a storeTenant si está disponible
    if (storeTenant) return storeTenant;

    // 4. Fallback al primer tenant si sólo existe uno
    if (tenants.length === 1) return tenants[0];

    return null;
  }, [tenants, rawSlug, storeTenant]);

  const tenantId = currentTenant?.id ?? "";

  return { currentTenant, tenantId, tenantSlug: rawSlug };
}
