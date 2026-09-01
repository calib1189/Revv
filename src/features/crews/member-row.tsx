"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { Button } from "@/components/ui/button";
import { updateMemberRoleAction, removeMemberAction } from "@/features/crews/actions";
import type { CrewMember, CrewMemberRole } from "@/lib/db/crew-members";

const ROLE_LABELS: Record<CrewMemberRole, string> = {
  leader: "Leader",
  admin: "Admin",
  member: "Member",
};

export interface MemberVehicleChip {
  id: string;
  title: string;
  heroUrl: string | null;
}

/** One row in the Members tab — the member's identity, role, and their
 * own vehicles (small chips, not full VehicleCard tiles, since a member
 * list needs to stay scannable even when everyone has several cars).
 * Management controls (role change, remove) only render for a
 * leader/admin viewer, and only on rows that aren't the crew's owner —
 * there's no ownership-transfer flow, so the owner's role/membership
 * can't be touched at all. */
export function MemberRow({
  crewId,
  member,
  username,
  avatarUrl,
  vehicles,
  canManage,
  viewerRole,
  isCrewOwner,
}: {
  crewId: string;
  member: CrewMember;
  username: string;
  avatarUrl: string | null;
  vehicles: MemberVehicleChip[];
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
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Link href={`/u/${username}`}>
          <Avatar username={username} avatarUrl={avatarUrl} className="h-10 w-10 text-sm" />
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

      {vehicles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/garage/${vehicle.id}`}
              className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface"
            >
              {vehicle.heroUrl ? (
                <Image src={vehicle.heroUrl} alt={vehicle.title} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted">
                  {vehicle.title}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
