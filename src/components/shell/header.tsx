import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUnreadNotificationCount } from "@/lib/db/notifications";
import { listConversationsForUser } from "@/lib/db/conversations";
import { getUnreadMessageCount } from "@/lib/db/messages";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { BellIcon, BookmarkIcon, CompassIcon, CommentIcon } from "@/components/ui/icons";
import logo from "@/app/icon.png";

export async function Header() {
  const user = await getCurrentUser();
  let username: string | null = null;
  let isAdmin = false;
  let unreadCount = 0;
  let unreadMessageCount = 0;

  if (user) {
    const supabase = await createClient();
    const [profile, count] = await Promise.all([
      getProfileByUserId(supabase, user.id),
      getUnreadNotificationCount(supabase, user.id),
    ]);
    username = profile?.username ?? null;
    isAdmin = profile?.is_admin ?? false;
    unreadCount = count;

    // Degrade gracefully if the messaging migration hasn't been applied
    // yet — a missing table here shouldn't take down every page's header.
    try {
      const conversations = await listConversationsForUser(supabase, user.id);
      unreadMessageCount = await getUnreadMessageCount(
        supabase,
        conversations.map((c) => c.id),
        user.id,
      );
    } catch {
      unreadMessageCount = 0;
    }
  }

  return (
    <header className="glass-raised sticky top-0 z-10 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="REVV">
            <Image src={logo} alt="" width={32} height={32} className="rounded-md" priority />
          </Link>
          <Link
            href="/discover"
            aria-label="Discover"
            className="text-muted hover:text-foreground"
          >
            <CompassIcon className="h-5 w-5" />
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/feed"
              className="text-sm font-medium text-foreground hover:text-muted"
            >
              Feed
            </Link>
            <Link
              href="/garage"
              className="text-sm font-medium text-foreground hover:text-muted"
            >
              Garage
            </Link>
            <Link
              href="/saved"
              aria-label="Saved posts"
              className="text-muted hover:text-foreground"
            >
              <BookmarkIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/messages"
              aria-label="Messages"
              className="relative text-muted hover:text-foreground"
            >
              <CommentIcon className="h-5 w-5" />
              {unreadMessageCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative text-muted hover:text-foreground"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                href="/admin/reports"
                className="hidden text-sm font-medium text-accent hover:underline sm:inline"
              >
                Admin
              </Link>
            )}
            {username ? (
              <Link
                href={`/u/${username}`}
                className="hidden text-sm text-muted hover:text-foreground sm:inline"
              >
                @{username}
              </Link>
            ) : (
              <span className="hidden text-sm text-muted sm:inline">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="px-3 py-1.5 text-sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="px-3 py-1.5 text-sm">Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
