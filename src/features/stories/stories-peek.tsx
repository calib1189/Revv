"use client";

import { Avatar } from "@/features/feed/avatar";
import { useStories } from "@/features/stories/story-viewer-provider";
import type { TrayPerson } from "@/lib/stories/load";

/**
 * Stories on the For You feed: a small pill at the start of the filter
 * row with the faces of up to three people who posted, ringed in red
 * while any of it is new. One tap plays them all, new ones first.
 */
export function StoriesPeek({ tray }: { tray: TrayPerson[] }) {
  const { openStories, caughtUp } = useStories();
  const others = tray.filter((p) => !p.isOwn);
  const people = others.length > 0 ? others : tray;
  if (people.length === 0) return null;

  const fresh = people.filter((p) => p.hasUnseen && !caughtUp.has(p.authorId));
  const faces = (fresh.length > 0 ? fresh : people).slice(0, 3);
  const order = [...fresh, ...people.filter((p) => !fresh.includes(p))].map((p) => p.authorId);

  return (
    <button
      type="button"
      onClick={() => openStories(order, order[0])}
      aria-label={fresh.length > 0 ? `${fresh.length} new ${fresh.length === 1 ? "story" : "stories"}` : "Stories"}
      className="pressable flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full bg-black/30 pl-1 pr-3 text-[0.8125rem] font-semibold text-white backdrop-blur-md"
    >
      <span className="flex">
        {faces.map((p, i) => (
          <span
            key={p.authorId}
            className={`block rounded-full p-[1.5px] ${i > 0 ? "-ml-2" : ""} ${fresh.length > 0 ? "bg-accent" : "bg-white/40"}`}
            style={{ zIndex: faces.length - i }}
          >
            <Avatar username={p.username} avatarUrl={p.avatarUrl} className="h-[21px] w-[21px] text-[0.5625rem] ring-1 ring-black" />
          </span>
        ))}
      </span>
      {fresh.length > 0 ? <span className="numeral">{fresh.length} new</span> : "Stories"}
    </button>
  );
}
