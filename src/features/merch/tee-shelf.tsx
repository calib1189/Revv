"use client";

import { useState } from "react";
import Image from "next/image";
import { Sheet } from "@/components/ui/sheet";
import { startTeeOrderAction } from "@/features/merch/actions";
import { TEE_DESIGNS, TEE_FROM_CENTS, TEE_SIZES, teePhotos, teePriceCents, type TeeDesign, type TeeSize } from "@/lib/merch/products";
import { formatUsd } from "@/lib/points/packs";

const COLOR_LABEL: Record<TeeDesign["color"], string> = { Black: "Black", White: "White", "Dark Heather": "Dark heather grey" };

/** The store's SORZA tees: open to everyone, no car needed. */
export function TeeShelf({ justOrdered = false }: { justOrdered?: boolean }) {
  // Kept after closing so the sheet can animate out.
  const [design, setDesign] = useState<TeeDesign | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3" aria-label="SORZA tees">
      <div className="px-0.5">
        <h2 className="text-[0.9375rem] font-semibold">SORZA tees</h2>
        <p className="text-[0.75rem] text-muted">Heavy cotton · Free US shipping</p>
      </div>

      {justOrdered && (
        <p className="rounded-[14px] bg-foreground/[0.05] px-3.5 py-2.5 text-[0.8125rem] leading-snug" role="status">
          Order placed. Your shirt is printed to order and you&apos;ll get an email when it ships.
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        {TEE_DESIGNS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDesign(d);
              setOpen(true);
            }}
            className="pressable flex min-w-0 flex-col text-left"
            aria-label={`${d.name} tee, from ${formatUsd(TEE_FROM_CENTS)}`}
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-[16px] bg-[#eeede9] ring-1 ring-white/[0.06]">
              <Image src={teePhotos(d.id).back} alt="" fill sizes="(min-width: 640px) 240px, 50vw" className="object-cover" />
            </span>
            <span className="mt-2 block truncate px-0.5 text-[0.875rem] font-medium">{d.name}</span>
            <span className="flex w-full items-baseline justify-between gap-2 px-0.5 text-[0.75rem] text-muted">
              <span className="min-w-0 truncate">{COLOR_LABEL[d.color]}</span>
              <span className="numeral flex-shrink-0 text-[0.8125rem]">{formatUsd(TEE_FROM_CENTS)}</span>
            </span>
          </button>
        ))}
      </div>

      {design && <TeeSheet key={design.id} design={design} open={open} onClose={() => setOpen(false)} />}
    </section>
  );
}

function TeeSheet({ design, open, onClose }: { design: TeeDesign; open: boolean; onClose: () => void }) {
  const [side, setSide] = useState<"back" | "front">("back");
  const [size, setSize] = useState<TeeSize | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = teePhotos(design.id);

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
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-[#eeede9]">
            {(["back", "front"] as const).map((s) => (
              <Image
                key={s}
                src={photos[s]}
                alt={`${design.name} tee, ${s}`}
                fill
                sizes="(min-width: 640px) 480px, 100vw"
                className={`object-cover transition-opacity duration-300 ${side === s ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-2" role="radiogroup" aria-label="Side">
            {(["back", "front"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={side === s}
                onClick={() => setSide(s)}
                className={`pressable rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold capitalize transition-colors ${
                  side === s ? "bg-foreground text-background" : "bg-foreground/[0.06] text-foreground/75"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[0.9375rem] font-semibold">{COLOR_LABEL[design.color]} · Gildan 5000 heavy cotton</p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{design.detail}.</p>
        </div>

        <div>
          <p className="mb-2 text-[0.8125rem] font-medium text-muted">Size</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Size">
            {TEE_SIZES.map((s) => {
              const selected = s === size;
              const extra = teePriceCents(s) - TEE_FROM_CENTS;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSize(s)}
                  className={`pressable flex h-12 flex-col items-center justify-center rounded-[14px] ring-1 transition-colors ${
                    selected ? "bg-foreground/[0.07] ring-2 ring-accent" : "bg-foreground/[0.03] ring-border"
                  }`}
                >
                  <span className="text-[0.9375rem] font-semibold">{s}</span>
                  {extra > 0 && <span className="numeral text-[0.6875rem] leading-none text-muted">+{formatUsd(extra)}</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[0.75rem] text-muted">Classic fit. Size up for a looser fit.</p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void order()}
            disabled={busy || !size}
            className="pressable h-12 w-full rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Opening checkout…" : size ? `Order · ${formatUsd(teePriceCents(size))}` : "Pick a size"}
          </button>
          <p className="mt-2 text-center text-[0.75rem] text-muted">Printed to order · Free US shipping</p>
          {error && <p className="mt-2 text-center text-[0.8125rem] text-danger">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
