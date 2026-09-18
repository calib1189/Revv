"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function GarageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load your garage." onRetry={reset} />;
}