"use client";

import { useSyncExternalStore } from "react";
import { getDevicePreferences } from "@/lib/device-preferences";

/**
 * Whether the feed is muted, shared by every video and sound in it.
 *
 * Sound is on unless the viewer mutes it (or turned "start with sound"
 * off in Settings → Playback). Muting is their choice and it sticks for
 * the whole feed, like TikTok: it isn't something a single video decides
 * on its own. Lasts for the session; a fresh launch starts with sound.
 */
let userMuted: boolean | null = null;
const listeners = new Set<() => void>();

export function isFeedMuted(): boolean {
  return userMuted ?? !getDevicePreferences().videoSound;
}

export function setFeedMuted(muted: boolean) {
  userMuted = muted;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeedMuted(): boolean {
  return useSyncExternalStore(subscribe, isFeedMuted, () => false);
}

/**
 * Only this means "the browser won't start sound without a tap first". A
 * play() also rejects when it's interrupted (the viewer scrolled on before
 * it started) or when the video hasn't loaded yet, and treating those as
 * a reason to mute is what left videos silent for no reason.
 */
export function isAutoplayBlocked(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: unknown }).name === "NotAllowedError";
}

/** The next real tap or key press anywhere on the page, once. Sound can
 * only be started inside one of these. */
export function onNextGesture(run: (e: Event) => void): () => void {
  const events = ["pointerup", "touchend", "keydown"] as const;
  const handler = (e: Event) => {
    stop();
    run(e);
  };
  const stop = () => events.forEach((e) => window.removeEventListener(e, handler, true));
  events.forEach((e) => window.addEventListener(e, handler, true));
  return stop;
}
