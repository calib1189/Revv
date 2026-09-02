"use client";

import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";

export default function AdminUsersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <Callout tone="danger">Couldn&apos;t load users.</Callout>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
