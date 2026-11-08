import { openDB } from "idb";
import type { Product } from "@/store/types";

const DB_NAME = "servitracks-products-cache-db";
const STORE_NAME = "tenant_products";

async function getProductsDB() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return null;
  }
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveTenantProductsToCache(
  tenantId: string,
  products: Product[]
): Promise<void> {
  if (!tenantId) return;
  try {
    const db = await getProductsDB();
    if (!db) return;
    const tenantOnly = products.filter((p) => !p.tenantId || p.tenantId === tenantId);
    await db.put(STORE_NAME, tenantOnly, tenantId);
  } catch (err) {
    console.warn("[ProductsCache] Error guardando caché local de productos:", err);
  }
}

export async function saveAllProductsByTenantToCache(products: Product[]): Promise<void> {
  if (!products || products.length === 0) return;
  try {
    const db = await getProductsDB();
    if (!db) return;
    const grouped = new Map<string, Product[]>();
    for (const p of products) {
      if (!p.tenantId) continue;
      let list = grouped.get(p.tenantId);
      if (!list) {
        list = [];
        grouped.set(p.tenantId, list);
      }
      list.push(p);
    }
    const tx = db.transaction(STORE_NAME, "readwrite");
    for (const [tenantId, list] of grouped.entries()) {
      tx.store.put(list, tenantId);
    }
    await tx.done;
  } catch (err) {
    console.warn("[ProductsCache] Error guardando lotes en caché local:", err);
  }
}

export async function loadTenantProductsFromCache(tenantId: string): Promise<Product[]> {
  if (!tenantId) return [];
  try {
    const db = await getProductsDB();
    if (!db) return [];
    const cached = await db.get(STORE_NAME, tenantId);
    return Array.isArray(cached) ? cached : [];
  } catch (err) {
    console.warn("[ProductsCache] Error leyendo caché local de productos:", err);
    return [];
  }
}

export async function clearTenantProductsCache(tenantId: string): Promise<void> {
  if (!tenantId) return;
  try {
    const db = await getProductsDB();
    if (!db) return;
    await db.delete(STORE_NAME, tenantId);
  } catch (err) {
    console.warn("[ProductsCache] Error limpiando caché local de productos:", err);
  }
}
