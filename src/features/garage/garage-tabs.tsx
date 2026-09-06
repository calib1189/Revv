"use client";

import { useState, type ReactNode } from "react";
import { WheelIcon, GemIcon } from "@/components/ui/icons";

type Tab = "cars" | "shop";

/** Same simple glass-pill tab-button language as CrewTabs — this page
 * only ever has two tabs, so it doesn't need profile-tabs.tsx's
 * sliding-highlight measurement machinery. Both panels are handed in
 * as already-rendered nodes (the cars panel is server-rendered, the
 * shop panel is its own client island) rather than fetched here, so
 * switching tabs never re-fetches anything. */
export function GarageTabs({ carsPanel, shopPanel }: { carsPanel: ReactNode; shopPanel: ReactNode }) {
  const [tab, setTab] = useState<Tab>("cars");

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("cars")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
            tab === "cars" ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
          }`}
        >
          <WheelIcon className="h-4 w-4" />
          My Cars
        </button>
        <button
          type="button"
          onClick={() => setTab("shop")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
            tab === "shop" ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
          }`}
        >
          <GemIcon className="h-4 w-4" />
          Shop
        </button>
      </div>

      <div className={tab === "cars" ? "" : "hidden"}>{carsPanel}</div>
      <div className={tab === "shop" ? "" : "hidden"}>{shopPanel}</div>
    </div>
  );
}
