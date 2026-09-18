"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function SavedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load your saved posts." onRetry={reset} />;
}