"use client";

import { useRef } from "react";

/** Distinguishes a single tap from a double tap on a touch target that
 * needs both to mean different things (pause vs. like). A naive
 * onClick + onDoubleClick pairing fires the single-tap handler on every
 * tap, including the first half of a double tap — this delays the
 * single-tap action just long enough to cancel it if a second tap
 * arrives in time. */
export function useDoubleTap(
  onSingleTap: () => void,
  onDoubleTap: () => void,
  delay = 250,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return function handleTap() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      onDoubleTap();
    } else {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onSingleTap();
      }, delay);
    }
  };
}
