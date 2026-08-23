"use client";

import { useTransition } from "react";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsReadAction())}
      className="text-sm text-muted hover:text-foreground disabled:opacity-60"
    >
      {isPending ? "Marking…" : "Mark all read"}
    </button>
  );
}
