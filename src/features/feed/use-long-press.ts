"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

const LONG_PRESS_MS = 450;
// Beyond this, a held pointer is a scroll/swipe attempt, not a long
// press — the feed this runs inside snaps vertically (video) or
// horizontally (a multi-photo post), and a naive hold-timer with no
// movement check would also fire mid-swipe.
const MOVE_CANCEL_PX = 10;

/** Long-press detection for a target inside a scrollable feed. Never calls
 * preventDefault, so the browser's own scroll/swipe handling is untouched
 * — this only decides whether ITS OWN callback fires, by racing a timer
 * against however far the pointer moves before release. The same
 * press-and-release that completes a long press also dispatches a
 * regular click afterward; `firedRef` is true for exactly that one click
 * so the caller can skip its own click handling instead of double-firing
 * both a long-press action and a tap action from a single gesture. */
export function useLongPress(onLongPress: () => void, delay = LONG_PRESS_MS) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    firedRef,
    handlers: {
      onPointerDown(e: PointerEvent) {
        startRef.current = { x: e.clientX, y: e.clientY };
        firedRef.current = false;
        clear();
        timerRef.current = setTimeout(() => {
          firedRef.current = true;
          onLongPress();
        }, delay);
      },
      onPointerMove(e: PointerEvent) {
        const start = startRef.current;
        if (!start) return;
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
          clear();
        }
      },
      onPointerUp: clear,
      onPointerCancel: clear,
    },
  };
}
