"use client";

import { useState } from "react";
import Link from "next/link";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { MemberRow } from "@/features/crews/member-row";
import { CrewCarsGrid, type CrewCarItem } from "@/features/crews/crew-cars-grid";
import { formatDateTime } from "@/lib/format/date";
import {
  WheelIcon,
  GridIcon,
  UsersIcon,
  TimerIcon,
  InfoIcon,
  PinIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import type { Crew } from "@/lib/db/crews";
import type { CrewMember, CrewMemberRole } from "@/lib/db/crew-members";
import type { Meetup } from "@/lib/db/meetups";

type Tab = "cars" | "feed" | "members" | "events" | "about";

export interface CrewTabMember {
  member: CrewMember;
  username: string;
  avatarUrl: string | null;
  bestScore: number | null;
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/** A small empty-state panel shared by every tab below — an icon in a
 * tinted circle plus a line of copy, the same shape as the discover
 * page's "no crews yet" state, instead of each tab falling back to a
 * bare line of muted text. */
function EmptyPanel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
        {icon}
      </span>
      <p className="max-w-[16rem] text-sm text-muted">{text}</p>
    </div>
  );
}

/** Mirrors profile-tabs.tsx exactly: local tab state, every tab's data
 * pre-fetched server-side and passed down as props, no per-tab refetch. */
export function CrewTabs({
  crewId,
  crew,
  cars,
  posts,
  members,
  events,
  canManageMembers,
  viewerRole,
}: {
  crewId: string;
  crew: Crew;
  cars: CrewCarItem[];
  posts: PostThumbnail[];
  members: CrewTabMember[];
  events: Meetup[];
  canManageMembers: boolean;
  viewerRole: CrewMemberRole | null;
}) {
  const [tab, setTab] = useState<Tab>("cars");

  return (
    <div className="mt-8">
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-0.5">
        <TabButton active={tab === "cars"} onClick={() => setTab("cars")} icon={<WheelIcon className="h-4 w-4" />}>
          Cars · {cars.length}
        </TabButton>
        <TabButton active={tab === "feed"} onClick={() => setTab("feed")} icon={<GridIcon className="h-4 w-4" />}>
          Feed · {posts.length}
        </TabButton>
        <TabButton
          active={tab === "members"}
          onClick={() => setTab("members")}
          icon={<UsersIcon className="h-4 w-4" />}
        >
          Members · {members.length}
        </TabButton>
        <TabButton
          active={tab === "events"}
          onClick={() => setTab("events")}
          icon={<TimerIcon className="h-4 w-4" />}
        >
          Events · {events.length}
        </TabButton>
        <TabButton active={tab === "about"} onClick={() => setTab("about")} icon={<InfoIcon className="h-4 w-4" />}>
          About
        </TabButton>
      </div>

      {tab === "cars" &&
        (cars.length === 0 ? (
          <EmptyPanel
            icon={<WheelIcon className="h-5 w-5" />}
            text="No cars in this crew's garages yet — cars its members tag to their profile will show up here."
          />
        ) : (
          <CrewCarsGrid cars={cars} />
        ))}

      {tab === "feed" &&
        (posts.length === 0 ? (
          <EmptyPanel
            icon={<GridIcon className="h-5 w-5" />}
            text="No posts tagged to this crew yet — post from the feed and tag this crew to share it here."
          />
        ) : (
          <PostThumbnailGrid posts={posts} />
        ))}

      {tab === "members" &&
        (members.length === 0 ? (
          <EmptyPanel icon={<UsersIcon className="h-5 w-5" />} text="No members yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {members.map(({ member, username, avatarUrl, bestScore }) => (
              <MemberRow
                key={member.id}
                crewId={crewId}
                member={member}
                username={username}
                avatarUrl={avatarUrl}
                bestScore={bestScore}
                canManage={canManageMembers}
                viewerRole={viewerRole}
                isCrewOwner={member.user_id === crew.owner_id}
              />
            ))}
          </div>
        ))}

      {tab === "events" &&
        (events.length === 0 ? (
          <EmptyPanel
            icon={<TimerIcon className="h-5 w-5" />}
            text="No upcoming events yet — attach a meetup to this crew when you create one."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/discover/${event.id}`}
                className="glass group flex items-center gap-3 rounded-2xl p-4 transition-colors hover:brightness-110"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <TimerIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{formatDateTime(event.starts_at)}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
                    <PinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    {event.location_name}
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ))}

      {tab === "about" && (
        <div className="glass flex flex-col gap-4 rounded-2xl p-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Description</h3>
            {crew.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{crew.description}</p>
            ) : (
              <p className="text-sm text-muted">No description yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
