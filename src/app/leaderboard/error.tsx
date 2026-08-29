"use client";

import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";

export default function LeaderboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[calc(100dvh-56px-64px)] flex-col items-center justify-center gap-4 px-6 text-center">
      <Callout tone="danger">Couldn&apos;t load the leaderboard.</Callout>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
