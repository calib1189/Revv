"use client";

import { useEffect, type ReactNode } from "react";
import { MY_ROW_HASH, MY_ROW_ID } from "@/lib/leaderboard/my-row";

const FLASH_MS = 1600;

/** Brings the viewer's own place on the board into view and flashes it
 * once, so the eye lands on it. */
function revealMyPlace() {
  const place = document.getElementById(MY_ROW_ID);
  if (!place) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  place.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center", inline: "nearest" });
  place.classList.remove("place-flash");
  // Restart the animation if it's tapped again mid-flash.
  void place.offsetWidth;
  place.classList.add("place-flash");
  window.setTimeout(() => place.classList.remove("place-flash"), FLASH_MS);
}

/** "Your position": tapping it takes you to your place on the board. */
export function JumpToMeButton({ className, children }: { className: string; children: ReactNode }) {
  return (
    <button type="button" onClick={revealMyPlace} className={className} aria-label="Show my place on the board">
      {children}
    </button>
  );
}

/** Arriving at /leaderboard#me (the "you got passed" push) lands on your
 * place rather than the top of the board. */
export function RevealMyPlaceOnArrival() {
  useEffect(() => {
    if (window.location.hash !== MY_ROW_HASH) return;
    // After the page's own entrance animation has laid things out.
    const timer = window.setTimeout(revealMyPlace, 450);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
