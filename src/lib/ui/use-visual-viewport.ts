"use client";

import { useEffect, useState } from "react";

export interface VisualViewportBox {
  /** Where the visible area starts, in layout-viewport pixels. Non-zero
   * when iOS has panned the page up to make room for the keyboard. */
  top: number;
  /** How tall the visible area is — the screen minus the keyboard. */
  height: number;
  /** The full layout height, which the keyboard doesn't change. */
  layoutHeight: number;
}

/** The part of the screen the keyboard isn't covering, kept current while
 * `enabled`. A `position: fixed` element placed at `top`/`height` sits
 * exactly in that visible area — iOS neither shrinks the page nor moves
 * fixed elements for the keyboard, it pans the whole view instead, which
 * is what used to push the comment sheet up under the status bar with the
 * tab bar wedged above the keyboard. Null while disabled, or where the
 * browser has no visualViewport. */
export function useVisualViewportBox(enabled: boolean): VisualViewportBox | null {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      void Promise.resolve().then(() => setBox(null));
      return;
    }
    const update = () =>
      setBox({ top: viewport.offsetTop, height: viewport.height, layoutHeight: window.innerHeight });
    void Promise.resolve().then(update);
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return box;
}
