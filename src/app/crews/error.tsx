"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load Crews." onRetry={reset} />;
}