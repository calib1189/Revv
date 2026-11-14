import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  adSale,
  decalSale,
  meetSale,
  pointsSale,
  posterSale,
  shopPromotionSale,
  teeSale,
  type Sale,
} from "@/lib/sales/sale";

const PER_TABLE = 500;

// Printed orders that were paid for, whatever happened after.
const PAID_ORDER = ["paid", "sent_to_printer", "failed"] as const;

/**
 * Every real-money purchase from the last `days`, newest first, read
 * from the tables that record them (admins only, by RLS: 0042, 0057,
 * 0119). Nothing is copied into a separate sales table, so this can't
 * drift from what was actually sold. Each table is read on its own and
 * best-effort, so one that hasn't been migrated doesn't hide the rest.
 */
export async function listRecentSales(supabase: SupabaseClient<Database>, days = 90): Promise<Sale[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const none = () => [];

  const [points, tees, posters, decals, ads, meets, promos] = await Promise.all([
    supabase
      .from("points_purchases")
      .select("id, user_id, provider, points, amount_cents, refunded_at, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
    supabase
      .from("tee_orders")
      .select("id, user_id, design, size, status, amount_cents, error, created_at")
      .in("status", PAID_ORDER)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
    supabase
      .from("poster_orders")
      .select("id, user_id, product, status, amount_cents, error, created_at")
      .in("status", PAID_ORDER)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
    supabase
      .from("decal_orders")
      .select("id, user_id, tier, status, amount_cents, error, created_at")
      .in("status", PAID_ORDER)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
    supabase
      .from("ad_campaigns")
      .select("id, advertiser_id, tier, headline, status, price_cents, created_at")
      .neq("status", "pending_payment")
      .gt("price_cents", 0)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
    supabase
      .from("meetups")
      .select("id, host_id, tier, title, status, price_cents, created_at")
      .neq("status", "pending_payment")
      .gt("price_cents", 0)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
    supabase
      .from("shop_promotions")
      .select("id, promoter_id, tier, place_name, price_cents, comped_by, created_at")
      .eq("status", "active")
      .is("comped_by", null)
      .gt("price_cents", 0)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE)
      .then((r) => r.data ?? [], none),
  ]);

  const sales: Sale[] = [
    ...points.map((p) => ({
      ...pointsSale(p),
      id: `points:${p.id}`,
      buyerId: p.user_id,
      amountCents: p.amount_cents,
      createdAt: p.created_at,
      problem: p.refunded_at ? "Refunded" : null,
      refunded: Boolean(p.refunded_at),
    })),
    ...tees.map((o) => ({
      ...teeSale(o),
      id: `tee:${o.id}`,
      buyerId: o.user_id,
      amountCents: o.amount_cents,
      createdAt: o.created_at,
      problem: o.status === "failed" ? `Not printed: ${o.error ?? "unknown error"}` : null,
      refunded: false,
    })),
    ...posters.map((o) => ({
      ...posterSale(o),
      id: `poster:${o.id}`,
      buyerId: o.user_id,
      amountCents: o.amount_cents,
      createdAt: o.created_at,
      problem: o.status === "failed" ? `Not printed: ${o.error ?? "unknown error"}` : null,
      refunded: false,
    })),
    ...decals.map((o) => ({
      ...decalSale(o),
      id: `decal:${o.id}`,
      buyerId: o.user_id,
      amountCents: o.amount_cents,
      createdAt: o.created_at,
      problem: o.status === "failed" ? `Not printed: ${o.error ?? "unknown error"}` : null,
      refunded: false,
    })),
    ...ads.map((a) => ({
      ...adSale(a),
      id: `ad:${a.id}`,
      buyerId: a.advertiser_id,
      amountCents: a.price_cents,
      createdAt: a.created_at,
      problem: a.status === "rejected" ? "Rejected: refund by hand in Stripe" : null,
      refunded: false,
    })),
    ...meets.map((m) => ({
      ...meetSale(m),
      id: `meet:${m.id}`,
      buyerId: m.host_id,
      amountCents: m.price_cents,
      createdAt: m.created_at,
      problem: m.status === "rejected" ? "Rejected: refund by hand in Stripe" : null,
      refunded: false,
    })),
    ...promos.map((p) => ({
      ...shopPromotionSale(p),
      id: `promo:${p.id}`,
      buyerId: p.promoter_id,
      amountCents: p.price_cents,
      createdAt: p.created_at,
      problem: null,
      refunded: false,
    })),
  ];

  return sales.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
