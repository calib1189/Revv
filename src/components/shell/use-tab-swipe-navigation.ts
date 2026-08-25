"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const SWIPE_THRESHOLD_PX = 70;
/** How close to the screen edge a swipe has to start to count as a
 * tab-switch gesture — deliberately thin (matches the width iOS itself
 * uses for its edge-swipe-back gesture). For You and Discover are
 * full-bleed vertical video feeds with their own horizontal swipe for
 * multi-photo posts (swipe-slide.tsx's own snap-x carousel) — a
 * swipe-anywhere gesture here would fight that. Starting only right at
 * the edge, where a deliberate in-content photo swipe essentially never
 * begins, keeps both gestures usable without the constant double-swipe
 * feel a wider zone would cause. */
export const EDGE_ZONE_PX = 20;

/** Pure decision logic, kept separate from the pointer-event plumbing so
 * it's actually testable — jsdom has no real touch/pointer gesture
 * simulation in this project's test setup, but "given this displacement
 * and this tab list, which tab (if any) should I navigate to" has
 * nothing to do with the DOM and can be verified directly. */
export function resolveSwipeTarget(
  currentHref: string,
  dx: number,
  dy: number,
  tabHrefs: readonly string[],
): string | null {
  const currentIndex = tabHrefs.indexOf(currentHref);
  if (currentIndex === -1) return null;
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return null;
  // Requires the gesture to be meaningfully more horizontal than
  // vertical, so a diagonal or mostly-vertical drag (e.g. the vertical
  // feed's own scroll) never gets misread as a tab switch.
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return null;

  if (dx < 0) {
    return currentIndex < tabHrefs.length - 1 ? tabHrefs[currentIndex + 1] : null;
  }
  return currentIndex > 0 ? tabHrefs[currentIndex - 1] : null;
}

/** Swipe-from-the-edge navigation between the top-level tabs (Garage,
 * For You, Discover, Leaderboard, Marketplace) — only active when the
 * current page is exactly one of those tab pages (not a sub-page like a
 * specific vehicle or build), so it never hijacks an edge touch on a
 * page that isn't part of this tab set. */
export function useTabSwipeNavigation(tabHrefs: readonly string[], pathname: string) {
  const router = useRouter();

  useEffect(() => {
    if (!tabHrefs.includes(pathname)) return;

    let start: { x: number; y: number } | null = null;

    function onPointerDown(e: PointerEvent) {
      const nearLeftEdge = e.clientX <= EDGE_ZONE_PX;
      const nearRightEdge = e.clientX >= window.innerWidth - EDGE_ZONE_PX;
      if (!nearLeftEdge && !nearRightEdge) return;
      start = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp(e: PointerEvent) {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      const target = resolveSwipeTarget(pathname, dx, dy, tabHrefs);
      if (target) router.push(target);
    }

    function onPointerCancel() {
      start = null;
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [tabHrefs, pathname, router]);
}
