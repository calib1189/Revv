"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function StoreError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load the Store." onRetry={retry} />;
}