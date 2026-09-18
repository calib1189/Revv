"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function FeedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load the feed." onRetry={reset} />;
}