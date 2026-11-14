import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { RANK_LABELS, type RankTier } from "@/lib/rating/rank";
import { posterProductById } from "@/lib/posters/products";
import { teeById } from "@/lib/merch/products";

/** One printed order, for the shop's Orders list. */
export interface ShopOrder {
  id: string;
  kind: "decal" | "poster" | "tee";
  title: string;
  detail: string;
  status: "processing" | "printing" | "problem";
  amountCents: number;
  createdAt: string;
}

const STATUS: Record<string, ShopOrder["status"] | null> = {
  paid: "processing",
  sent_to_printer: "printing",
  failed: "problem",
  // Never paid, or abandoned at checkout: not an order.
  awaiting_payment: null,
  canceled: null,
};

/** Your paid decal, poster and tee orders, newest first. Each table is
 * read on its own and best-effort, so one that hasn't been migrated
 * yet doesn't hide the others. */
export async function listMyShopOrders(supabase: SupabaseClient<Database>, userId: string): Promise<ShopOrder[]> {
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const [decals, posters, tees] = await Promise.all([
    supabase.from("decal_orders").select("id, tier, status, amount_cents, created_at").eq("user_id", userId).gte("created_at", since).then((r) => r.data ?? [], () => []),
    supabase.from("poster_orders").select("id, product, status, amount_cents, created_at").eq("user_id", userId).gte("created_at", since).then((r) => r.data ?? [], () => []),
    supabase.from("tee_orders").select("id, design, size, status, amount_cents, created_at").eq("user_id", userId).gte("created_at", since).then((r) => r.data ?? [], () => []),
  ]);
  const out: ShopOrder[] = [];
  for (const o of decals) {
    const status = STATUS[o.status];
    if (status) out.push({ id: o.id, kind: "decal", title: `${RANK_LABELS[o.tier as RankTier]} rank decal`, detail: "Die-cut vinyl sticker", status, amountCents: o.amount_cents, createdAt: o.created_at });
  }
  for (const o of posters) {
    const status = STATUS[o.status];
    const product = posterProductById(o.product);
    if (status) out.push({ id: o.id, kind: "poster", title: "Build poster", detail: product?.label ?? "", status, amountCents: o.amount_cents, createdAt: o.created_at });
  }
  for (const o of tees) {
    const status = STATUS[o.status];
    const design = teeById(o.design);
    if (status) out.push({ id: o.id, kind: "tee", title: `${design?.name ?? "SORZA"} tee`, detail: `Size ${o.size}`, status, amountCents: o.amount_cents, createdAt: o.created_at });
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
