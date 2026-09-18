"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function FriendsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load your friends." onRetry={reset} />;
}