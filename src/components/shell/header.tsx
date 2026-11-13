import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUnreadNotificationCount } from "@/lib/db/notifications";
import { listConversationsForUser } from "@/lib/db/conversations";
import { getUnreadMessageCount } from "@/lib/db/messages";
import { TopTabBar } from "@/components/shell/top-tab-bar";
import { BottomTabBar } from "@/components/shell/bottom-tab-bar";
import { Button } from "@/components/ui/button";

export async function Header() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <header className="glass-raised sticky top-0 z-10 isolate rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)] will-change-transform">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label="SORZA">
            <Image src="/logo-mark.png" alt="" width={32} height={32} priority />
          </Link>
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
        </div>
      </header>
    );
  }

  const supabase = await createClient();
  // All at once: this header renders on every full page load, so each
  // query that waits on another adds a round trip to app launch.
  // The message count degrades to 0 if messaging isn't set up, instead
  // of taking down every page's nav.
  const [profile, notificationCount, messageCount] = await Promise.all([
    getProfileByUserId(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
    listConversationsForUser(supabase, user.id)
      .then((conversations) =>
        getUnreadMessageCount(
          supabase,
          conversations.map((c) => c.id),
          user.id,
        ),
      )
      .catch(() => 0),
  ]);
  const username = profile?.username ?? null;

  return (
    <>
      <TopTabBar unreadNotificationCount={notificationCount} />
      {/* data-bottom-nav: slid out of the way while a sheet is up — see
          useHideBottomNav and its rule in globals.css. */}
      <nav
        data-bottom-nav
        className="glass-raised fixed inset-x-0 bottom-0 z-10 rounded-none border-x-0 border-b-0 pb-[var(--bottom-nav-pad)]"
      >
        <BottomTabBar username={username} unreadInboxCount={messageCount + notificationCount} />
      </nav>
    </>
  );
}
