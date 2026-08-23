"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersIcon, PlusIcon, CommentIcon, PersonIcon } from "@/components/ui/icons";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-around px-4">
      <Link
        href="/friends"
        aria-label="Friends"
        className={`flex flex-col items-center gap-0.5 ${
          isActive(pathname, "/friends") ? "text-foreground" : "text-muted"
        }`}
      >
        <UsersIcon className="h-6 w-6" />
      </Link>

      <Link
        href="/feed/new"
        aria-label="New post"
        className="flex h-11 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.25),0_8px_24px_-10px_rgb(255_68_51_/_0.55)]"
      >
        <PlusIcon className="h-6 w-6" />
      </Link>

      <Link
        href="/messages"
        aria-label="Inbox"
        className={`relative flex flex-col items-center gap-0.5 ${
          isActive(pathname, "/messages") || isActive(pathname, "/notifications")
            ? "text-foreground"
            : "text-muted"
        }`}
      >
        <CommentIcon className="h-6 w-6" />
        {unreadInboxCount > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
            {unreadInboxCount > 9 ? "9+" : unreadInboxCount}
          </span>
        )}
      </Link>

      <Link
        href={profileHref}
        aria-label="Profile"
        className={`flex flex-col items-center gap-0.5 ${
          isActive(pathname, profileHref) ? "text-foreground" : "text-muted"
        }`}
      >
        <PersonIcon className="h-6 w-6" />
      </Link>
    </div>
  );
}
