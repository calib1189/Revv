"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateBuildRatingAction, confirmBuildRatingAction } from "@/features/garage/rating-actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { BuildRating } from "@/lib/providers/rating-provider";

export function RateBuildPanel({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pending, setPending] = useState<BuildRating | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setPending(null);
    setIsGenerating(true);
    try {
      const result = await generateBuildRatingAction(vehicleId);
      if (result.error) setError(result.error);
      else if (result.data) setPending(result.data);
    } catch {
      setError("Couldn't rate that build. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    setIsConfirming(true);
    setError(null);
    try {
      const result = await confirmBuildRatingAction(vehicleId, pending.score, pending.summary);
      if (result.error) {
        setError(result.error);
      } else {
        setPending(null);
        router.refresh();
      }
    } finally {
      setIsConfirming(false);
    }
  }

  if (pending) {
    return (
      <div className="glass w-full max-w-sm rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold">{pending.score.toFixed(1)}/10</p>
          {pending.isMock && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
              Mock — no real model reviewed this
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{pending.summary}</p>
        {error && (
          <div className="mt-2">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
        <div className="mt-3 flex gap-3">
          <Button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm"
          >
            {isConfirming ? "Saving…" : "Show this rating"}
          </Button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="px-1 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1.5 text-sm"
        disabled={isGenerating}
        onClick={handleGenerate}
      >
        {isGenerating ? "Rating…" : "Rate my build"}
      </Button>
      {error && (
        <div className="mt-2 max-w-sm">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
    </div>
  );
}
