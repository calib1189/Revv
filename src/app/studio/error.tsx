"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function StudioError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load your stats." onRetry={reset} />;
}