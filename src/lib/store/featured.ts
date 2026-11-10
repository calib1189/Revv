import { listStoreItemsByCategory, type StoreCategory, type StoreItem } from "@/lib/store/catalog";

/** Weeks since the Unix epoch: everyone sees the same featured items,
 * and they change each week. */
export function storeWeek(now: Date = new Date()): number {
  return Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
}

/** This week's featured item among a shop's categories: one of its Epic
 * or Legendary pieces (200+ points), never a founder-only one. */
export function featuredItem(categories: StoreCategory[], week: number): StoreItem | null {
  const pool = categories
    .flatMap((c) => listStoreItemsByCategory(c))
    .filter((i) => i.price >= 200)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return null;
  return pool[((week % pool.length) + pool.length) % pool.length];
}
