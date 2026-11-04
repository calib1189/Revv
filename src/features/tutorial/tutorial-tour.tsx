"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RatingReveal } from "@/features/garage/rating-reveal";
import { RANK_AMBIENT_COLORS, rankForScore } from "@/lib/rating/rank";
import { TUTORIAL_LAST_STEP, TUTORIAL_STEPS, type TutorialOutcome, type TutorialStepId } from "@/lib/tutorial/steps";
import type { TutorialShowcase } from "@/lib/tutorial/showcase";
import { BackIcon } from "@/components/ui/icons";
import { TutorialFeedDemo } from "@/features/tutorial/tutorial-feed-demo";
import {
  ConnectDemo,
  DiscoverDemo,
  GarageDemo,
  LeaderboardDemo,
  RatingDemo,
  StepHeader,
  WelcomeStep,
} from "@/features/tutorial/tutorial-steps";

const COPY: Record<Exclude<TutorialStepId, "welcome">, { eyebrow: string; title: string; body: string }> = {
  feed: {
    eyebrow: "Feed",
    title: "Every build, one swipe away",
    body: "Post photos and videos of your car, share build updates, and like, comment on and follow the builds you love.",
  },
  garage: {
    eyebrow: "Garage",
    title: "Your garage is your build sheet",
    body: "Add every car you own, upload photos, and log each mod as it goes from planned to installed.",
  },
  ratings: {
    eyebrow: "AI ratings",
    title: "Find out what your build scores",
    body: "Add photos and the AI scores your whole build from 0 to 100, from paint and stance to every mod you've logged.",
  },
  leaderboard: {
    eyebrow: "Leaderboards",
    title: "See where you rank",
    body: "Rated, verified builds are ranked by score. Compete with everyone, with friends, or inside your crew.",
  },
  discover: {
    eyebrow: "Discover",
    title: "Find cars, shops and meets",
    body: "Browse upcoming car meets, find local shops, and search for any car or enthusiast.",
  },
  connect: {
    eyebrow: "Community",
    title: "Build your circle",
    body: "Follow people, join crews, and message anyone in the scene. That's the tour.",
  },
};

type Load = { status: "loading" | "ready" | "error"; showcase: TutorialShowcase | null };

