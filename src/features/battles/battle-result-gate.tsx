"use client";

import { useEffect, useState } from "react";
import { BattleResultReveal } from "@/features/battles/battle-result-reveal";
import { useHideBottomNav } from "@/lib/ui/use-hide-bottom-nav";
import type { BattleView } from "@/lib/battles/load";

const LEAVE_MS = 500;

/** On the battle page, the first visit after a battle ends opens on its
 * result, full screen, before today's matchup. "Next battle" lifts it
 * away to reveal today's. */
export function BattleResultGate({ view, isAuthenticated }: { view: BattleView; isAuthenticated: boolean }) {
  const [state, setState] = useState<"open" | "leaving" | "gone">("open");
  useHideBottomNav(state === "open");
  useEffect(() => {
    if (state !== "leaving") return;
    const t = setTimeout(() => setState("gone"), LEAVE_MS);
    return () => clearTimeout(t);
  }, [state]);

  if (state === "gone") return null;
  return (
    <div
      className={`fixed inset-0 z-[70] transition-[opacity,transform] duration-500 ease-[var(--ease-ios)] ${
        state === "leaving" ? "pointer-events-none -translate-y-6 opacity-0" : "animate-fade-in"
      }`}
    >
      <BattleResultReveal
        view={view}
        isAuthenticated={isAuthenticated}
        height="100dvh"
        insetTop="env(safe-area-inset-top)"
        insetBottom="env(safe-area-inset-bottom)"
        onNext={() => setState("leaving")}
        nextLabel="Today's battle"
      />
    </div>
  );
}
