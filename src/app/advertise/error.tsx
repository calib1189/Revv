"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdvertiseError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load Advertise on SORZA." onRetry={reset} />;
}