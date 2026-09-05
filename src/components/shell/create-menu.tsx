"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, WheelIcon, CameraIcon, TimerIcon, FlagIcon, CloseIcon } from "@/components/ui/icons";

const ITEMS = [
  { href: "/garage/new", label: "Add Vehicle", subtitle: "Bring a car into your garage", icon: WheelIcon },
  { href: "/feed/new", label: "Post", subtitle: "Share a photo or video", icon: CameraIcon },
  { href: "/discover", label: "Create Meet", subtitle: "Plan a car meet", icon: TimerIcon },
  { href: "/crews/new", label: "Create Crew", subtitle: "Start a community", icon: FlagIcon },
] as const;

/** The "+" button's SORZA-specific creation hub — every real thing this
 * app lets you make, not just "compose a post" the way a general social
 * app's plus button would. Deliberately doesn't include a shop listing:
 * SORZA's shops come from an external places directory (you can promote
 * an existing one, see features/shops/promote-this-shop.tsx), there's no
 * "create a shop" flow to link to. */
export function CreateMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Create"
        onClick={() => setIsOpen(true)}
        className="flex h-12 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3),0_0_0_1px_rgb(255_68_51_/_0.4),0_10px_28px_-8px_rgb(255_68_51_/_0.9)] transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90"
      >
        <PlusIcon className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="glass-raised relative z-10 w-full max-w-lg rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {ITEMS.map(({ href, label, subtitle, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl p-3 transition-colors hover:bg-white/[0.06]"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block truncate text-xs text-muted">{subtitle}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
