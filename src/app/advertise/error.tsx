"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdvertiseError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load Advertise on SORZA." onRetry={retry} />;
}