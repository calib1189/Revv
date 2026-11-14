import { RANK_LABELS, type RankTier } from "@/lib/rating/rank";
import { posterProductById } from "@/lib/posters/products";
import { teeById } from "@/lib/merch/products";
import { AD_TIERS, type AdTier } from "@/lib/db/ad-campaigns";
import { MEETUP_TIERS, type MeetupTier } from "@/lib/db/meetups";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";

/** Everything SORZA sells for real money. */
export type SaleKind = "points" | "tee" | "poster" | "decal" | "ad" | "meet" | "shop_promotion";

/** What was bought, in words, the same in Admin → Sales and the push. */
export interface SaleItem {
  kind: SaleKind;
  title: string;
  detail: string;
}

/** One real-money purchase, read back from the table that records it. */
export interface Sale extends SaleItem {
  id: string;
  buyerId: string;
  /** What the buyer paid, before Stripe's or Apple's fee. */
  amountCents: number;
  createdAt: string;
  /** Something an admin should know: refunded, or the print failed. */
  problem: string | null;
  /** A refunded sale isn't counted in the totals. */
  refunded: boolean;
}

export const SALE_KIND_LABELS: Record<SaleKind, string> = {
  points: "Points",
  tee: "Tee",
  poster: "Poster",
  decal: "Decal",
  ad: "Ad",
  meet: "Meet",
  shop_promotion: "Shop promo",
};

export function pointsSale(row: { points: number; provider: string }): SaleItem {
  return {
    kind: "points",
    title: `${row.points.toLocaleString("en-US")} points`,
    detail: row.provider === "apple" ? "App Store" : "Web checkout",
  };
}

export function teeSale(row: { design: string; size: string }): SaleItem {
  return { kind: "tee", title: `${teeById(row.design)?.name ?? "SORZA"} tee`, detail: `Size ${row.size}` };
}

export function posterSale(row: { product: string }): SaleItem {
  const product = posterProductById(row.product);
  return { kind: "poster", title: product?.name ?? "Build poster", detail: product?.detail ?? "" };
}

export function decalSale(row: { tier: string }): SaleItem {
  const label = RANK_LABELS[row.tier as RankTier] ?? "Rank";
  return { kind: "decal", title: `${label} rank decal`, detail: "Die-cut vinyl sticker" };
}

export function adSale(row: { tier: string; headline: string }): SaleItem {
  const label = AD_TIERS[row.tier as AdTier]?.label ?? "Paid";
  return { kind: "ad", title: `${label} ad`, detail: row.headline };
}

export function meetSale(row: { tier: string; title: string }): SaleItem {
  const label = MEETUP_TIERS[row.tier as MeetupTier]?.label ?? "Paid";
  return { kind: "meet", title: `${label} meet listing`, detail: row.title };
}

export function shopPromotionSale(row: { tier: string; place_name: string }): SaleItem {
  const label = SHOP_PROMOTION_TIERS[row.tier as ShopPromotionTier]?.label ?? "Paid";
  return { kind: "shop_promotion", title: `${label} shop promotion`, detail: row.place_name };
}

/** Dollars and cents: a $29.99 tee reads $29.99, not $30. */
export function formatSaleAmount(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const HOUR = 60 * 60 * 1000;

/** Money in over the last day, week and 30 days, refunds left out. */
export function saleTotals(sales: Sale[], now: number): { day: number; week: number; month: number } {
  const totals = { day: 0, week: 0, month: 0 };
  for (const sale of sales) {
    if (sale.refunded) continue;
    const age = now - new Date(sale.createdAt).getTime();
    if (age < 0) continue;
    if (age <= 24 * HOUR) totals.day += sale.amountCents;
    if (age <= 7 * 24 * HOUR) totals.week += sale.amountCents;
    if (age <= 30 * 24 * HOUR) totals.month += sale.amountCents;
  }
  return totals;
}

/** The push an admin gets for a sale. */
export function salePush(item: SaleItem, amountCents: number, username: string | null) {
  const who = username ? `@${username}` : "Someone";
  return {
    title: `New sale · ${formatSaleAmount(amountCents)}`,
    body: `${who} bought ${item.kind === "points" ? item.title : `a ${item.title}`}`,
    url: "/admin/sales",
  };
}
