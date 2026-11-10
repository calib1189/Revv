"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function PostError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load this post." onRetry={retry} />;
}