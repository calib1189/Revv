"use client";

import { useState } from "react";
import Link from "next/link";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { MemberRow, type MemberVehicleChip } from "@/features/crews/member-row";
import { formatDateTime } from "@/lib/format/date";
import type { Crew } from "@/lib/db/crews";
import type { CrewMember, CrewMemberRole } from "@/lib/db/crew-members";
import type { Meetup } from "@/lib/db/meetups";

type Tab = "feed" | "members" | "events" | "about";

export interface CrewTabMember {
  member: CrewMember;
  username: string;
  avatarUrl: string | null;
  vehicles: MemberVehicleChip[];
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Mirrors profile-tabs.tsx exactly: local tab state, every tab's data
 * pre-fetched server-side and passed down as props, no per-tab refetch. */
export function CrewTabs({
  crewId,
  crew,
  posts,
  members,
  events,
  canManageMembers,
  viewerRole,
}: {
  crewId: string;
  crew: Crew;
  posts: PostThumbnail[];
  members: CrewTabMember[];
  events: Meetup[];
  canManageMembers: boolean;
  viewerRole: CrewMemberRole | null;
}) {
  const [tab, setTab] = useState<Tab>("feed");

  return (
    <div className="mt-8">
      <div className="glass mb-4 inline-flex flex-wrap gap-1 rounded-full p-1">
        <TabButton active={tab === "feed"} onClick={() => setTab("feed")}>
          Feed ({posts.length})
        </TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          Members ({members.length})
        </TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          Events ({events.length})
        </TabButton>
        <TabButton active={tab === "about"} onClick={() => setTab("about")}>
          About
        </TabButton>
      </div>

      {tab === "feed" &&
        (posts.length === 0 ? (
          <p className="text-sm text-muted">No posts tagged to this crew yet.</p>
        ) : (
          <PostThumbnailGrid posts={posts} />
        ))}

      {tab === "members" &&
        (members.length === 0 ? (
          <p className="text-sm text-muted">No members yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map(({ member, username, avatarUrl, vehicles }) => (
              <MemberRow
                key={member.id}
                crewId={crewId}
                member={member}
                username={username}
                avatarUrl={avatarUrl}
                vehicles={vehicles}
                canManage={canManageMembers}
                viewerRole={viewerRole}
                isCrewOwner={member.user_id === crew.owner_id}
              />
            ))}
          </div>
        ))}

      {tab === "events" &&
        (events.length === 0 ? (
          <p className="text-sm text-muted">No upcoming events yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/discover/${event.id}`}
                className="glass block rounded-2xl p-4 transition-colors hover:brightness-110"
              >
                <p className="font-medium">{event.title}</p>
                <p className="mt-0.5 text-sm text-muted">{formatDateTime(event.starts_at)}</p>
                <p className="mt-0.5 truncate text-sm text-muted">{event.location_name}</p>
              </Link>
            ))}
          </div>
        ))}

      {tab === "about" && (
        <div className="glass flex flex-col gap-3 rounded-2xl p-4 text-sm">
          {crew.description ? (
            <p className="whitespace-pre-wrap leading-relaxed">{crew.description}</p>
          ) : (
            <p className="text-muted">No description yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
