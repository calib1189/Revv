"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { CheckIcon } from "@/components/ui/icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { votePercents } from "@/lib/battles/result";
import { useBattleVote } from "@/features/battles/use-battle-vote";
import { ShareBattleButton } from "@/features/battles/share-battle-button";
import type { BattleCar, BattleView } from "@/lib/battles/load";

function hoursLeft(endsAt: string): string {
  const ms = Date.parse(endsAt) - Date.now();
  if (ms <= 0) return "Voting closed";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `Results in ${h}h`;
  return `Results in ${Math.max(1, Math.round(ms / 60_000))}m`;
}

/** Today's (or a past) Build Battle: two real builds, one tap to vote.
 * Scores stay hidden until you've voted, so you judge the build, not
 * the number; the result shows once the day is over. Used as a feed
 * slide and on the battle page; `className` sets its height. */
export function BattleCard({
  view,
  isAuthenticated,
  viewerUsername = null,
  className = "h-[78dvh]",
  tone = "page",
}: {
  view: BattleView;
  isAuthenticated: boolean;
  /** The owner's share carries ?ref= so it counts as their invite. */
  viewerUsername?: string | null;
  className?: string;
  /** "media" on the feed's black slides (white text in either theme). */
  tone?: "page" | "media";
}) {
  const { myVote, pendingPick, points, error, isPending, canVote, reveal, vote } = useBattleVote(view, isAuthenticated);
  // The intro (globals.css, battle-*) waits until the card is on screen,
  // so a feed slide swiped into view plays it rather than finishing
  // off screen.
  const rootRef = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState<"wait" | "play">("wait");
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIntro("play");
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [pa, pb] = view.result ? votePercents(view.result.a, view.result.b) : [0, 0];

  function side(car: BattleCar, percent: number, order: "a" | "b") {
    const tier = rankForScore(car.score);
    const won = view.result?.winnerId === car.vehicleId;
    const lost = view.result?.winnerId != null && !won;
    const picked = myVote === car.vehicleId || pendingPick === car.vehicleId;
    // Once you've picked, the other side steps back.
    const passed = !view.ended && (myVote ?? pendingPick) !== null && !picked;

    const body = (
      <>
        <span className={`absolute inset-0 ${picked && !view.ended ? "battle-photo-picked" : "battle-photo"}`}>
          <MediaImg src={car.heroUrl} sizes="100vw" className="h-full w-full object-cover" />
        </span>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        <span
          className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${
            lost || passed ? "opacity-45" : "opacity-0"
          }`}
        />
        {picked && (
          <span className="animate-fade-in pointer-events-none absolute inset-0 rounded-[inherit] ring-[3px] ring-inset ring-white/90" />
        )}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-left ${
            order === "a" ? "battle-rise" : "battle-rise-late"
          }`}
        >
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {won && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-black">
                  Winner
                </span>
              )}
              {won && view.result?.upset && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white">
                  Upset
                </span>
              )}
              {picked && !view.ended && (
                <span className="animate-rise-in flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-black">
                  <CheckIcon className="h-3 w-3" />
                  {pendingPick ? "Voting…" : "Your pick"}
                </span>
              )}
            </div>
            <p className="line-clamp-1 text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-white">
              {car.title}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[0.8125rem] text-white/75">
              @{car.ownerUsername}
              {car.ownerIsVerified && <VerifiedBadge onMedia className="h-3 w-3" />}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            {view.result && <p className="animate-rise-in numeral text-[2rem] leading-none text-white">{percent}%</p>}
            {reveal && (
              <p className="animate-fade-in numeral mt-1 text-[0.75rem]" style={{ color: RANK_TEXT_COLORS[tier] }}>
                {RANK_LABELS[tier]} · {car.score.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </>
    );

    // The wrapper carries the slide-in; the inner element keeps its own
    // transform free for .pressable.
    const shape = "relative min-h-0 flex-1 overflow-hidden rounded-[22px] bg-black";
    const wrap = (inner: React.ReactNode) => (
      <div className={`flex min-h-0 flex-1 flex-col ${order === "a" ? "battle-enter-a" : "battle-enter-b"}`}>{inner}</div>
    );
    if (!isAuthenticated && !view.ended) {
      return wrap(
        <Link href={`/login?next=${encodeURIComponent(`/battle/${view.id}`)}`} className={`pressable ${shape}`}>
          {body}
        </Link>,
      );
    }
    if (canVote) {
      return wrap(
        <button
          type="button"
          onClick={() => vote(car.vehicleId)}
          disabled={isPending}
          aria-label={`Vote for ${car.title}`}
          className={`pressable ${shape}`}
        >
          {body}
        </button>,
      );
    }
    return wrap(
      <Link href={`/garage/${car.vehicleId}`} className={shape}>
        {body}
      </Link>,
    );
  }

  let status: React.ReactNode;
  if (view.ended) {
    const winner = view.result?.winnerId === view.a.vehicleId ? view.a : view.result?.winnerId === view.b.vehicleId ? view.b : null;
    status = winner
      ? `${winner.title} won${view.result?.upset ? ", an upset over a higher score" : ""}.`
      : view.result && view.result.a + view.result.b > 0
        ? "A dead heat. No winner this time."
        : "Nobody voted in this one.";
  } else if (view.isOwner) {
    status = "Your car is in this one. Share it to get votes.";
  } else if (myVote) {
    status = `Locked in. ${points > 0 ? `+${points} points. ` : ""}Results tomorrow.`;
  } else if (!isAuthenticated) {
    status = "Sign in to vote.";
  } else {
    status = "Tap the better build.";
  }

  const muted = tone === "media" ? "text-white/65" : "text-muted";
  const strong = tone === "media" ? "text-white" : "text-foreground";

  return (
    <div ref={rootRef} data-intro={intro} className={`flex w-full flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <p className="micro-label text-accent">Build Battle</p>
        <p className={`flex items-center gap-1.5 text-[0.75rem] ${muted}`} suppressHydrationWarning>
          {!view.ended && <span aria-hidden className="battle-live h-1.5 w-1.5 rounded-full bg-accent" />}
          {view.ended
            ? `${(view.result?.a ?? 0) + (view.result?.b ?? 0)} votes`
            : `${view.voteTotal + (myVote && !view.myVote ? 1 : 0)} votes · ${hoursLeft(view.endsAt)}`}
        </p>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col gap-2">
        {side(view.a, pa, "a")}
        {side(view.b, pb, "b")}
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2">
          <span className="battle-vs-ring absolute inset-0 rounded-full border-2 border-white/80" />
          <span className="battle-vs flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-black text-[0.875rem] font-black tracking-wide text-white">
            VS
          </span>
        </span>
      </div>
      <div className="battle-rise-late flex min-h-11 items-center justify-between gap-3 px-1">
        <p
          key={myVote ?? "open"}
          className={`text-[0.875rem] ${error ? "text-danger" : strong} ${myVote && !view.myVote ? "animate-rise-in" : ""}`}
          role={error ? "alert" : undefined}
        >
          {error ?? status}
        </p>
        {(view.isOwner || myVote || view.ended) && (
          <ShareBattleButton
            onMedia={tone === "media"}
            battleId={view.id}
            refUsername={viewerUsername}
            text={
              view.isOwner && !view.ended
                ? "My car is in today's SORZA Build Battle. Vote for it:"
                : "Which build wins? Vote in today's SORZA Build Battle:"
            }
          />
        )}
      </div>
    </div>
  );
}
