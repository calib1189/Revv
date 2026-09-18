"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function NotificationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load notifications." onRetry={reset} />;
}