"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { Button } from "@/components/ui/button";
import { updateMemberRoleAction, removeMemberAction } from "@/features/crews/actions";
import type { CrewMember, CrewMemberRole } from "@/lib/db/crew-members";

const ROLE_LABELS: Record<CrewMemberRole, string> = {
  leader: "Leader",
  admin: "Admin",
  member: "Member",
};

/** One row in the Members tab — identity, role, and management controls.
 * Their actual cars live on the Cars tab now, not duplicated here; this
 * stays a lean roster for leader/admin housekeeping. The avatar still
 * gets the same rank-ring treatment as everywhere else in the app (their
 * best build rating across their whole garage), so "who's actually good"
 * is visible at a glance even in the plain member list. Management
 * controls only render for a leader/admin viewer, and only on rows that
 * aren't the crew's owner — there's no ownership-transfer flow, so the
 * owner's role/membership can't be touched at all. */
export function MemberRow({
  crewId,
  member,
  username,
  avatarUrl,
  bestScore,
  canManage,
  viewerRole,
  isCrewOwner,
}: {
  crewId: string;
  member: CrewMember;
  username: string;
  avatarUrl: string | null;
  bestScore: number | null;
  canManage: boolean;
  viewerRole: CrewMemberRole | null;
  isCrewOwner: boolean;
}) {
  const [role, setRole] = useState(member.role);
  const [removed, setRemoved] = useState(false);
  const [, startTransition] = useTransition();

  if (removed) return null;

  const canChangeRole = canManage && !isCrewOwner && (role !== "leader" || viewerRole === "leader");

  function handleRoleChange(next: CrewMemberRole) {
    const previous = role;
    setRole(next);
    startTransition(async () => {
      try {
        await updateMemberRoleAction(member.id, crewId, next, previous);
      } catch {
        setRole(previous);
      }
    });
  }

  function handleRemove() {
    setRemoved(true);
    startTransition(async () => {
      try {
        await removeMemberAction(member.id, crewId, member.user_id);
      } catch {
        setRemoved(false);
      }
    });
  }

  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-4">
      <Link href={`/u/${username}`}>
        <RankFrame score={bestScore} compact hideBadge>
          <Avatar username={username} avatarUrl={avatarUrl} className="h-10 w-10 text-sm" />
        </RankFrame>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${username}`} className="truncate text-sm font-medium hover:underline">
          @{username}
        </Link>
        <p className="text-xs text-muted">{ROLE_LABELS[role]}</p>
      </div>

      {canManage && !isCrewOwner && (
        <div className="flex items-center gap-2">
          {canChangeRole ? (
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as CrewMemberRole)}
              className="glass-inset rounded-lg px-2 py-1 text-xs text-foreground focus:border-accent/60 focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {viewerRole === "leader" && <option value="leader">Leader</option>}
            </select>
          ) : null}
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={handleRemove}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
