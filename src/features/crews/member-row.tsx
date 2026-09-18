"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { rankForScore, tierColorVar } from "@/lib/rating/rank";
import { updateMemberRoleAction, removeMemberAction } from "@/features/crews/actions";
import type { CrewMember, CrewMemberRole } from "@/lib/db/crew-members";

const ROLE_LABELS: Record<CrewMemberRole, string> = {
  leader: "Leader",
  admin: "Admin",
  member: "Member",
};

/** Only Leader and Admin get a colored pill — Member is the common case,
 * and giving every row a badge would just be noise. Leader uses the
 * brand accent (the one role that actually controls the crew); Admin
 * gets a quieter neutral pill one step up from plain text. */
function RoleBadge({ role }: { role: CrewMemberRole }) {
  if (role === "member") {
    return <p className="text-[0.8125rem] text-muted">Member</p>;
  }
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
        role === "leader" ? "bg-accent/15 text-accent" : "bg-foreground/10 text-foreground"
      }`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

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

  // A row of the Members grouped list (crew-tabs.tsx draws the card and
  // hairlines).
  return (
    <div className="relative flex items-center gap-3 px-4 py-2.5">
      <Link href={`/u/${username}`} className="flex-shrink-0">
        {bestScore != null ? (
          <ProgressRing
            value={bestScore / 100}
            size={48}
            stroke={3}
            color={tierColorVar(rankForScore(bestScore))}
          >
            <Avatar username={username} avatarUrl={avatarUrl} className="h-10 w-10 text-sm" />
          </ProgressRing>
        ) : (
          <span className="flex h-12 w-12 items-center justify-center">
            <Avatar username={username} avatarUrl={avatarUrl} className="h-10 w-10 text-sm" />
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${username}`} className="block truncate text-[0.9375rem] font-semibold">
          {username}
        </Link>
        <div className="mt-0.5">
          <RoleBadge role={role} />
        </div>
      </div>

      {canManage && !isCrewOwner && (
        <div className="flex flex-shrink-0 items-center gap-2">
          {canChangeRole ? (
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as CrewMemberRole)}
              aria-label={`Role for ${username}`}
              className="glass-inset rounded-[10px] px-2 py-1 text-foreground focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {viewerRole === "leader" && <option value="leader">Leader</option>}
            </select>
          ) : null}
          <button
            type="button"
            className="px-1.5 py-1 text-[0.8125rem] font-medium text-danger"
            onClick={handleRemove}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
