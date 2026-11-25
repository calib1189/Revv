"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { CheckIcon } from "@/components/ui/icons";
import { Countdown } from "@/features/daily/countdown";
import { ShareBattleButton } from "@/features/battles/share-battle-button";
import { useBattleVote } from "@/features/battles/use-battle-vote";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { votePercents } from "@/lib/battles/result";
import type { BattleCar, BattleView } from "@/lib/battles/load";

/* Two sides, split by one clean diagonal. Each side's colour is only an
 * accent (a dot, the result bar), never a wash over the photo. */
const SIDE = {
  a: { color: "#ff453a", clip: "polygon(0 0, 100% 0, 100% 43%, 0 57%)" },
  b: { color: "#4b8dff", clip: "polygon(0 57%, 100% 43%, 100% 100%, 0 100%)" },
} as const;

function Side({
  view,
  car,
  side,
  percent,
  vote,
  isAuthenticated,
}: {
  view: BattleView;
  car: BattleCar;
  side: "a" | "b";
  percent: number;
  vote: ReturnType<typeof useBattleVote>;
  isAuthenticated: boolean;
}) {
  const s = SIDE[side];
  const top = side === "a";
  const tier = rankForScore(car.score);
  const won = view.result?.winnerId === car.vehicleId;
  const lost = view.result?.winnerId != null && !won;
  const picked = vote.myVote === car.vehicleId || vote.pendingPick === car.vehicleId;
  const passed = !view.ended && (vote.myVote ?? vote.pendingPick) !== null && !picked;
  const dim = lost || passed;

  const photo = (
    <>
      {/* each car framed in its own half (the line runs 57% to 43%) */}
      <span className={`absolute inset-x-0 h-[57%] overflow-hidden ${top ? "arena-in-a top-0" : "arena-in-b top-[43%]"}`}>
        <span
          className="arena-drift absolute inset-0 transition-[filter] duration-700"
          style={{ filter: dim ? "grayscale(1) brightness(0.45)" : undefined }}
        >
          <MediaImg src={car.heroUrl} sizes="100vw" className="h-full w-full object-cover" />
        </span>
      </span>
      {/* a shade for the type only, on the side it sits */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: top
            ? "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.12) 24%, transparent 40%)"
            : "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 26%, transparent 42%)",
        }}
      />
    </>
  );

  const label = `${car.title} by @${car.ownerUsername}`;
  const shape = "absolute inset-0 block";
  const style = { clipPath: s.clip, WebkitClipPath: s.clip } as const;
  let hit: React.ReactNode;
  if (!isAuthenticated && !view.ended) {
    hit = (
      <Link href={`/login?next=${encodeURIComponent(`/battle/${view.id}`)}`} className={shape} style={style} aria-label={`Sign in to vote for ${label}`}>
        {photo}
      </Link>
    );
  } else if (vote.canVote) {
    hit = (
      <button type="button" onClick={() => vote.vote(car.vehicleId)} disabled={vote.isPending} className={`${shape} active:brightness-90`} style={style} aria-label={`Vote for ${label}`}>
        {photo}
      </button>
    );
  } else {
    hit = (
      <Link href={`/garage/${car.vehicleId}`} className={shape} style={style} aria-label={label}>
        {photo}
      </Link>
    );
  }

  const badge = won
    ? { text: view.result?.upset ? "Upset win" : "Winner", cls: "bg-white text-black" }
    : picked && !view.ended
      ? { text: vote.pendingPick ? "Voting…" : "Your pick", cls: "bg-white text-black" }
      : null;

  return (
    <>
      {hit}
      <div
        className={`arena-plate pointer-events-none absolute z-[3] max-w-[80%] ${top ? "left-5 top-[4.5rem] text-left" : "bottom-[4.75rem] right-5 text-right"}`}
      >
        {badge && (
          <span className={`animate-rise-in mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${badge.cls}`}>
            <CheckIcon className="h-3 w-3" />
            {badge.text}
          </span>
        )}
        <p className="line-clamp-2 text-[1.75rem] font-bold leading-[1.08] tracking-[-0.02em] text-white [text-shadow:0_2px_16px_rgb(0_0_0/0.5)]">
          {car.title}
        </p>
        <p className={`mt-1 flex items-center gap-1.5 text-[0.8125rem] text-white/80 ${top ? "" : "justify-end"}`}>
          <span aria-hidden className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
          @{car.ownerUsername}
          {car.ownerIsVerified && <VerifiedBadge onMedia className="h-3 w-3" />}
        </p>
        {vote.reveal && (
          <p className="animate-fade-in numeral mt-1 text-[0.8125rem] font-semibold" style={{ color: RANK_TEXT_COLORS[tier] }}>
            {RANK_LABELS[tier]} · {car.score.toFixed(2)}
            {view.result ? <span className="text-white/90">{`  ·  ${percent}%`}</span> : null}
          </p>
        )}
      </div>
    </>
  );
}

