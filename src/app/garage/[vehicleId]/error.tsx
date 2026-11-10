"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function VehicleError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load this vehicle." onRetry={retry} />;
}