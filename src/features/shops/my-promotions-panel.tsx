"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloseIcon, EyeIcon, PointerIcon, GemIcon } from "@/components/ui/icons";
import { getMyShopPromotionsAction, type ShopPromotionWithCounts } from "@/features/shops/actions";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { formatCompactNumber } from "@/lib/format/compact-number";

const TIER_METAL_COLORS: Record<ShopPromotionTier, string> = {
  standard: RANK_TEXT_COLORS.silver,
  featured: RANK_TEXT_COLORS.gold,
  diamond: RANK_TEXT_COLORS.diamond,
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  active: "Live",
};

function daysRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 day left" : `${days} days left`;
}

function PromotionRow({ item }: { item: ShopPromotionWithCounts }) {
  const { promotion, counts } = item;
  const color = TIER_METAL_COLORS[promotion.tier];
  const ctr =
    counts.impressions > 0 ? `${((counts.clicks / counts.impressions) * 100).toFixed(1)}% CTR` : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{promotion.place_name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {STATUS_LABELS[promotion.status] ?? promotion.status}
            {promotion.status === "active" && promotion.ends_at && ` · ${daysRemaining(promotion.ends_at)}`}
          </p>
        </div>
        <span
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${color}26`, color }}
        >
          <GemIcon className="h-2.5 w-2.5" />
          {SHOP_PROMOTION_TIERS[promotion.tier].label}
        </span>
      </div>

      {promotion.status === "active" && (
        <div className="flex items-center gap-4 border-t border-border pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-foreground">
            <EyeIcon className="h-4 w-4 text-muted" />
            <span className="font-medium">{formatCompactNumber(counts.impressions)}</span>
            <span className="text-xs text-muted">views</span>
          </span>
          <span className="flex items-center gap-1.5 text-foreground">
            <PointerIcon className="h-4 w-4 text-muted" />
            <span className="font-medium">{formatCompactNumber(counts.clicks)}</span>
            <span className="text-xs text-muted">taps</span>
          </span>
          {ctr && <span className="ml-auto text-xs text-muted">{ctr}</span>}
        </div>
      )}
    </div>
  );
}

/** "My promotions" — a promoter's own performance dashboard, so paying
 * for Silver/Gold/Diamond isn't a black box. Modal panel rather than a
 * dedicated route, matching PromoteShopPanel's shape since both live off
 * the same "Shops near you" header. */
export function MyPromotionsPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "requires-auth" }
    | { status: "ready"; promotions: ShopPromotionWithCounts[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getMyShopPromotionsAction().then((response) => {
      if (cancelled) return;
      setState(
        response.requiresAuth
          ? { status: "requires-auth" }
          : { status: "ready", promotions: response.promotions },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="glass-raised flex w-full flex-1 flex-col overflow-hidden sm:max-h-[70vh] sm:max-w-lg sm:flex-none sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
          <h2 className="text-base font-semibold">My promotions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

          {state.status === "requires-auth" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted">Log in to see how your promotions are performing.</p>
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                Log in
              </Link>
            </div>
          )}

          {state.status === "ready" && state.promotions.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              You haven&apos;t promoted a shop yet.
            </p>
          )}

          {state.status === "ready" && state.promotions.length > 0 && (
            <div className="flex flex-col gap-3">
              {state.promotions.map((item) => (
                <PromotionRow key={item.promotion.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
