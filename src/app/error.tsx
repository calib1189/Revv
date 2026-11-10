"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="This page couldn't load." onRetry={retry} />;
}