/** The Build Battle, full screen: the two cars split by one clean
 * diagonal, a quiet VS where they meet, the clock to the result up top.
 * The photos ease in from their sides and the line draws across once
 * it's on screen; after that, nothing moves but the photos, slowly. */
export function BattleArena({
  view,
  isAuthenticated,
  viewerUsername = null,
  height,
}: {
  view: BattleView;
  isAuthenticated: boolean;
  viewerUsername?: string | null;
  /** CSS height of the arena. */
  height: string;
}) {
  const vote = useBattleVote(view, isAuthenticated);
  const [pa, pb] = view.result ? votePercents(view.result.a, view.result.b) : [0, 0];

  const rootRef = useRef<HTMLElement>(null);
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
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let message: React.ReactNode;
  if (vote.error) message = <span className="text-[#ff8a80]">{vote.error}</span>;
  else if (view.ended) {
    const winner = view.result?.winnerId === view.a.vehicleId ? view.a : view.result?.winnerId === view.b.vehicleId ? view.b : null;
    message = winner
      ? `${winner.title} won${view.result?.upset ? ", an upset over a higher score" : ""}.`
      : view.result && view.result.a + view.result.b > 0
        ? "A dead heat. No winner this time."
        : "Nobody voted in this one.";
  } else if (view.isOwner) message = "Your car is in this one. Share it to get votes.";
  else if (vote.myVote) message = `Locked in.${vote.points > 0 ? ` +${vote.points} points.` : ""} Results tomorrow.`;
  else if (!isAuthenticated) message = "Sign in to vote.";
  else message = "Tap the better build.";

  const showShare = view.isOwner || vote.myVote !== null || view.ended;
  const votes = view.ended ? (view.result?.a ?? 0) + (view.result?.b ?? 0) : view.voteTotal + (vote.justVoted ? 1 : 0);

  return (
    <section
      ref={rootRef}
      data-intro={intro}
      aria-label={`Build Battle: ${view.a.title} versus ${view.b.title}`}
      className="relative isolate w-full select-none overflow-hidden bg-black text-white"
      style={{ height }}
    >
      <Side view={view} car={view.a} side="a" percent={pa} vote={vote} isAuthenticated={isAuthenticated} />
      <Side view={view} car={view.b} side="b" percent={pb} vote={vote} isAuthenticated={isAuthenticated} />

      {/* the line between them */}
      <svg aria-hidden className="arena-seam pointer-events-none absolute inset-0 z-[2] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="-2" y1="57.28" x2="102" y2="42.72" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* VS, quietly, where they meet */}
      <span
        aria-hidden
        className="arena-vs pointer-events-none absolute left-1/2 top-1/2 z-[4] flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/60 text-[0.9375rem] font-bold tracking-[0.04em] backdrop-blur-md"
      >
        VS
      </span>

      {/* top: the title, then the clock (or, once it's over, the split) */}
      <div className="arena-hud absolute inset-x-0 top-0 z-[5] flex items-center justify-between gap-3 px-5 pt-4">
        <p className="micro-label text-white/85">Build Battle</p>
        {view.result ? (
          <div className="flex min-w-0 flex-1 items-center gap-2" aria-label={`${pa}% to ${pb}%`}>
            <span className="numeral text-[0.8125rem] font-semibold">{pa}%</span>
            <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <span className="arena-bar h-full" style={{ width: `${pa}%`, background: SIDE.a.color }} />
              <span className="arena-bar h-full" style={{ width: `${pb}%`, background: SIDE.b.color }} />
            </span>
            <span className="numeral text-[0.8125rem] font-semibold">{pb}%</span>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[0.75rem] backdrop-blur-md" suppressHydrationWarning>
            <span aria-hidden className="arena-live h-1.5 w-1.5 rounded-full bg-[#ff453a]" />
            <span className="text-white/70">Results in</span>
            <span className="numeral font-semibold">
              <Countdown endsAt={view.endsAt} clock fallback="--:--:--" closedLabel="00:00:00" />
            </span>
          </p>
        )}
        <p className="numeral text-[0.75rem] text-white/70">
          {votes} {votes === 1 ? "vote" : "votes"}
        </p>
      </div>

      {/* bottom: what to do, or what happened */}
      <div className="arena-hud absolute inset-x-0 bottom-0 z-[5] flex min-h-14 items-center justify-between gap-3 px-5 pb-4">
        <p key={vote.myVote ?? "open"} className={`text-[0.875rem] text-white/90 ${vote.justVoted ? "animate-rise-in" : ""}`} role={vote.error ? "alert" : undefined}>
          {message}
        </p>
        {showShare && (
          <ShareBattleButton
            onMedia
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
    </section>
  );
}
