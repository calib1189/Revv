"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { hapticLanding, hapticSnap } from "@/lib/haptics";
import { votePercents } from "@/lib/battles/result";
import { battleVerdict, type BattleVerdict } from "@/lib/battles/verdict";
import { markBattleResultSeen } from "@/lib/battles/seen";
import { voteSequence, voteTickTimes, type VoteSide } from "@/lib/battles/vote-sequence";
import { BATTLE_POINTS } from "@/lib/points/values";
import type { BattleCar, BattleView } from "@/lib/battles/load";

const COLOR = { a: "#ff453a", b: "#4b8dff" } as const;
const CLIP = {
  a: "polygon(0 0, 100% 0, 100% 43%, 0 57%)",
  b: "polygon(0 57%, 100% 43%, 100% 100%, 0 100%)",
  full: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
} as const;

/* The sequence, in ms from the moment it's on screen. The count runs as
 * long as its votes need (vote-sequence.ts); the rest follows it. */
const COUNT_AT = 450;
/** The final tally holds this long before the winner takes over. */
const HOLD_MS = 700;
const CROWN_MS = 500;
const STAMP_MS = 600;
/** A tick of haptics per vote, for a count short enough to feel each one. */
const HAPTIC_VOTES_MAX = 20;

type Phase = "wait" | "split" | "count" | "crown" | "stamp" | "verdict";
const ORDER: Phase[] = ["wait", "split", "count", "crown", "stamp", "verdict"];

/** The votes landing one by one: the running count on each side, and
 * which side the latest one went to (so it can pop). */
function useVoteTicks(seq: VoteSide[], times: number[], running: boolean) {
  const [landed, setLanded] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timers = times.map((t, i) =>
      window.setTimeout(() => {
        setLanded(i + 1);
        if (seq.length <= HAPTIC_VOTES_MAX) hapticSnap();
      }, t),
    );
    return () => timers.forEach(clearTimeout);
  }, [seq, times, running]);
  const n = running ? landed : 0;
  let a = 0;
  for (let i = 0; i < n; i++) if (seq[i] === "a") a += 1;
  return { a, b: n - a, landed: n, last: n > 0 ? seq[n - 1] : null };
}

function useCountUp(target: number, running: boolean, ms: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, running, ms]);
  return running ? value : 0;
}

const VERDICT_COPY: Record<BattleVerdict["kind"], (v: { winner: BattleCar | null; picked: BattleCar | null }) => { title: string; line: string }> = {
  called: () => ({ title: "You called it", line: "Your pick took the win." }),
  missed: ({ picked }) => ({ title: "Not this time", line: `You backed ${picked?.title ?? "the other car"}. New battle's up.` }),
  "owner-won": () => ({ title: "Your build won", line: "The crowd picked yours." }),
  "owner-lost": () => ({ title: "Your build lost this one", line: "Close it out next time. Every vote counts." }),
  "no-winner": () => ({ title: "Dead heat", line: "No winner, so no points this round." }),
  "no-vote": () => ({ title: "You sat this one out", line: `Vote in today's battle for +${BATTLE_POINTS.voted} points.` }),
  "signed-out": () => ({ title: "Want in on the next one?", line: "Sign in to vote and earn points." }),
};

/**
 * Yesterday's Build Battle, revealed: both cars split as they were, the
 * votes counting up, then the loser drops out and the winner takes the
 * screen with its stamp. Last, how it went for you, what it paid you,
 * and the way on to today's battle.
 *
 * It plays once it's on screen (a feed slide waits until it's scrolled
 * to) and marks the result as seen when it finishes.
 */
