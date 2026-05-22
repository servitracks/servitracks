"use client";

import { useHydration } from "@/store/useHydration";

/**
 * Wrapper that shows a loading skeleton until the Zustand store
 * has finished rehydrating from localStorage.
 * This prevents the "data flash" on Vercel where SSR renders default
 * store values and then the client overwrites them with localStorage data.
 */
export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-8 animate-pulse">
          {/* Greeting skeleton */}
          <div className="flex items-end justify-between">
            <div>
              <div className="h-8 w-48 bg-neutral-100 rounded-lg" />
              <div className="h-4 w-72 bg-neutral-50 rounded mt-2" />
            </div>
          </div>
          {/* KPI cards skeleton */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-neutral-50 rounded-2xl border border-neutral-100"
              />
            ))}
          </div>
          {/* Charts skeleton */}
          <div className="grid gap-6 lg:grid-cols-7">
            <div className="lg:col-span-4 h-[340px] bg-neutral-50 rounded-2xl border border-neutral-100" />
            <div className="lg:col-span-3 h-[340px] bg-neutral-50 rounded-2xl border border-neutral-100" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
