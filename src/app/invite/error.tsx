"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function InviteError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState message="Couldn't load your invites." onRetry={retry} />;
}