export function BattleResultReveal({
  view,
  isAuthenticated,
  height,
  insetTop = "0px",
  insetBottom = "0px",
  onNext,
  nextLabel = "Next battle",
}: {
  view: BattleView;
  isAuthenticated: boolean;
  /** CSS height of the whole reveal. */
  height: string;
  /** Space kept clear at the top and bottom (a feed's header and tab bar). */
  insetTop?: string;
  insetBottom?: string;
  onNext: () => void;
  nextLabel?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>("wait");
  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  const result = view.result ?? { a: 0, b: 0, winnerId: null, upset: false };
  const winnerSide: "a" | "b" | null = result.winnerId === view.a.vehicleId ? "a" : result.winnerId === view.b.vehicleId ? "b" : null;
  const winner = winnerSide ? view[winnerSide] : null;
  const [pa, pb] = votePercents(result.a, result.b);
  const verdict = battleVerdict({
    vehicleAId: view.a.vehicleId,
    vehicleBId: view.b.vehicleId,
    result,
    isAuthenticated,
    myVote: view.myVote,
    myCarId: view.myCarId,
  });
  const picked = view.myVote === view.a.vehicleId ? view.a : view.myVote === view.b.vehicleId ? view.b : null;
  const copy = VERDICT_COPY[verdict.kind]({ winner, picked });
  const good = verdict.kind === "called" || verdict.kind === "owner-won";

  const [seq, times] = useMemo(() => {
    const run = voteSequence(result.a, result.b);
    return [run, voteTickTimes(run.length)] as const;
  }, [result.a, result.b]);
  const ticks = useVoteTicks(seq, times, reached("count"));
  const tickTotal = ticks.a + ticks.b;
  const barA = tickTotal === 0 ? 50 : (ticks.a / tickTotal) * 100;
  const shownPoints = useCountUp(verdict.points, reached("verdict"), 700);

  // Start when it's mostly on screen, once.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (reduced) {
          setPhase("verdict");
          return;
        }
        const crownAt = COUNT_AT + (times.at(-1) ?? 0) + HOLD_MS;
        const stampAt = winnerSide ? crownAt + CROWN_MS : crownAt;
        setPhase("split");
        timers.push(window.setTimeout(() => setPhase("count"), COUNT_AT));
        timers.push(window.setTimeout(() => setPhase(winnerSide ? "crown" : "stamp"), crownAt));
        timers.push(window.setTimeout(() => setPhase("stamp"), stampAt));
        timers.push(window.setTimeout(() => setPhase("verdict"), stampAt + STAMP_MS));
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [winnerSide, times]);

  useEffect(() => {
    if (phase === "crown") hapticLanding();
    if (phase === "verdict") {
      markBattleResultSeen(view.id);
      if (good) hapticLanding();
    }
  }, [phase, view.id, good]);

  const crowned = winnerSide !== null && reached("crown");

  const layer = (side: "a" | "b") => {
    const car = view[side];
    const isWinner = winnerSide === side;
    const out = crowned && !isWinner;
    return (
      <span
        key={side}
        aria-hidden
        className="absolute inset-0 transition-[clip-path,opacity,transform,filter] duration-[900ms] ease-[var(--ease-ios)]"
        style={{
          clipPath: crowned && isWinner ? CLIP.full : CLIP[side],
          WebkitClipPath: crowned && isWinner ? CLIP.full : CLIP[side],
          opacity: phase === "wait" ? 0 : out ? 0 : 1,
          transform:
            phase === "wait"
              ? `translateX(${side === "a" ? "-6%" : "6%"})`
              : out
                ? `translateY(${side === "a" ? "-8%" : "8%"}) scale(1.04)`
                : "none",
          filter: out ? "grayscale(1) brightness(0.4)" : reached("count") && !crowned ? "brightness(0.8)" : "none",
          zIndex: isWinner ? 2 : 1,
        }}
      >
        {/* each car framed in its own half until it wins the whole screen */}
        <span
          className="absolute inset-x-0 overflow-hidden transition-[top,height] duration-[900ms] ease-[var(--ease-ios)]"
          style={crowned && isWinner ? { top: 0, height: "100%" } : side === "a" ? { top: 0, height: "57%" } : { top: "43%", height: "57%" }}
        >
          <span className="arena-drift absolute inset-0">
            <MediaImg src={car.heroUrl} sizes="100vw" className="h-full w-full object-cover" />
          </span>
        </span>
      </span>
    );
  };

  return (
    <section
      ref={rootRef}
      aria-label={
        winner
          ? `Build Battle result: ${winner.title} won ${winnerSide === "a" ? `${pa}% to ${pb}%` : `${pb}% to ${pa}%`}`
          : "Build Battle result: a tie"
      }
      className="relative isolate w-full select-none overflow-hidden bg-black text-white"
      style={{ height }}
    >
      {layer("a")}
      {layer("b")}

      {/* the seam, until there's a winner */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] h-full w-full transition-opacity duration-500"
        style={{ opacity: reached("split") && !crowned ? 1 : 0 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line x1="-2" y1="57.28" x2="102" y2="42.72" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* shade for the type: light while it's a split, heavy at the foot once there's a story to read */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[4] transition-opacity duration-700"
        style={{
          opacity: reached("crown") || reached("stamp") ? 1 : 0.55,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 58%, rgba(0,0,0,0.94) 100%)",
        }}
      />

      {/* top: what this is */}
      <div
        className="absolute inset-x-0 z-[6] flex items-center justify-between gap-3 px-5 transition-[opacity,transform] duration-500"
        style={{ top: `calc(${insetTop} + 1rem)`, opacity: reached("split") ? 1 : 0, transform: reached("split") ? "none" : "translateY(-6px)" }}
      >
        <p className="micro-label text-white/85">Build Battle results</p>
        <p className="numeral text-[0.75rem] text-white/70">
          {result.a + result.b} {result.a + result.b === 1 ? "vote" : "votes"}
        </p>
      </div>

      {/* the tally, on the seam while the votes come in */}
      <div
        className="absolute left-1/2 top-1/2 z-[6] w-[min(320px,78%)] transition-[opacity,transform] duration-500 ease-[var(--ease-ios)]"
        style={{
          opacity: reached("count") && !reached("crown") && !(winnerSide === null && reached("stamp")) ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${reached("count") ? 1 : 0.92})`,
        }}
        aria-hidden
      >
        <div className="rounded-[24px] border border-white/15 bg-black/55 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-end justify-between">
            <TallyCount value={ticks.a} color={COLOR.a} pop={ticks.last === "a" ? ticks.landed : 0} />
            <span className="pb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white/55">
              {ticks.landed === seq.length && seq.length > 0 ? "final" : "votes"}
            </span>
            <TallyCount value={ticks.b} color={COLOR.b} pop={ticks.last === "b" ? ticks.landed : 0} align="right" />
          </div>
          {/* the bar shifts with every vote; the white notch is where they meet */}
          <div className="relative mt-3.5 h-2.5">
            <div className="flex h-full overflow-hidden rounded-full bg-white/10">
              <span
                className="h-full transition-[width] duration-300 ease-[var(--ease-ios)]"
                style={{ width: `${barA}%`, background: COLOR.a }}
              />
              <span
                className="h-full transition-[width] duration-300 ease-[var(--ease-ios)]"
                style={{ width: `${100 - barA}%`, background: COLOR.b }}
              />
            </div>
            <span
              aria-hidden
              className="absolute -top-1 h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgb(255_255_255/0.7)] transition-[left] duration-300 ease-[var(--ease-ios)]"
              style={{ left: `${barA}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[0.75rem] text-white/70">
            <span className="max-w-[45%] truncate">{view.a.title}</span>
            <span className="max-w-[45%] truncate text-right">{view.b.title}</span>
          </div>
        </div>
      </div>

      {/* the foot: the stamp, then the verdict */}
      <div className="absolute inset-x-0 z-[7] flex flex-col gap-4 px-5" style={{ bottom: `calc(${insetBottom} + 1.25rem)` }}>
        <div
          className="transition-[opacity,transform] duration-[650ms] ease-[var(--ease-ios)]"
          style={{ opacity: reached("stamp") ? 1 : 0, transform: reached("stamp") ? "none" : "translateY(14px) scale(0.97)" }}
        >
          {winner ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[0.8125rem] font-bold uppercase tracking-[0.3em] text-white">Winner</span>
                {result.upset && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white">
                    Upset
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 line-clamp-2 text-balance text-[2.375rem] font-bold leading-[1.02] tracking-[-0.035em]">
                {winner.title}
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[0.875rem] text-white/75">
                <span className="inline-flex items-center gap-1">
                  @{winner.ownerUsername}
                  {winner.ownerIsVerified && <VerifiedBadge onMedia className="h-3.5 w-3.5" />}
                </span>
                <span aria-hidden>·</span>
                <span className="numeral font-semibold text-white">
                  {winnerSide === "a" ? `${pa}–${pb}` : `${pb}–${pa}`}
                </span>
                <span>{result.upset ? "over a higher score" : "of the vote"}</span>
              </p>
            </>
          ) : (
            <>
              <span className="text-[0.8125rem] font-bold uppercase tracking-[0.3em] text-white">No winner</span>
              <h2 className="mt-1.5 text-[2.375rem] font-bold leading-[1.02] tracking-[-0.035em]">
                {result.a}–{result.b}
              </h2>
            </>
          )}
        </div>

        <div
          className="transition-[opacity,transform] duration-[650ms] ease-[var(--ease-ios)]"
          style={{ opacity: reached("verdict") ? 1 : 0, transform: reached("verdict") ? "none" : "translateY(18px)" }}
        >
          <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[1.0625rem] font-bold leading-tight">{copy.title}</p>
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-white/70">{copy.line}</p>
              </div>
              {verdict.points > 0 && (
                <span
                  className={`numeral flex-shrink-0 rounded-full px-3.5 py-1.5 text-[1.125rem] font-bold tracking-[-0.02em] ${
                    good ? "bg-accent text-white" : "bg-white/15 text-white"
                  }`}
                  aria-label={`${verdict.points} points`}
                >
                  +{shownPoints}
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={onNext}
                disabled={!reached("verdict")}
                className="pressable flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[0.9375rem] font-semibold text-black"
              >
                {nextLabel}
                <ChevronRightIcon className="h-4 w-4" strokeWidth={2.5} />
              </button>
              {winner && (
                <Link
                  href={`/garage/${winner.vehicleId}`}
                  tabIndex={reached("verdict") ? 0 : -1}
                  className="pressable flex h-12 items-center justify-center rounded-full bg-white/15 px-4 text-[0.875rem] font-semibold text-white"
                >
                  See the build
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One side's running count: it pops, with a "+1" lifting off, each time
 * a vote lands on it. */
function TallyCount({
  value,
  color,
  pop,
  align = "left",
}: {
  value: number;
  color: string;
  /** Which vote just landed here (0 for none): re-keys the pop. */
  pop: number;
  align?: "left" | "right";
}) {
  return (
    <span className={`relative flex ${align === "right" ? "justify-end" : ""}`}>
      <span
        key={pop}
        className={`numeral inline-block text-[2.75rem] font-bold leading-none tracking-[-0.04em] ${pop ? "animate-vote-pop" : ""}`}
        style={{ color }}
      >
        {value}
      </span>
      {pop > 0 && (
        <span
          key={`plus-${pop}`}
          aria-hidden
          className={`animate-vote-plus pointer-events-none absolute -top-5 text-[0.875rem] font-bold ${align === "right" ? "right-0" : "left-0"}`}
          style={{ color }}
        >
          +1
        </span>
      )}
    </span>
  );
}
