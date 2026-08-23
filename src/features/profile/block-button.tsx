"use client";

import { useState, useTransition } from "react";
import { toggleBlockAction } from "@/features/profile/actions";

export function BlockButton({
  targetUserId,
  targetUsername,
  initialIsBlocking,
}: {
  targetUserId: string;
  targetUsername: string;
  initialIsBlocking: boolean;
}) {
  const [blocking, setBlocking] = useState(initialIsBlocking);
  const [, startTransition] = useTransition();

  function handleClick() {
    const was = blocking;
    setBlocking(!was);
    startTransition(async () => {
      await toggleBlockAction(targetUserId, targetUsername, was);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-muted hover:text-danger"
    >
      {blocking ? "Unblock" : "Block"}
    </button>
  );
}
