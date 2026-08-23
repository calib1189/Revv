import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUnreadNotificationCount } from "@/lib/db/notifications";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { BellIcon, BookmarkIcon } from "@/components/ui/icons";

export async function Header() {
  const user = await getCurrentUser();
  let username: string | null = null;
  let unreadCount = 0;

  if (user) {
    const supabase = await createClient();
    const [profile, count] = await Promise.all([
      getProfileByUserId(supabase, user.id),
      getUnreadNotificationCount(supabase, user.id),
    ]);
    username = profile?.username ?? null;
    unreadCount = count;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          REVV
        </Link>

        {user ? (
          <div className="flex items-center gap-3 sm:gap-4">
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
