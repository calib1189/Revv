"use client";

import { useState } from "react";
import Link from "next/link";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { MemberRow } from "@/features/crews/member-row";
import { CrewCarsGrid, type CrewCarItem } from "@/features/crews/crew-cars-grid";
import { formatDateTime } from "@/lib/format/date";
import { WheelIcon, GridIcon, UsersIcon, TimerIcon, PinIcon, ChevronRightIcon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
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

function EmptyPanel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <EmptyState card icon={icon} title="Nothing here yet" body={text} />;
}

/** Mirrors profile-tabs.tsx exactly: local tab state, every tab's data
 * pre-fetched server-side and passed down as props, no per-tab refetch.
 * Crew cosmetics (name color/banner/badge frame) are bought and equipped
 * from the central Store (/store)'s Crew tab now, not from here — this
 * only ever displays whatever's currently equipped, in the page header. */
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
      <SegmentedControl
        className="mb-5"
        options={[
          { value: "cars", label: "Cars" },
          { value: "feed", label: "Feed" },
          { value: "members", label: "Members" },
          { value: "events", label: "Events" },
          { value: "about", label: "About" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div key={tab} className="animate-tab-content-in">

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
          <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-[4.75rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
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
          <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
            {events.map((event, i) => {
              const start = new Date(event.starts_at);
              return (
                <li key={event.id} className="relative">
                  {i > 0 && <span className="absolute left-[4.75rem] right-0 top-0 h-px bg-border" />}
                  <Link
                    href={`/discover/${event.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-foreground/[0.06]"
                  >
                    <span className="flex w-11 flex-shrink-0 flex-col items-center overflow-hidden rounded-[10px] bg-white text-center" suppressHydrationWarning>
                      <span className="w-full bg-accent text-[0.5625rem] font-bold uppercase text-white" suppressHydrationWarning>
                        {start.toLocaleString("en-US", { month: "short" })}
                      </span>
                      <span className="numeral text-[1.0625rem] leading-tight text-neutral-900" suppressHydrationWarning>
                        {start.getDate()}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-semibold">{event.title}</p>
                      <p className="mt-0.5 text-[0.8125rem] text-muted" suppressHydrationWarning>
                        {formatDateTime(event.starts_at)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[0.8125rem] text-muted">
                        <PinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {event.location_name}
                      </p>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "about" && (
        <div className="glass-raised elev-1 rounded-[22px] p-5">
          {crew.description ? (
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{crew.description}</p>
          ) : (
            <p className="text-[0.9375rem] text-muted">No description yet.</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
