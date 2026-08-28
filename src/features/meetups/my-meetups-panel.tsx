"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloseIcon, EyeIcon, GemIcon } from "@/components/ui/icons";
import { getMyMeetupsAction, type MeetupWithViewCount } from "@/features/meetups/actions";
import { MEETUP_TIERS, type MeetupTier } from "@/lib/db/meetups";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { formatDateTime } from "@/lib/format/date";

const TIER_METAL_COLORS: Record<MeetupTier, string> = {
  standard: RANK_TEXT_COLORS.silver,
  promoted: RANK_TEXT_COLORS.gold,
  diamond: RANK_TEXT_COLORS.diamond,
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  active: "Live",
};

function MeetupRow({ item }: { item: MeetupWithViewCount }) {
  const { meetup, viewCount } = item;
  const color = TIER_METAL_COLORS[meetup.tier];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{meetup.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {STATUS_LABELS[meetup.status] ?? meetup.status} · {formatDateTime(meetup.starts_at)}
          </p>
        </div>
        <span
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${color}26`, color }}
        >
          <GemIcon className="h-2.5 w-2.5" />
          {MEETUP_TIERS[meetup.tier].label}
        </span>
      </div>

      {meetup.status === "active" && (
        <div className="flex items-center gap-4 border-t border-border pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-foreground">
            <EyeIcon className="h-4 w-4 text-muted" />
            <span className="font-medium">{formatCompactNumber(viewCount)}</span>
            <span className="text-xs text-muted">views</span>
          </span>
          <Link href={`/discover/${meetup.id}`} className="ml-auto text-xs text-accent hover:underline">
            View listing
          </Link>
        </div>
      )}
    </div>
  );
}

/** "My meetups" — a host's own performance dashboard, so paying for
 * Gold/Diamond isn't a black box. Modal panel matching MyPromotionsPanel's
 * shape (features/shops/my-promotions-panel.tsx). */
export function MyMeetupsPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "requires-auth" }
    | { status: "ready"; meetups: MeetupWithViewCount[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getMyMeetupsAction().then((response) => {
      if (cancelled) return;
      setState(
        response.requiresAuth
          ? { status: "requires-auth" }
          : { status: "ready", meetups: response.meetups },
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
          <h2 className="text-base font-semibold">My meetups</h2>
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
              <p className="text-sm text-muted">Log in to see how your meetups are performing.</p>
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                Log in
              </Link>
            </div>
          )}

          {state.status === "ready" && state.meetups.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">You haven&apos;t posted a meetup yet.</p>
          )}

          {state.status === "ready" && state.meetups.length > 0 && (
            <div className="flex flex-col gap-3">
              {state.meetups.map((item) => (
                <MeetupRow key={item.meetup.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
