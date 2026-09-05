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
import logo from "@/app/icon.png";

export async function Header() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <header className="glass-raised sticky top-0 z-10 rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label="SORZA">
            <Image src={logo} alt="" width={32} height={32} className="rounded-md" priority />
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
  const [profile, notificationCount] = await Promise.all([
    getProfileByUserId(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
  ]);
  const username = profile?.username ?? null;

  // Degrade gracefully if the messaging migration hasn't been applied yet
  // — a missing table here shouldn't take down every page's nav.
  let messageCount = 0;
  try {
    const conversations = await listConversationsForUser(supabase, user.id);
    messageCount = await getUnreadMessageCount(
      supabase,
      conversations.map((c) => c.id),
      user.id,
    );
  } catch {
    messageCount = 0;
  }

  return (
    <>
      <TopTabBar unreadNotificationCount={notificationCount} />
      <nav className="glass-raised fixed inset-x-0 bottom-0 z-10 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
        <BottomTabBar username={username} unreadInboxCount={messageCount + notificationCount} />
      </nav>
    </>
  );
}