export function TutorialTour({
  initialStep,
  mode,
  onStepChange,
  onFinish,
}: {
  initialStep: number;
  /** "auto" persists progress; "replay" (from Settings) never does. */
  mode: "auto" | "replay";
  onStepChange: (step: number) => void;
  onFinish: (outcome: TutorialOutcome, step: number, then?: string) => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [dir, setDir] = useState(1);
  const [resumeNote, setResumeNote] = useState(mode === "auto" && initialStep > 0);
  const [load, setLoad] = useState<Load>({ status: "loading", showcase: null });
  const [revealOpen, setRevealOpen] = useState(false);
  const [watched, setWatched] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const id = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_LAST_STEP;

  const runFetch = useCallback(() => {
    fetch("/api/tutorial/showcase", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<TutorialShowcase>) : Promise.reject(new Error(String(r.status)))))
      .then((showcase) => setLoad({ status: "ready", showcase }))
      .catch(() => setLoad({ status: "error", showcase: null }));
  }, []);
  useEffect(() => {
    runFetch();
  }, [runFetch]);
  const retryShowcase = () => {
    setLoad({ status: "loading", showcase: null });
    runFetch();
  };

  // The page underneath stays put while the tour is up.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  // Move focus with the screen, so a screen reader announces each one.
  useEffect(() => {
    const heading = document.getElementById("tour-step-title");
    if (heading) heading.focus({ preventScroll: true });
    else primaryRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(TUTORIAL_LAST_STEP, next));
      if (clamped === step) return;
      setDir(clamped > step ? 1 : -1);
      setStep(clamped);
      setResumeNote(false);
      onStepChange(clamped);
    },
    [step, onStepChange],
  );

  const showcase = load.showcase;
  const loading = load.status === "loading";
  const hasCar = Boolean(showcase?.viewer?.vehicle);
  const finishPrimary = () => {
    if (mode === "replay" || hasCar || load.status !== "ready") onFinish("finished", step);
    else onFinish("finished", step, "/garage/new");
  };
  const skip = useCallback(() => onFinish("skipped", step), [onFinish, step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (revealOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowRight" && !isLast) goTo(step + 1);
      else if (e.key === "ArrowLeft") goTo(step - 1);
      else if (e.key === "Escape") skip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, step, isLast, skip, revealOpen]);

  // The light behind each screen: SORZA red, except the ratings screen,
  // which takes the colour of the build it's showing.
  const ambient =
    id === "ratings" && showcase?.topBuild ? RANK_AMBIENT_COLORS[rankForScore(showcase.topBuild.rating.score)] : "#ff4433";

  let primaryLabel = "Continue";
  if (step === 0) primaryLabel = "Let's get started";
  if (isLast) primaryLabel = mode === "replay" ? "Done" : hasCar || load.status !== "ready" ? "Start exploring" : "Add your car";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SORZA walkthrough"
      className="fixed inset-0 z-[90] flex select-none flex-col overflow-hidden bg-[#050506] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[65%] transition-[background] duration-700"
        style={{ background: `radial-gradient(90% 70% at 50% 0%, ${ambient}26 0%, transparent 70%)` }}
      />

      {/* top bar: progress + skip */}
      <div className="relative mx-auto flex w-full max-w-md items-center gap-4 px-6 pb-2 pt-[calc(0.875rem+env(safe-area-inset-top))]">
        <div className={`flex flex-1 gap-1.5 transition-opacity duration-500 ${step === 0 ? "opacity-0" : "opacity-100"}`} aria-hidden={step === 0}>
          {TUTORIAL_STEPS.slice(1).map((s, i) => {
            const n = i + 1;
            return (
              <span key={s} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.12]">
                {n < step && <span className="block h-full w-full bg-white" />}
                {n === step && <span key={step} className="animate-tour-segment block h-full w-full bg-white" />}
              </span>
            );
          })}
        </div>
        <span className="sr-only" aria-live="polite">
          {step === 0 ? "Welcome" : `Step ${step} of ${TUTORIAL_LAST_STEP}`}
        </span>
        <button
          type="button"
          onClick={skip}
          className="-mr-2 h-9 rounded-full px-3 text-[0.875rem] font-medium text-white/55 transition-colors hover:text-white"
        >
          {mode === "replay" ? "Close" : "Skip"}
        </button>
      </div>

      {resumeNote && (
        <div className="animate-fade-in relative mx-auto mt-1 flex w-full max-w-md items-center justify-between gap-3 px-6">
          <p className="text-[0.8125rem] text-white/60">Picking up where you left off.</p>
          <button type="button" onClick={() => goTo(0)} className="text-[0.8125rem] font-semibold text-accent">
            Start over
          </button>
        </div>
      )}

      {/* the screen */}
      <div
        key={step}
        className="animate-tour-in no-scrollbar relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden px-6 pb-4 pt-4"
        style={{ "--tour-dir": dir } as React.CSSProperties}
      >
        {id === "welcome" ? (
          <WelcomeStep />
        ) : (
          <>
            <StepHeader {...COPY[id]} />
            {load.status === "error" && (
              <p className="-mt-2 text-[0.75rem] text-white/45">
                Couldn&apos;t load live examples.{" "}
                <button type="button" onClick={retryShowcase} className="font-semibold text-accent">
                  Try again
                </button>
              </p>
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              {id === "feed" &&
                (loading ? (
                  <div className="animate-skeleton mx-auto w-full max-w-[300px] flex-1 rounded-[30px] bg-white/[0.06]" style={{ minHeight: 300 }} />
                ) : showcase && showcase.posts.length > 0 ? (
                  <TutorialFeedDemo posts={showcase.posts} />
                ) : (
                  <FeedFallback />
                ))}
              {id === "garage" && <GarageDemo viewer={showcase?.viewer ?? null} loading={loading} />}
              {id === "ratings" && (
                <RatingDemo
                  topBuild={showcase?.topBuild ?? null}
                  loading={loading}
                  watched={watched}
                  onWatch={() => setRevealOpen(true)}
                />
              )}
              {id === "leaderboard" && <LeaderboardDemo podium={showcase?.podium ?? []} loading={loading} />}
              {id === "discover" && <DiscoverDemo meets={showcase?.meets ?? []} loading={loading} />}
              {id === "connect" && <ConnectDemo viewer={showcase?.viewer ?? null} loading={loading} />}
            </div>
          </>
        )}
      </div>

      {/* bottom bar */}
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-2 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              aria-label="Back"
              className="pressable flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/80"
            >
              <BackIcon className="h-5 w-5" />
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={() => (isLast ? finishPrimary() : goTo(step + 1))}
            className="pressable h-[52px] flex-1 rounded-full bg-accent text-[1rem] font-semibold text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),0_10px_30px_-12px_rgb(255_68_51/0.7)]"
          >
            {primaryLabel}
          </button>
        </div>
        {isLast && primaryLabel === "Add your car" && (
          <button type="button" onClick={() => onFinish("finished", step)} className="h-10 text-[0.875rem] font-medium text-white/60">
            I&apos;ll explore first
          </button>
        )}
        {step === 0 && (
          <p className="text-center text-[0.75rem] text-white/35">You can replay this anytime in Settings.</p>
        )}
      </div>

      {revealOpen && showcase?.topBuild && (
        <RatingReveal
          result={showcase.topBuild.rating}
          landedLabel={`@${showcase.topBuild.ownerUsername}'s rating`}
          onDone={() => {
            setRevealOpen(false);
            setWatched(true);
          }}
        />
      )}
    </div>
  );
}

function FeedFallback() {
  const rows = [
    ["Swipe up", "Move through posts one at a time, full screen."],
    ["Double-tap", "Like a post. Tap the bubble to comment."],
    ["Tap +", "Follow the person behind a build."],
  ];
  return (
    <ul className="flex flex-col gap-2">
      {rows.map(([title, body]) => (
        <li key={title} className="rounded-[18px] bg-white/[0.04] px-4 py-3 ring-1 ring-inset ring-white/[0.07]">
          <p className="text-[0.9375rem] font-semibold">{title}</p>
          <p className="mt-0.5 text-[0.8125rem] text-white/55">{body}</p>
        </li>
      ))}
    </ul>
  );
}
