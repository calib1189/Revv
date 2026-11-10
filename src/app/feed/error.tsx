"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function FeedError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load the feed." onRetry={retry} />;
}