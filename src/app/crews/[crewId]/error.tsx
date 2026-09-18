"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load this crew." onRetry={reset} />;
}