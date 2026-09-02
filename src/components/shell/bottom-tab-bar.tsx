"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, UsersIcon, PlusIcon, CommentIcon, PersonIcon, FlagIcon } from "@/components/ui/icons";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Applied to the icon itself (drop-shadow follows the icon's own
// silhouette, unlike a box-shadow on the flex column around it) so an
// active tab gets a subtle glow without the "glow bleeding past the
// edges of an invisible box" bug the top tab bar's underline had.
const ACTIVE_GLOW = "drop-shadow-[0_0_5px_rgb(255_68_51_/_0.55)]";

export function BottomTabBar({
  username,
  unreadInboxCount,
}: {
  username: string | null;
  unreadInboxCount: number;
}) {
  const pathname = usePathname();
  const profileHref = username ? `/u/${username}` : "/settings/profile";

  const home = isActive(pathname, "/feed");
  const friends = isActive(pathname, "/friends");
  const crews = isActive(pathname, "/crews");
  const inbox = isActive(pathname, "/messages") || isActive(pathname, "/notifications");
  const profile = isActive(pathname, profileHref);

  return (
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-around px-4">
      <Link
        href="/feed"
        aria-label="Home"
        className={`flex flex-col items-center gap-1 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90 ${
          home ? `${ACTIVE_GLOW} text-foreground` : "text-muted"
        }`}
      >
        <HomeIcon className="h-7 w-7" />
        <span className={`text-[11px] ${home ? "font-bold" : "font-medium"}`}>Home</span>
      </Link>

      <Link
        href="/friends"
        aria-label="Friends"
        className={`flex flex-col items-center gap-1 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90 ${
          friends ? `${ACTIVE_GLOW} text-foreground` : "text-muted"
        }`}
      >
        <UsersIcon className="h-7 w-7" />
        <span className={`text-[11px] ${friends ? "font-bold" : "font-medium"}`}>Friends</span>
      </Link>

      <Link
        href="/crews"
        aria-label="Crews"
        className={`flex flex-col items-center gap-1 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90 ${
          crews ? `${ACTIVE_GLOW} text-foreground` : "text-muted"
        }`}
      >
        <FlagIcon className="h-7 w-7" />
        <span className={`text-[11px] ${crews ? "font-bold" : "font-medium"}`}>Crews</span>
      </Link>

      <Link
        href="/feed/new"
        aria-label="New post"
        className="flex h-12 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3),0_0_0_1px_rgb(255_68_51_/_0.4),0_10px_28px_-8px_rgb(255_68_51_/_0.9)] transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90"
      >
        <PlusIcon className="h-7 w-7" strokeWidth={2.5} />
      </Link>

      <Link
        href="/messages"
        aria-label="Inbox"
        className={`relative flex flex-col items-center gap-1 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90 ${
          inbox ? `${ACTIVE_GLOW} text-foreground` : "text-muted"
        }`}
      >
        <CommentIcon className="h-7 w-7" />
        {unreadInboxCount > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground shadow-[0_0_6px_1px_rgb(255_68_51_/_0.7)]">
            {unreadInboxCount > 9 ? "9+" : unreadInboxCount}
          </span>
        )}
        <span className={`text-[11px] ${inbox ? "font-bold" : "font-medium"}`}>Inbox</span>
      </Link>

      <Link
        href={profileHref}
        aria-label="Profile"
        className={`flex flex-col items-center gap-1 transition-transform duration-150 ease-[var(--ease-ios)] active:scale-90 ${
          profile ? `${ACTIVE_GLOW} text-foreground` : "text-muted"
        }`}
      >
        <PersonIcon className="h-7 w-7" />
        <span className={`text-[11px] ${profile ? "font-bold" : "font-medium"}`}>Profile</span>
      </Link>
    </div>
  );
}
