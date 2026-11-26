"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { BoltIcon, CameraIcon, ChevronRightIcon, FlameIcon, HeartIcon, StarIcon } from "@/components/ui/icons";

export type StepKey = "enter" | "vote" | "rate" | "battle";

export interface StreakStep {
  key: StepKey;
  title: string;
  /** What to do, as a short line under the title in "Other ways". */
  hint: string;
  /** The step as the one big button: "Vote in today's Build Battle". */
  action: string;
  /** How little it takes: "One tap. Takes 5 seconds." */
  effort: string;
  /** What you did, once it kept the streak: "You voted in the Build Battle". */
  doneText: string;
  href: string;
  done: boolean;
  /** Can be done today (e.g. Rate the Ride has cars left). */
  available: boolean;
}

/** The quickest way first: that's the one offered as the big button. */
const PRIMARY_ORDER: StepKey[] = ["battle", "vote", "rate", "enter"];

const ICONS: Record<StepKey, (props: { className?: string }) => ReactNode> = {
  enter: CameraIcon,
  vote: HeartIcon,
  rate: StarIcon,
  battle: BoltIcon,
};

const seenKey = (todayKey: string) => `sorza-streak-steps:${todayKey}`;

/** Steps you finished since you last looked at this card today. Those
 * play their check animation once; ones you've already seen just show
 * as done. Storage can be missing (private mode), in which case every
 * done step simply shows as done, without the animation. */
const subscribeNever = () => () => {};
/** The list as it was when this visit started, held until the checks have
 * finished drawing, so a re-render mid-animation doesn't cut them off. */
const visitSnapshot = new Map<string, string>();
/** How long the check animations run, end to end (globals.css). */
const ANIMATION_MS = 1600;

/** What this browser saw done today: a JSON list, "" before anything was
 * stored, or "unavailable" when storage can't be read. */
function readSeen(todayKey: string): string {
  const held = visitSnapshot.get(todayKey);
  if (held !== undefined) return held;
  let value: string;
  try {
    value = localStorage.getItem(seenKey(todayKey)) ?? "";
  } catch {
    value = "unavailable";
  }
  visitSnapshot.set(todayKey, value);
  return value;
}

function useFreshlyDone(todayKey: string, steps: StreakStep[]): { ready: boolean; fresh: Set<StepKey> } {
  const done = steps.filter((s) => s.done).map((s) => s.key);
  const signature = done.join(",");
  // "server" on the server and during hydration, so the first paint
  // matches; the browser's own value after that.
  const seenRaw = useSyncExternalStore(subscribeNever, () => readSeen(todayKey), () => "server");
  const ready = seenRaw !== "server";

  let fresh = new Set<StepKey>();
  if (ready && seenRaw !== "unavailable") {
    let seen: StepKey[] = [];
    try {
      seen = seenRaw ? (JSON.parse(seenRaw) as StepKey[]) : [];
    } catch {
      seen = [];
    }
    fresh = new Set(done.filter((k) => !seen.includes(k)));
  }

  // Remember what's been shown, once the browser has read the old list.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(seenKey(todayKey), JSON.stringify(signature ? signature.split(",") : []));
    } catch {
      // Nothing to remember it in; it just won't animate next time either.
    }
    // Once they've drawn, let the next visit read the updated list.
    const timer = setTimeout(() => visitSnapshot.delete(todayKey), ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [ready, todayKey, signature]);

  return { ready, fresh };
}

/** What keeps your streak alive today: each way to show up, what it
 * asks of you, and a tick that draws itself in when you've done it. Any
 * one of them counts for the day. */
export function StreakSteps({ steps, todayKey }: { steps: StreakStep[]; todayKey: string }) {
  const { ready, fresh } = useFreshlyDone(todayKey, steps);
  const done = steps.filter((s) => s.done);
  const kept = done.length > 0;

  // Kept: the card folds down to one line saying so. The check draws in
  // the first time you see it today.
  if (kept) {
    const showDone = ready;
    const animate = ready && done.every((s) => fresh.has(s.key));
    const first = done[0];
    return (
      <section aria-label="Streak kept for today">
        <div
          className={`flex items-center gap-3 rounded-[18px] border border-accent/25 bg-accent/[0.08] p-3.5 ${
            animate ? "step-row-in" : ""
          }`}
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <FlameIcon className={`h-5 w-5 ${animate ? "step-kept-in" : ""}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold leading-tight">Streak kept for today</span>
            <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">{first.doneText}</span>
          </span>
          <StepCheck done={showDone} animate={animate} />
        </div>
      </section>
    );
  }

  // Not yet: one big, obvious thing to do (the quickest one), and the
  // other ways folded away so they don't read as a to-do list.
  const primary = PRIMARY_ORDER.map((k) => steps.find((s) => s.key === k && s.available)).find(Boolean) ?? steps[0];
  const others = steps.filter((s) => s.key !== primary.key && s.available);
  const PrimaryIcon = ICONS[primary.key];

  return (
    <section className="flex flex-col gap-2" aria-label="Keep your streak">
      <Link
        href={primary.href}
        className="pressable step-row-in flex items-center gap-3 rounded-[18px] bg-accent p-3.5 text-white"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
          <PrimaryIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-white/80">
            Keep your streak
          </span>
          <span className="block text-[1rem] font-bold leading-tight">{primary.action}</span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-white/80">{primary.effort}</span>
        </span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/80" />
      </Link>
      {others.length > 0 && (
        <details className="group">
          <summary className="pressable flex cursor-pointer list-none items-center justify-center gap-1 py-1.5 text-[0.8125rem] font-medium text-muted [&::-webkit-details-marker]:hidden">
            Other ways to keep it
            <ChevronRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-90" />
          </summary>
          <ol className="mt-1 flex flex-col gap-2">
            {others.map((step) => {
              const Icon = ICONS[step.key];
              return (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    className="pressable flex items-center gap-3 rounded-[16px] border border-border bg-foreground/[0.03] p-3"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-foreground/[0.07]">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-semibold leading-tight">{step.title}</span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-muted">{step.hint}</span>
                    </span>
                    <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </section>
  );
}

/** The kept card's check: a filled circle whose tick draws in (once, the
 * first time you see it today). */
function StepCheck({ done, animate }: { done: boolean; animate: boolean }) {
  // Before the browser knows whether to animate: an empty ring the check
  // can pop into, so it never flashes in and then animates again.
  if (!done) return <span className="h-7 w-7 flex-shrink-0 rounded-full border-2 border-accent/30" />;
  return (
    <span
      className={`relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white ${
        animate ? "step-check-pop" : ""
      }`}
      aria-label="Done"
    >
      {animate && <span aria-hidden className="step-check-ring absolute inset-0 rounded-full border-2 border-accent" />}
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className={animate ? "step-check-draw" : ""}
        />
      </svg>
    </span>
  );
}
