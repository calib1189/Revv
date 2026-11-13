"use client";

import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { PlusIcon } from "@/components/ui/icons";
import { useStories } from "@/features/stories/story-viewer-provider";
import type { TrayPerson } from "@/lib/stories/load";

/**
 * The stories row: your own story first (or a "+" to post one), then
 * everyone you follow with a story up, new ones first. Tapping someone
 * plays their stories and carries on through the rest of the row.
 */
export function StoryTray({
  tray,
  me,
}: {
  tray: TrayPerson[];
  me: { id: string; username: string; avatarUrl: string | null };
}) {
  const { openStories, caughtUp } = useStories();
  const own = tray.find((p) => p.isOwn) ?? null;
  const others = tray.filter((p) => !p.isOwn);
  const otherIds = others.map((p) => p.authorId);

  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Stories">
      <div className="flex w-[4.25rem] flex-shrink-0 flex-col items-center gap-1.5">
        <span className="relative">
          {own ? (
            <TrayAvatar person={own} unseen={false} onOpen={() => openStories([me.id], me.id)} />
          ) : (
            <Link href="/stories/new" aria-label="Add to your story" className="pressable block rounded-full p-[3px]">
              <Avatar username={me.username} avatarUrl={me.avatarUrl} className="h-[3.75rem] w-[3.75rem] text-lg" />
            </Link>
          )}
          <Link
            href="/stories/new"
            aria-label="Add to your story"
            className="pressable absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-accent-foreground ring-[2.5px] ring-background"
          >
            <PlusIcon className="h-3.5 w-3.5" strokeWidth={3} />
          </Link>
        </span>
        <span className="w-full truncate text-center text-[0.75rem] text-muted">Your story</span>
      </div>

      {others.map((person) => (
        <div key={person.authorId} className="flex w-[4.25rem] flex-shrink-0 flex-col items-center gap-1.5">
          <TrayAvatar
            person={person}
            unseen={person.hasUnseen && !caughtUp.has(person.authorId)}
            onOpen={() => openStories(otherIds, person.authorId)}
          />
          <span className="w-full truncate text-center text-[0.75rem]">{person.username}</span>
        </div>
      ))}
    </div>
  );
}

function TrayAvatar({ person, unseen, onOpen }: { person: TrayPerson; unseen: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={person.isOwn ? "Your story" : `${person.username}'s story${unseen ? ", new" : ""}`}
      className={`pressable block rounded-full p-[2.5px] transition-colors duration-300 ${unseen ? "bg-accent" : "bg-foreground/20"}`}
    >
      <span className="block rounded-full bg-background p-[2px]">
        <Avatar username={person.username} avatarUrl={person.avatarUrl} className="h-[3.5rem] w-[3.5rem] text-lg" />
      </span>
    </button>
  );
}
