"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POINT_PACKS, formatUsd, type PointPack } from "@/lib/points/packs";
import {
  appStorePrices,
  buyWithApple,
  finishAppleTransaction,
  storeEnvironment,
  unfinishedAppleTransactions,
  type StoreEnvironment,
} from "@/lib/native/points-store";
import { confirmApplePurchaseAction, startPointsCheckoutAction } from "@/features/store/points-actions";
import { GemIcon } from "@/components/ui/icons";

/**
 * "Get points": points packs for real money. Stripe on the web, Apple's
 * in-app purchase in the iPhone app (Apple requires it there for points).
 * Points only buy cosmetics, all of which can also be earned for free.
 */
export function PointsPacks({ userId }: { userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [env, setEnv] = useState<StoreEnvironment | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    params.get("points") === "added" ? { tone: "ok", text: "Thanks! Your points are on the way and show up in a moment." } : null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await storeEnvironment();
      if (cancelled) return;
      setEnv(found);
      if (found !== "app") return;
      appStorePrices(POINT_PACKS.map((p) => p.appleProductId))
        .then((p) => !cancelled && setPrices(p))
        .catch(() => undefined);
      // A purchase Apple completed but SORZA never confirmed (the app
      // closed mid-way, no signal): add those points now.
      const pending = await unfinishedAppleTransactions().catch(() => [] as string[]);
      for (const id of pending) {
        const result = await confirmApplePurchaseAction(id);
        if (result.ok) await finishAppleTransaction(id);
      }
      if (pending.length && !cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function buy(pack: PointPack) {
    setMessage(null);
    setBusy(pack.id);
    try {
      if (env === "app") {
        const result = await buyWithApple(pack.appleProductId, userId);
        if (result.status === "pending") {
          setMessage({ tone: "ok", text: "Your purchase is waiting for approval. The points arrive once it goes through." });
          return;
        }
        if (result.status !== "purchased" || !result.transactionId) return;
        const confirmed = await confirmApplePurchaseAction(result.transactionId);
        if (!confirmed.ok) {
          setMessage({ tone: "error", text: confirmed.error });
          return;
        }
        await finishAppleTransaction(result.transactionId);
        setMessage({ tone: "ok", text: `${confirmed.points.toLocaleString()} points added.` });
        startTransition(() => router.refresh());
      } else {
        const result = await startPointsCheckoutAction(pack.id);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.error });
          return;
        }
        window.location.assign(result.url);
      }
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "That didn't go through. Try again." });
    } finally {
      setBusy(null);
    }
  }

  if (env === null) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">Get points</h2>
        <p className="text-[0.75rem] text-muted">Everything can also be earned free</p>
      </div>
      {env === "old-app" ? (
        <p className="glass-raised elev-1 rounded-[20px] px-4 py-4 text-[0.875rem] leading-relaxed text-muted">
          Update SORZA from the App Store to buy points in the app.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {POINT_PACKS.map((pack) => {
            const price = env === "app" ? prices[pack.appleProductId] : formatUsd(pack.priceCents);
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  disabled={busy !== null || !price}
                  onClick={() => void buy(pack)}
                  className="pressable glass-raised elev-1 relative flex w-full flex-col items-start gap-2 rounded-[20px] p-4 text-left disabled:opacity-60"
                >
                  {pack.bonus && (
                    <span className="absolute right-3 top-3 rounded-full bg-accent/15 px-2 py-0.5 text-[0.6875rem] font-bold text-accent">
                      {pack.bonus}
                    </span>
                  )}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/12 text-accent">
                    <GemIcon className="h-4 w-4" />
                  </span>
                  <span className="numeral text-[1.5rem] font-bold leading-none">{pack.points.toLocaleString()}</span>
                  <span className="text-[0.75rem] text-muted">points</span>
                  <span className="mt-1 w-full rounded-full bg-foreground/[0.08] py-2 text-center text-[0.875rem] font-semibold">
                    {busy === pack.id ? "…" : (price ?? "…")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {message && (
        <p role="status" className={`mt-3 px-1 text-[0.8125rem] ${message.tone === "error" ? "text-danger" : "text-accent"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
