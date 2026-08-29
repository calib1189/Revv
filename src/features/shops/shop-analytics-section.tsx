"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getShopAnalyticsAction, type ShopAnalyticsResponse } from "@/features/shops/actions";
import { EyeIcon, PersonIcon, PinIcon, CommentIcon, GlobeIcon, GemIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

const METRICS: {
  key: keyof ShopAnalyticsResponse["counts"];
  label: string;
  icon: typeof EyeIcon;
  color: string;
}[] = [
  { key: "impressions", label: "Impressions", icon: EyeIcon, color: "#7dd3fc" },
  { key: "profileVisits", label: "Profile visits", icon: PersonIcon, color: "#a78bfa" },
  { key: "clicks", label: "Directions", icon: PinIcon, color: "#4ade80" },
  { key: "inquiries", label: "Inquiries", icon: CommentIcon, color: "#f0cd6e" },
  { key: "websiteClicks", label: "Website visits", icon: GlobeIcon, color: "#fb923c" },
];

/**
 * Revv Business Analytics — the shop detail page's reporting surface
 * for whoever has actually paid to promote this exact listing at some
 * point (get_shop_analytics_counts enforces that server-side; this
 * component just reflects whatever it's willing to hand back). Renders
 * nothing at all for anyone else, rather than a locked/teaser state —
 * a shop's traffic numbers aren't public data.
 */
export function ShopAnalyticsSection({ placeId }: { placeId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "hidden" }
    | { status: "ready"; data: ShopAnalyticsResponse }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getShopAnalyticsAction(placeId).then((data) => {
      if (cancelled) return;
      setState(data.hasAccess ? { status: "ready", data } : { status: "hidden" });
    });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  if (state.status !== "ready") return null;

  const { counts } = state.data;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
          <GemIcon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold">Revv Business Analytics</h2>
      </div>

      {total === 0 ? (
        <p className="glass rounded-2xl p-4 text-sm text-muted">
          No activity yet — check back once your promotion has had some time in front of people.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {METRICS.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="glass flex flex-col gap-2.5 rounded-2xl p-4">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}26`, color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {formatCompactNumber(counts[key])}
                </p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/discover" className="text-center text-xs text-muted hover:text-foreground">
        See all your promotions
      </Link>
    </section>
  );
}
