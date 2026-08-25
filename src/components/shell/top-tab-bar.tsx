"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";

const TABS = [
  { href: "/garage", label: "Garage" },
  { href: "/feed", label: "For You" },
  { href: "/discover", label: "Discover" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/parts", label: "Shop" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopTabBar() {
  const pathname = usePathname();
  // For You is a full-bleed vertical video feed — the bar floats over the
  // video (text only, no background) instead of sitting above it, so the
  // video can run edge to edge behind it.
  const isImmersive = pathname === "/feed";

  return (
    <header
      className={`sticky top-0 z-10 rounded-none pt-[env(safe-area-inset-top)] ${
        isImmersive ? "border-none bg-transparent" : "glass-raised border-x-0 border-t-0"
      }`}
    >
      <div className="mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4">
        <span />
        <nav className="no-scrollbar flex items-center gap-5 overflow-x-auto">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors active:opacity-60 ${
                  isImmersive ? "[text-shadow:0_1px_4px_rgb(0_0_0_/_0.7)]" : ""
                } ${
                  active
                    ? "border-accent text-foreground"
                    : isImmersive
                      ? "border-transparent text-white/85 hover:text-white"
                      : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/search"
          aria-label="Search"
          className={`flex-shrink-0 justify-self-end ${
            isImmersive
              ? "text-white/85 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.7))] hover:text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          <SearchIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
