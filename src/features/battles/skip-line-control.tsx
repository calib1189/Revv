"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { skipBattleLineAction } from "@/features/battles/actions";
import { SKIP_LINE, type SkipLineState } from "@/lib/battles/skip-line";

const dateFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

/** The owner's "skip the line" on their car page: pay points so the car
 * leads the next battle. Asks first, with the balance, because it's
 * spending real points. */
export function SkipLineControl({ vehicleId, state }: { vehicleId: string; state: SkipLineState }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (state.kind === "ineligible") return null;
  if (state.kind === "queued") {
    return (
      <p className="text-[0.875rem] text-muted" suppressHydrationWarning>
        <span className="font-semibold text-foreground">In line for the next battle.</span> If it hasn&apos;t happened by{" "}
        {dateFormat.format(new Date(state.refundsAt))}, your {SKIP_LINE.price} points come back.
      </p>
    );
  }
  if (state.kind === "cooldown") {
    return (
      <p className="text-[0.875rem] text-muted" suppressHydrationWarning>
        You can skip the line again on {dateFormat.format(new Date(state.availableAt))}.
      </p>
    );
  }

  function buy() {
    setError(null);
    startTransition(async () => {
      const result = await skipBattleLineAction(vehicleId);
      if (result.error) setError(result.error);
      else {
        setConfirming(false);
        router.refresh();
      }
    });
  }

  if (!confirming) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.875rem] text-muted">Put your car in the next battle.</p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="pressable h-10 flex-shrink-0 rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-white"
        >
          Skip the line · <span className="numeral">{SKIP_LINE.price}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state.canAfford ? (
        <p className="text-[0.875rem]">
          Spend <span className="numeral font-semibold">{SKIP_LINE.price}</span> of your{" "}
          <span className="numeral font-semibold">{state.balance.toLocaleString("en-US")}</span> points? Your car leads the
          next battle against the closest score. Not used within {SKIP_LINE.expiresDays} days, the points come back.
        </p>
      ) : (
        <p className="text-[0.875rem]">
          It&apos;s <span className="numeral font-semibold">{SKIP_LINE.price}</span> points and you have{" "}
          <span className="numeral font-semibold">{state.balance.toLocaleString("en-US")}</span>.
        </p>
      )}
      {error && (
        <p className="text-[0.875rem] text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {state.canAfford ? (
          <button
            type="button"
            onClick={buy}
            disabled={isPending}
            className="pressable h-10 rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Skipping…" : `Spend ${SKIP_LINE.price} points`}
          </button>
        ) : (
          <Link href="/store" className="pressable flex h-10 items-center rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-white">
            Get points
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={isPending}
          className="h-10 rounded-full px-3 text-[0.875rem] text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
