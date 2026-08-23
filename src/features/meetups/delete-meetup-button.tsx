"use client";

import { useState, useTransition } from "react";
import { deleteMeetupAction } from "@/features/meetups/actions";

export function DeleteMeetupButton({
  meetupId,
  onDeleted,
}: {
  meetupId: string;
  onDeleted: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isConfirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-danger">Delete this meetup?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteMeetupAction(meetupId);
              onDeleted();
            })
          }
          className="font-medium text-danger underline underline-offset-2 disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          className="text-muted underline underline-offset-2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="text-xs text-danger hover:underline"
    >
      Delete
    </button>
  );
}
