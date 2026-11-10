"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load Crews." onRetry={retry} />;
}