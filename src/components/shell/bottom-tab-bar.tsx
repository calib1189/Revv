"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersIcon, CommentIcon, PersonIcon, FlagIcon } from "@/components/ui/icons";
import { CreateMenu } from "@/components/shell/create-menu";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import { TAB_HREFS } from "@/components/shell/tab-order";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** One tab. Active state is carried by a filled pill behind the icon
 * plus the accent colour — not by a drop-shadow glow, which is what this
 * bar used to do. That approach needed per-icon tuning (FlagIcon's thin
 * multi-stroke silhouette scattered visibly more light than the bulkier
 * ones at identical values, so Crews had its own weaker constant), and a
 * glow is exactly the effect the house style rules out. A pill needs no
 * tuning because it sits behind the icon rather than tracing it. */
function TabItem({
  href,
  label,
  active,
  badge,
  immersive,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  immersive: boolean;
  children: React.ReactNode;
}) {
  const idle = immersive ? "text-white/70" : "text-muted";
  return (
    <Link
      href={href}
      aria-label={badge ? `${label}, ${badge} unread` : label}
      aria-current={active ? "page" : undefined}
      className="group flex w-[4.5rem] flex-col items-center justify-center gap-0.5 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90"
    >
      <span
        className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
          active ? "bg-accent/12 text-accent" : idle
        }`}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span
            className={`absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-accent-foreground ring-2 ${
              immersive ? "ring-black" : "ring-[var(--glass-solid-raised)]"
            }`}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        className={`text-[0.625rem] leading-none transition-colors duration-200 ${
          active ? "font-bold text-accent" : `font-semibold ${idle}`
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

// Feed no longer gets its own icon here — it's the top tab bar's first
// tab (top-tab-bar.tsx) now, and having it in both places was
// redundant once Feed became a real swipeable tab there rather than a
// separate destination.
export function BottomTabBar({
  username,
  unreadInboxCount,
}: {
  username: string | null;
  unreadInboxCount: number;
}) {
  const pathname = usePathname();
  const { activeIndex } = useTabPagerContext();
  const profileHref = username ? `/u/${username}` : "/settings/profile";
  // Same rule as TopTabBar's immersive header: over the full-bleed video
  // feed the bar goes solid black in both themes, the way TikTok's does,
  // rather than a bright light-theme panel sitting on dark video.
  const immersive = activeIndex !== null ? TAB_HREFS[activeIndex] === "/feed" : pathname === "/feed";

  return (
    // data-bottom-nav: slid out of the way while a sheet is up — see
    // useHideBottomNav and its rule in globals.css.
    <nav
      data-bottom-nav
      className={`fixed inset-x-0 bottom-0 z-10 rounded-none pb-[var(--bottom-nav-pad)] ${
        immersive ? "border-t border-white/10 bg-black" : "glass-raised border-x-0 border-b-0"
      }`}
    >
      <div className="mx-auto flex h-[3.25rem] max-w-5xl items-stretch justify-around px-2">
        <TabItem href="/friends" label="Friends" active={isActive(pathname, "/friends")} immersive={immersive}>
          <UsersIcon className="h-5 w-5" />
        </TabItem>

        <TabItem href="/crews" label="Crews" active={isActive(pathname, "/crews")} immersive={immersive}>
          <FlagIcon className="h-5 w-5" />
        </TabItem>

        <CreateMenu />

        <TabItem
          href="/messages"
          label="Inbox"
          active={isActive(pathname, "/messages") || isActive(pathname, "/notifications")}
          badge={unreadInboxCount}
          immersive={immersive}
        >
          <CommentIcon className="h-5 w-5" />
        </TabItem>

        <TabItem href={profileHref} label="Profile" active={isActive(pathname, profileHref)} immersive={immersive}>
          <PersonIcon className="h-5 w-5" />
        </TabItem>
      </div>
    </nav>
  );
}
