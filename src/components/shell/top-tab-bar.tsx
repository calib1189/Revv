"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { useTabSwipeNavigation } from "@/components/shell/use-tab-swipe-navigation";
import { navigateWithTransition } from "@/components/shell/navigate-with-transition";

const TABS = [
  { href: "/garage", label: "Garage" },
  { href: "/feed", label: "For You" },
  { href: "/discover", label: "Discover" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/parts", label: "Marketplace" },
] as const;

const TAB_HREFS = TABS.map((t) => t.href);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  useTabSwipeNavigation(TAB_HREFS, pathname);
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
        {/* min-w-0 is load-bearing: a grid item's default min-width is
            `auto` (its content's intrinsic width), not 0, so without this
            the nav can never shrink below fitting all five tabs on one
            line — overflow-x-auto below silently does nothing and the
            header just gets wider than the viewport instead of scrolling.
            This is the actual "too big" bug, not just a sizing tweak. */}
        <nav className="no-scrollbar flex min-w-0 items-center gap-4 overflow-x-auto">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={(e) => {
                  // Only hijack a plain left-click — a modified click
                  // (cmd/ctrl/shift, middle-click) should still open in a
                  // new tab exactly as a real <a href> would.
                  if (
                    active ||
                    e.metaKey ||
                    e.ctrlKey ||
                    e.shiftKey ||
                    e.altKey ||
                    e.button !== 0
                  ) {
                    return;
                  }
                  e.preventDefault();
                  const fromIndex = TAB_HREFS.findIndex((href) => isActive(pathname, href));
                  const toIndex = TAB_HREFS.indexOf(tab.href);
                  const direction = toIndex < fromIndex ? "backward" : "forward";
                  navigateWithTransition(router, tab.href, direction);
                }}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-1 text-[13px] font-semibold transition-colors active:opacity-60 ${
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
