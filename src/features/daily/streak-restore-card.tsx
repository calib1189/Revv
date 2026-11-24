"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { restoreStreakAction } from "@/features/daily/streak-repair-actions";
import { FlameIcon, GemIcon } from "@/components/ui/icons";
import type { RepairOffer } from "@/lib/streak/repair";

/** "Your 12-day streak ended": restore it for points while you still
 * can (a few days after losing it). Short of points, it sends you to get
 * some. */
export function StreakRestoreCard({ offer, balance }: { offer: RepairOffer; balance: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<number | null>(null);
  const router = useRouter();
  const short = balance < offer.cost;
  const missed = offer.missingDays.length;

  function restore() {
    setError(null);
    startTransition(async () => {
      const result = await restoreStreakAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setRestored(result.restoredTo ?? offer.restoredTo);
      router.refresh();
    });
  }

  if (restored !== null) {
    return (
      <div className="animate-rise-in flex items-center gap-3 rounded-[18px] bg-accent/12 p-3.5">
        <FlameIcon className="streak-relight h-9 w-9 flex-shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold">Streak restored: {restored} days</p>
          <p className="text-[0.8125rem] text-muted">Play today to keep it going.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-foreground/[0.05] p-3.5 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]">
          <FlameIcon className="h-6 w-6 text-muted" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold">Your {offer.lostRun}-day streak ended</p>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">
            You missed {missed === 1 ? "a day" : `${missed} days`}. Restore it to pick up where you left off, before
            it&apos;s gone for good.
          </p>
        </div>
      </div>
      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
      {short ? (
        <div className="flex items-center gap-3">
          <p className="numeral min-w-0 flex-1 text-[0.8125rem] text-muted">
            Takes {offer.cost} points. You have {balance}.
          </p>
          <Link
            href="/store"
            className="pressable flex h-10 flex-shrink-0 items-center rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-white"
          >
            Get points
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={restore}
          disabled={pending}
          className="pressable flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-accent text-[0.9375rem] font-semibold text-white disabled:opacity-60"
        >
          {pending ? (
            "Restoring…"
          ) : (
            <>
              Restore my streak for <GemIcon className="h-3.5 w-3.5" />
              <span className="numeral">{offer.cost}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
