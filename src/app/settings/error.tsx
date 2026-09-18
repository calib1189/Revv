"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState message="Couldn't load Settings." onRetry={reset} />;
}