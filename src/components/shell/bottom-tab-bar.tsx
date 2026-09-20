"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersIcon, CommentIcon, PersonIcon, FlagIcon } from "@/components/ui/icons";
import { CreateMenu } from "@/components/shell/create-menu";

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
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={badge ? `${label}, ${badge} unread` : label}
      aria-current={active ? "page" : undefined}
      className="group flex w-[4.5rem] flex-col items-center gap-[3px] pt-1 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90"
    >
      <span
        className={`relative flex h-8 w-[3.25rem] items-center justify-center rounded-full transition-colors duration-200 ${
          active ? "bg-accent/12 text-accent" : "text-muted"
        }`}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-accent-foreground ring-2 ring-[var(--glass-solid-raised)]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        className={`text-[0.625rem] leading-none transition-colors duration-200 ${
          active ? "font-bold text-accent" : "font-semibold text-muted"
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
  const profileHref = username ? `/u/${username}` : "/settings/profile";

  return (
    <div className="mx-auto flex h-16 max-w-5xl items-stretch justify-around px-2">
      <TabItem href="/friends" label="Friends" active={isActive(pathname, "/friends")}>
        <UsersIcon className="h-[1.375rem] w-[1.375rem]" />
      </TabItem>

      <TabItem href="/crews" label="Crews" active={isActive(pathname, "/crews")}>
        <FlagIcon className="h-[1.375rem] w-[1.375rem]" />
      </TabItem>

      <CreateMenu />

      <TabItem
        href="/messages"
        label="Inbox"
        active={isActive(pathname, "/messages") || isActive(pathname, "/notifications")}
        badge={unreadInboxCount}
      >
        <CommentIcon className="h-[1.375rem] w-[1.375rem]" />
      </TabItem>

      <TabItem href={profileHref} label="Profile" active={isActive(pathname, profileHref)}>
        <PersonIcon className="h-[1.375rem] w-[1.375rem]" />
      </TabItem>
    </div>
  );
}
