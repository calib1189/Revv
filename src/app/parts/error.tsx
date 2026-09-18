"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function PartsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load the parts catalog." onRetry={reset} />;
}