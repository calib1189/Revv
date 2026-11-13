"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { TeeTurntable } from "@/features/shop/tee-turntable";
import { startTeeOrderAction } from "@/features/merch/actions";
import { TEE_FROM_CENTS, TEE_SIZES, teePhotos3d, teePriceCents, type TeeDesign, type TeeSize } from "@/lib/merch/products";
import { formatUsd } from "@/lib/points/packs";

const COLOR: Record<TeeDesign["color"], { label: string; swatch: string }> = {
  Black: { label: "Black", swatch: "#141313" },
  White: { label: "White", swatch: "#fffefa" },
  "Dark Heather": { label: "Dark heather grey", swatch: "#595959" },
};

/** One tee: spin it in 3D, pick a size, order. */
export function TeeSheet({ design, open, onClose }: { design: TeeDesign; open: boolean; onClose: () => void }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [snap, setSnap] = useState<{ side: "front" | "back"; n: number } | null>(null);
  const [size, setSize] = useState<TeeSize | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = teePhotos3d(design.id);
  const color = COLOR[design.color];

  async function order() {
    if (!size) return;
    setBusy(true);
    setError(null);
    const result = await startTeeOrderAction(design.id, size);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <Sheet open={open} onClose={onClose} title={design.name}>
      <div className="flex flex-col gap-5">
        <div className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(70%_60%_at_50%_38%,#5a5a64,#1e1e23_72%)] px-6 pb-5 pt-4">
          <TeeTurntable
            front={photos.front}
            back={photos.back}
            alt={`${design.name} tee`}
            snapTo={snap}
            onSideChange={setSide}
            className="mx-auto w-full max-w-[290px]"
          />
          <div className="mt-3 flex justify-center gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md" role="radiogroup" aria-label="Side">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={side === s}
                onClick={() => setSnap((prev) => ({ side: s, n: (prev?.n ?? 0) + 1 }))}
                className={`pressable rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold capitalize transition-colors ${
                  side === s ? "bg-white text-black" : "text-white/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[1.375rem] font-bold tracking-[-0.02em]">{design.name}</p>
            <p className="numeral flex-shrink-0 text-[1.25rem] font-bold">{formatUsd(size ? teePriceCents(size) : TEE_FROM_CENTS)}</p>
          </div>
          <p className="mt-1 flex items-center gap-2 text-[0.8125rem] text-muted">
            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/30" style={{ background: color.swatch }} />
            {color.label} · Gildan 5000 heavy cotton
          </p>
          <p className="mt-2 text-[0.875rem] leading-snug text-muted">{design.detail}.</p>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[0.8125rem] font-semibold">Size</p>
            <p className="text-[0.75rem] text-muted">Classic fit · size up for a looser fit</p>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Size">
            {TEE_SIZES.map((s) => {
              const selected = s === size;
              const extra = teePriceCents(s) - TEE_FROM_CENTS;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={extra > 0 ? `${s}, ${formatUsd(extra)} more` : s}
                  onClick={() => setSize(s)}
                  className={`pressable flex h-12 flex-col items-center justify-center rounded-[14px] text-[0.875rem] font-semibold ring-1 transition-colors ${
                    selected ? "bg-foreground text-background ring-foreground" : "bg-foreground/[0.04] ring-border"
                  }`}
                >
                  {s}
                  {extra > 0 && <span className={`numeral text-[0.625rem] leading-none ${selected ? "text-background/70" : "text-muted"}`}>+{Math.round(extra / 100)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void order()}
            disabled={busy || !size}
            className="pressable h-[52px] w-full rounded-full bg-accent text-[1rem] font-semibold text-accent-foreground disabled:opacity-55"
          >
            {busy ? "Opening checkout…" : size ? `Buy now · ${formatUsd(teePriceCents(size))}` : "Pick a size"}
          </button>
          <p className="mt-2 text-center text-[0.75rem] text-muted">Printed to order · Free US shipping</p>
          {error && <p className="mt-2 text-center text-[0.8125rem] text-danger">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
