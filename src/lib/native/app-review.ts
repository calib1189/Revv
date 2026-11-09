"use client";

// Asks for an App Store rating right after an owner's build lands a good
// score: the happiest moment the app has. The native half is
// AppReviewPlugin in ios/App/App/MainViewController.swift; builds from
// before it existed don't have it, and on those (and on the web) this
// does nothing.

/** Gold or better. A score below this is not the moment to ask. */
export const REVIEW_PROMPT_MIN_SCORE = 50;

/** Apple already caps the prompt at three a year, but re-rating the same
 * car the next day shouldn't spend another of them. */
export const REVIEW_PROMPT_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

/** Lets the refreshed page with the new score settle before the sheet. */
const PROMPT_DELAY_MS = 1500;

const LAST_ASKED_KEY = "sorza.reviewPromptAt";

export function shouldAskForReview(score: number, lastAskedAt: number | null, now: number): boolean {
  if (score < REVIEW_PROMPT_MIN_SCORE) return false;
  if (lastAskedAt !== null && now - lastAskedAt < REVIEW_PROMPT_COOLDOWN_MS) return false;
  return true;
}

function readLastAskedAt(): number | null {
  try {
    const raw = window.localStorage.getItem(LAST_ASKED_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLastAskedAt(at: number) {
  try {
    window.localStorage.setItem(LAST_ASKED_KEY, String(at));
  } catch {
    // Blocked storage: Apple's own yearly cap still applies.
  }
}

interface AppReviewPlugin {
  requestReview(): Promise<void>;
}

/** Best-effort and fire-and-forget: a prompt that doesn't show must never
 * get in the way of the score itself. */
export function requestAppReviewAfterRating(score: number) {
  void (async () => {
    try {
      const now = Date.now();
      if (!shouldAskForReview(score, readLastAskedAt(), now)) return;
      const { Capacitor, registerPlugin } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("AppReview")) return;
      // Kept in this function, never returned from an async one: a
      // Capacitor plugin proxy answers `then`, so awaiting it would hang
      // (see loadPlugin in ./push.ts).
      const plugin = registerPlugin<AppReviewPlugin>("AppReview");
      writeLastAskedAt(now);
      await new Promise((resolve) => setTimeout(resolve, PROMPT_DELAY_MS));
      await plugin.requestReview();
    } catch {
      // Best-effort only.
    }
  })();
}
