"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load the Store." onRetry={reset} />;
}