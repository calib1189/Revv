"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function DailyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState message="Couldn't load Sorza Daily." onRetry={reset} />;
}
