"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { TutorialShowcase } from "@/lib/tutorial/showcase";
import { CheckIcon, CommentIcon, HeartIcon, PlusIcon } from "@/components/ui/icons";

type Task = "swipe" | "like" | "follow";
const TASKS: { id: Task; label: string }[] = [
  { id: "swipe", label: "Swipe up" },
  { id: "like", label: "Double-tap to like" },
  { id: "follow", label: "Tap + to follow" },
];

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

/**
 * The feed, in miniature, with real posts. Swipes, likes and follows here
 * are practice only — nothing is written — which the screen says.
 */
export function TutorialFeedDemo({ posts }: { posts: TutorialShowcase["posts"] }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Set<Task>>(new Set());
  const [burst, setBurst] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const start = useRef<{ y: number; t: number } | null>(null);
  const lastTap = useRef(0);
  const lastWheel = useRef(0);

  const mark = (task: Task) => setDone((d) => (d.has(task) ? d : new Set(d).add(task)));
  const go = (delta: number) => {
    const next = Math.max(0, Math.min(posts.length - 1, index + delta));
    if (next !== index) {
      setIndex(next);
      setCommentsOpen(false);
      if (delta > 0) mark("swipe");
    }
  };
  const like = (id: string, viaDoubleTap: boolean) => {
    setLiked((s) => {
      const n = new Set(s);
      if (n.has(id) && !viaDoubleTap) n.delete(id);
      else n.add(id);
      return n;
    });
    if (viaDoubleTap) setBurst((b) => b + 1);
    mark("like");
  };

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    start.current = { y: e.clientY, t: performance.now() };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    // rubber-band at either end
    const atEdge = (dy < 0 && index === posts.length - 1) || (dy > 0 && index === 0);
    setDrag(atEdge ? dy * 0.3 : dy);
  }
  function onPointerUp() {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s) return;
    const dy = drag;
    setDrag(0);
    const fast = Math.abs(dy) / Math.max(1, performance.now() - s.t) > 0.5;
    if (dy < -60 || (fast && dy < -20)) return go(1);
    if (dy > 60 || (fast && dy > 20)) return go(-1);
    // a tap, not a swipe: two in quick succession is a like
    if (Math.abs(dy) < 6) {
      const now = performance.now();
      if (now - lastTap.current < 320) {
        like(posts[index].id, true);
        lastTap.current = 0;
      } else lastTap.current = now;
    }
  }
  function onWheel(e: React.WheelEvent) {
    const now = performance.now();
    if (now - lastWheel.current < 500 || Math.abs(e.deltaY) < 20) return;
    lastWheel.current = now;
    go(e.deltaY > 0 ? 1 : -1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4">
      <div className="flex min-h-[300px] w-full flex-1 justify-center">
      <div
        className="relative aspect-[9/16] h-full max-h-[520px] max-w-full overflow-hidden rounded-[30px] bg-black ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        aria-label="Sample feed — swipe up for the next post, double-tap to like"
        role="group"
      >
        {posts.map((p, i) => {
          if (Math.abs(i - index) > 1) return null;
          const isLiked = liked.has(p.id);
          const isFollowed = followed.has(p.authorUsername);
          return (
            <div
              key={p.id}
              className="absolute inset-0"
              style={{
                transform: `translate3d(0, calc(${(i - index) * 100}% + ${drag}px), 0)`,
                transition: dragging ? "none" : "transform 520ms var(--ease-ios)",
              }}
            >
              {p.kind === "video" ? (
                i === index ? (
                  <video src={p.mediaUrl} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover" />
                ) : null
              ) : (
                <Image src={p.mediaUrl} alt="" fill unoptimized sizes="300px" className="object-cover" draggable={false} />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pr-16">
                <p className="text-[0.875rem] font-semibold">@{p.authorUsername}</p>
                {p.vehicleTitle && <p className="mt-0.5 text-[0.75rem] text-white/70">{p.vehicleTitle}</p>}
                {p.caption && <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-snug text-white/80">{p.caption}</p>}
              </div>
              {/* the right rail, as in the real feed */}
              <div className="absolute bottom-4 right-3 flex flex-col items-center gap-4" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label={isFollowed ? `Following @${p.authorUsername}` : `Follow @${p.authorUsername}`}
                  onClick={() => {
                    setFollowed((s) => new Set(s).add(p.authorUsername));
                    mark("follow");
                  }}
                  className="relative mb-1 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white"
                >
                  {p.authorAvatarUrl ? (
                    <Image src={p.authorAvatarUrl} alt="" fill unoptimized sizes="40px" className="object-cover" />
                  ) : (
                    <span className="text-[0.875rem] font-semibold uppercase">{p.authorUsername[0]}</span>
                  )}
                  <span
                    className={`absolute -bottom-0.5 left-1/2 flex h-[18px] w-[18px] -translate-x-1/2 items-center justify-center rounded-full transition-colors duration-300 ${
                      isFollowed ? "bg-white text-black" : "bg-accent text-white"
                    }`}
                  >
                    {isFollowed ? <CheckIcon className="h-2.5 w-2.5" /> : <PlusIcon className="h-2.5 w-2.5" />}
                  </span>
                </button>
                <RailButton label={isLiked ? "Unlike" : "Like"} count={p.likeCount + (isLiked ? 1 : 0)} onClick={() => like(p.id, false)}>
                  <HeartIcon className={`h-7 w-7 transition-colors ${isLiked ? "text-accent" : ""}`} filled={isLiked} />
                </RailButton>
                <RailButton label="Comments" count={p.commentCount} onClick={() => setCommentsOpen(true)}>
                  <CommentIcon className="h-7 w-7" />
                </RailButton>
              </div>
            </div>
          );
        })}

        {burst > 0 && (
          <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <HeartIcon filled className="animate-heart-pop h-24 w-24 text-accent drop-shadow-[0_8px_24px_rgb(255_68_51/0.6)]" />
          </span>
        )}

        {!done.has("swipe") && posts.length > 1 && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-5 flex justify-center">
            <span className="animate-tour-nudge rounded-full bg-black/55 px-3 py-1.5 text-[0.75rem] font-medium backdrop-blur-md">
              Swipe up
            </span>
          </div>
        )}

        {/* comments sheet — what tapping the bubble opens */}
        <div
          className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-[#141416]/95 p-5 backdrop-blur-xl transition-transform duration-500 ease-[var(--ease-ios)]"
          style={{ transform: commentsOpen ? "translateY(0)" : "translateY(105%)" }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-hidden={!commentsOpen}
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/20" />
          <p className="text-[0.9375rem] font-semibold">Comments</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-white/60">
            Every post opens a thread like this. Reply to people, @mention a friend, and ask about the build.
          </p>
          <button
            type="button"
            onClick={() => setCommentsOpen(false)}
            tabIndex={commentsOpen ? 0 : -1}
            className="mt-4 h-10 w-full rounded-full bg-white/10 text-[0.875rem] font-medium"
          >
            Got it
          </button>
        </div>
      </div>
      </div>

      <ul className="flex flex-wrap justify-center gap-2" aria-label="Try these">
        {TASKS.map(({ id, label }) => {
          const ok = done.has(id);
          return (
            <li
              key={id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-medium ring-1 ring-inset transition-colors duration-300 ${
                ok ? "bg-success/15 text-success ring-success/30" : "bg-white/[0.04] text-white/70 ring-white/10"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${ok ? "bg-success text-black" : "ring-1 ring-white/30"}`}
              >
                {ok && <CheckIcon className="h-2.5 w-2.5" />}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
      <p className="text-center text-[0.6875rem] text-white/40">Practice mode. Nothing you do here is posted.</p>
    </div>
  );
}

function RailButton({
  label,
  count,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex flex-col items-center gap-0.5 drop-shadow-[0_2px_6px_rgb(0_0_0/0.6)]">
      {children}
      {count !== undefined && <span className="numeral text-[0.6875rem] font-semibold">{compact(count)}</span>}
    </button>
  );
}
