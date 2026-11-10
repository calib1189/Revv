"use client";

import { useEffect, useState } from "react";
import { catchError, type ErrorInfo } from "next/error";
import { Button } from "@/components/ui/button";

/** When each panel last retried on its own, so a panel that keeps failing
 * shows its Try again button instead of retrying forever. */
const lastAutoRetry = new Map<string, number>();
const AUTO_RETRY_WINDOW_MS = 20_000;

function PanelError({ label, retry }: { label: string; retry: () => void }) {
  // Decided once, when the error first shows.
  const [autoRetrying] = useState(() => Date.now() - (lastAutoRetry.get(label) ?? 0) > AUTO_RETRY_WINDOW_MS);

  useEffect(() => {
    if (!autoRetrying) return;
    lastAutoRetry.set(label, Date.now());
    const id = window.setTimeout(retry, 600);
    return () => window.clearTimeout(id);
  }, [autoRetrying, label, retry]);

  if (autoRetrying) {
    return <div className="flex flex-1 items-center justify-center py-24 text-[0.875rem] text-muted">Loading {label}…</div>;
  }
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-[1.0625rem] font-semibold">Couldn&apos;t load {label}</p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">Check your connection and try again.</p>
      <Button onClick={retry} className="mt-5 h-11 px-6 text-[0.9375rem] font-semibold">
        Try Again
      </Button>
    </div>
  );
}

function PanelFallback({ label }: { label: string }, { retry }: ErrorInfo) {
  return <PanelError label={label} retry={retry} />;
}

/**
 * One tab panel's own error boundary. All four panels (Garage, Feed,
 * Discover, Leaderboard) render in the same request, so before this a
 * failure in any one of them replaced the whole page with that route's
 * error screen, even when the tab on screen was fine. Now only the
 * failing panel is affected: it retries once by itself, then offers
 * Try again (which re-fetches, unlike reset()).
 */
export const PanelErrorBoundary = catchError(PanelFallback);
