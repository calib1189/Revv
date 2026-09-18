"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function VehicleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load this vehicle." onRetry={reset} />;
}