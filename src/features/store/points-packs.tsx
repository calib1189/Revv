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
import { Sheet } from "@/components/ui/sheet";
import { GemIcon } from "@/components/ui/icons";

type Message = { tone: "ok" | "error"; text: string };

/**
 * The store's wallet: your points, and (once points packs are switched
 * on) a "Get points" sheet with the packs. Stripe on the web, Apple's
 * in-app purchase in the iPhone app (Apple requires it there for points).
 * Points only buy cosmetics, every one of which can be earned for free.
 */
export function PointsWallet({
  balance,
  userId,
  packsEnabled,
  open,
  onOpenChange,
}: {
  balance: number;
  userId: string;
  packsEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [env, setEnv] = useState<StoreEnvironment | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(
    params.get("points") === "added" ? { tone: "ok", text: "Thanks! Your points show up in a moment." } : null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!packsEnabled) return;
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
        // In the background: telling Apple "done" can be slow, and the
        // points are already in. A repeat is harmless (credited once).
        if (result.ok) void finishAppleTransaction(id).catch(() => undefined);
      }
      if (pending.length && !cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [packsEnabled, router]);

  async function buy(pack: PointPack) {
    setMessage(null);
    setBusy(pack.id);
    try {
      if (env === "app") {
        const result = await buyWithApple(pack.appleProductId, userId);
        if (result.status === "pending") {
          setMessage({ tone: "ok", text: "Waiting for approval. The points arrive once it goes through." });
          onOpenChange(false);
          return;
        }
        if (result.status !== "purchased" || !result.transactionId) return;
        const confirmed = await confirmApplePurchaseAction(result.transactionId);
        if (!confirmed.ok) {
          setMessage({ tone: "error", text: confirmed.error });
          return;
        }
        setMessage({ tone: "ok", text: `+${confirmed.points.toLocaleString()} points added` });
        onOpenChange(false);
        void finishAppleTransaction(result.transactionId).catch(() => undefined);
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

  const canBuy = packsEnabled && env !== null;

  return (
    <>
      <div className="relative overflow-hidden rounded-[24px] bg-[#0c0c0f] p-4 text-white ring-1 ring-white/[0.07]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(255,68,51,0.22),transparent)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="micro-label text-white/50">Your points</p>
            <p className="mt-1 flex items-center gap-2">
              <GemIcon className="h-5 w-5 text-accent" />
              <span className="numeral text-[1.875rem] font-bold leading-none tracking-[-0.02em]">
                {balance.toLocaleString("en-US")}
              </span>
            </p>
          </div>
          {canBuy ? (
            <button
              type="button"
              onClick={() => onOpenChange(true)}
              className="pressable flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-accent-foreground"
            >
              Get points
            </button>
          ) : (
            <p className="max-w-[13ch] text-right text-[0.75rem] leading-snug text-white/55">Earn more from Daily and challenges</p>
          )}
        </div>
        {message && (
          <p
            role="status"
            className={`relative mt-3 rounded-[14px] px-3 py-2 text-[0.875rem] font-semibold ${
              message.tone === "error" ? "bg-danger/15 text-[#ff8a80]" : "bg-accent/15 text-accent"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {canBuy && (
        <Sheet open={open} onClose={() => onOpenChange(false)} title="Get points">
          {env === "old-app" ? (
            <p className="py-2 text-[0.9375rem] leading-relaxed text-muted">Update SORZA from the App Store to buy points in the app.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[0.8125rem] leading-relaxed text-muted">
                Points buy cosmetics. Everything in the store can also be earned free from Daily, achievements and
                challenges.
              </p>
              <ul className="flex flex-col gap-2">
                {POINT_PACKS.map((pack) => {
                  const price = env === "app" ? prices[pack.appleProductId] : formatUsd(pack.priceCents);
                  return (
                    <li key={pack.id}>
                      <button
                        type="button"
                        disabled={busy !== null || !price}
                        onClick={() => void buy(pack)}
                        className="pressable flex w-full items-center gap-3 rounded-[18px] bg-foreground/[0.05] px-4 py-3 text-left ring-1 ring-border disabled:opacity-60"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
                          <GemIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="numeral block text-[1.0625rem] font-bold leading-tight">
                            {pack.points.toLocaleString()} points
                          </span>
                          {pack.bonus && <span className="block text-[0.75rem] font-semibold text-accent">{pack.bonus}</span>}
                        </span>
                        <span className="numeral flex-shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-[0.875rem] font-semibold text-background">
                          {busy === pack.id ? "…" : (price ?? "…")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {message?.tone === "error" && <p className="text-[0.8125rem] text-danger">{message.text}</p>}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
