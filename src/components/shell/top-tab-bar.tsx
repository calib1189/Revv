"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";

const TABS = [
  { href: "/garage", label: "Garage" },
  { href: "/feed", label: "For You" },
  { href: "/discover", label: "Discover" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopTabBar() {
  const pathname = usePathname();

  return (
    <div className="mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4">
      <span />
      <nav className="no-scrollbar flex items-center gap-5 overflow-x-auto">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors ${
                active
                  ? "border-accent text-foreground"
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
        className="flex-shrink-0 justify-self-end text-muted hover:text-foreground"
      >
        <SearchIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}
