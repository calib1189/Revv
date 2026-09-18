"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/icons";
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
    return (
      <EmptyState
        card
        icon={<UsersIcon />}
        title="All caught up"
        body="New requests to join this crew show up here."
      />
    );
  }

  return (
    <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-[4.5rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
      {visible.map(({ member, username, avatarUrl }) => (
        <div key={member.id} className="relative flex items-center gap-3 px-4 py-3">
          <Link href={`/u/${username}`} className="flex-shrink-0">
            <Avatar username={username} avatarUrl={avatarUrl} className="h-11 w-11 text-sm" />
          </Link>
          <Link href={`/u/${username}`} className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">
            {username}
          </Link>
          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="primary"
              className="h-8 px-3.5 py-0 text-[0.8125rem] font-semibold"
              onClick={() => {
                hide(member.id);
                startTransition(() => approveJoinRequestAction(member.id, crewId));
              }}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3.5 py-0 text-[0.8125rem] font-semibold"
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
