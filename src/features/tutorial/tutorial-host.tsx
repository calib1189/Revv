"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTutorialBlockedPath, type TutorialOutcome } from "@/lib/tutorial/steps";
import { finishTutorialAction, saveTutorialStepAction } from "@/features/tutorial/actions";
import { TutorialTour } from "@/features/tutorial/tutorial-tour";

/** Fired by Settings → Replay tutorial. */
export const TUTORIAL_REPLAY_EVENT = "sorza:tutorial-replay";

type Open = { mode: "auto" | "replay"; step: number; key: number };

/**
 * Decides when the walkthrough is on screen. `startStep` comes from the
 * person's saved progress (null once they've finished or skipped it, or
 * when it couldn't be read — never risk showing it every launch because a
 * write can't land). Mounted once in the root layout.
 */
export function TutorialHost({ startStep }: { startStep: number | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<Open | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Once it's been dismissed in this session it stays dismissed, even
  // before the layout re-reads the saved progress.
  const dismissed = useRef(false);

  useEffect(() => {
    if (startStep === null || dismissed.current || open || isTutorialBlockedPath(pathname)) return;
    setOpen({ mode: "auto", step: startStep, key: Date.now() });
  }, [startStep, pathname, open]);

  useEffect(() => {
    const replay = () => setOpen({ mode: "replay", step: 0, key: Date.now() });
    window.addEventListener(TUTORIAL_REPLAY_EVENT, replay);
    return () => window.removeEventListener(TUTORIAL_REPLAY_EVENT, replay);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const onStepChange = useCallback(
    (step: number) => {
      if (open?.mode === "auto") void saveTutorialStepAction(step);
    },
    [open?.mode],
  );

  const onFinish = useCallback(
    (outcome: TutorialOutcome, step: number, then?: string) => {
      const mode = open?.mode;
      dismissed.current = true;
      setOpen(null);
      if (mode === "auto") {
        void finishTutorialAction(outcome, step);
        if (outcome === "skipped") setToast("You can replay the tour anytime in Settings.");
      }
      if (then) router.push(then);
    },
    [open?.mode, router],
  );

  return (
    <>
      {open && (
        <TutorialTour key={open.key} initialStep={open.step} mode={open.mode} onStepChange={onStepChange} onFinish={onFinish} />
      )}
      {toast && (
        <div
          role="status"
          className="animate-fade-in fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+1rem)] z-[95] flex justify-center px-6"
        >
          <p className="glass-raised elev-2 rounded-full px-4 py-2.5 text-[0.8125rem] font-medium">{toast}</p>
        </div>
      )}
    </>
  );
}
