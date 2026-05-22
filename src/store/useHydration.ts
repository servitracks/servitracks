import { useEffect, useState } from "react";

/**
 * Hook that returns `true` only after the Zustand persisted store
 * has finished rehydrating from localStorage.
 *
 * Use this to prevent hydration mismatches between SSR (default state)
 * and the client (localStorage state).
 *
 * Usage:
 *   const hydrated = useHydration();
 *   if (!hydrated) return <LoadingSkeleton />;
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist rehydrates synchronously before useEffect runs,
    // so by the time this effect fires the store is already hydrated.
    setHydrated(true);
  }, []);

  return hydrated;
}
