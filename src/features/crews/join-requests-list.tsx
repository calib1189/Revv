"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { Button } from "@/components/ui/button";
import { approveJoinRequestAction, rejectJoinRequestAction } from "@/features/crews/actions";
import type { CrewMember } from "@/lib/db/crew-members";

export interface PendingRequestItem {
  member: CrewMember;
  username: string;
  avatarUrl: string | null;
}

export function JoinRequestsList({ crewId, requests }: { crewId: string; requests: PendingRequestItem[] }) {
  const [visibleIds, setVisibleIds] = useState(new Set(requests.map((r) => r.member.id)));
  const [, startTransition] = useTransition();

  function hide(id: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const visible = requests.filter((r) => visibleIds.has(r.member.id));

  if (visible.length === 0) {
    return <p className="text-sm text-muted">No pending requests.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map(({ member, username, avatarUrl }) => (
        <div key={member.id} className="glass flex items-center gap-3 rounded-2xl p-4">
          <Link href={`/u/${username}`}>
            <Avatar username={username} avatarUrl={avatarUrl} className="h-10 w-10 text-sm" />
          </Link>
          <Link href={`/u/${username}`} className="flex-1 truncate text-sm font-medium hover:underline">
            @{username}
          </Link>
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="px-3 py-1.5 text-sm"
              onClick={() => {
                hide(member.id);
                startTransition(() => approveJoinRequestAction(member.id, crewId));
              }}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-sm"
              onClick={() => {
                hide(member.id);
                startTransition(() => rejectJoinRequestAction(member.id, crewId));
              }}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
