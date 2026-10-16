"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleBlockAction } from "@/features/profile/actions";
import { Avatar } from "@/features/feed/avatar";

export function BlockedUserRow({
  userId,
  username,
  displayName,
}: {
  userId: string;
  username: string;
  displayName: string | null;
}) {
  const [unblocked, setUnblocked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUnblock() {
    setUnblocked(true);
    startTransition(async () => {
      try {
        await toggleBlockAction(userId, username, true);
      } catch {
        setUnblocked(false);
      }
    });
  }

  return (
    <li className="flex items-center gap-3.5 px-4 py-3">
      <Link href={`/u/${username}`} className="flex min-w-0 flex-1 items-center gap-3.5">
        <Avatar username={username} avatarUrl={null} className="h-11 w-11 text-base" />
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold">{displayName || `@${username}`}</p>
          {displayName && <p className="truncate text-[0.8125rem] text-muted">@{username}</p>}
        </div>
      </Link>
      {unblocked ? (
        <span className="text-sm text-muted">Unblocked</span>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={handleUnblock}
          className="pressable glass flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Unblock
        </button>
      )}
    </li>
  );
}
