"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";
import { BattleResultReveal } from "@/features/battles/battle-result-reveal";
import type { BattleView } from "@/lib/battles/load";

/** Marks today's battle slide in the feed, so "Next battle" can scroll to it. */
export const BATTLE_SLIDE_ATTR = "data-battle-slide";

/** Yesterday's Build Battle result as a feed slide: the reveal plays when
 * it's scrolled to, and "Next battle" goes on to today's battle, in the
 * feed when it's there, or its page when it isn't (already voted). */
export function BattleResultSlide({
  view,
  isAuthenticated,
  slideHeight,
}: {
  view: BattleView;
  isAuthenticated: boolean;
  slideHeight: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  function next() {
    const feed = ref.current?.parentElement?.closest(".snap-y") ?? document;
    const today = feed.querySelector<HTMLElement>(`[${BATTLE_SLIDE_ATTR}]`);
    if (today) today.scrollIntoView({ behavior: "smooth", block: "start" });
    else router.push("/battle");
  }

  return (
    <div ref={ref} className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}>
      <BattleResultReveal
        view={view}
        isAuthenticated={isAuthenticated}
        height="100%"
        insetTop={`calc(${HEADER_HEIGHT} + 2.75rem)`}
        insetBottom="var(--bottom-nav-h)"
        onNext={next}
      />
    </div>
  );
}
