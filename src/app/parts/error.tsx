"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function PartsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load the parts catalog." onRetry={retry} />;
}