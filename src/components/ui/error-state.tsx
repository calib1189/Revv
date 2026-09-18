"use client";

import { Button } from "@/components/ui/button";

/** The one route-level error screen: a warning disc, a plain-language
 * title, what failed, and a way to retry. Used by every error.tsx. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/12 text-danger">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M12 8v5" />
          <path d="M12 16.5h.01" />
          <path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </span>
      <h1 className="mt-5 text-[1.375rem] font-bold tracking-[-0.02em]">Something went wrong</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{message} Check your connection and try again.</p>
      <Button onClick={onRetry} className="mt-6 h-11 px-6 text-[0.9375rem] font-semibold">
        Try Again
      </Button>
    </div>
  );
}
