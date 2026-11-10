"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function DailyError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState message="Couldn't load Sorza Daily." onRetry={retry} />;
}
