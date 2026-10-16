import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listBlockedUserIds } from "@/lib/db/blocks";
import { getProfilesByIds } from "@/lib/db/profiles";
import { BlockedUserRow } from "@/features/profile/blocked-user-row";
import { PageHeader, PageShell } from "@/components/ui/page-header";

export const metadata = { title: "Blocked accounts — SORZA" };

export default async function BlockedAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/blocked");

  const supabase = await createClient();
  const blockedIds = await listBlockedUserIds(supabase, user.id);
  const profiles = await getProfilesByIds(supabase, blockedIds);

  return (
    <PageShell>
      <PageHeader
        title="Blocked accounts"
        back={{ href: "/settings", label: "Settings" }}
        description="You don't see their posts, and they can't follow or message you. Unblock anyone to bring them back."
      />
      {profiles.length === 0 ? (
        <div className="glass-raised elev-1 rounded-[22px] px-6 py-10 text-center">
          <p className="font-medium">No blocked accounts</p>
          <p className="mt-1 text-sm text-muted">
            Press and hold a post, or use the ... menu on a profile, to block someone.
          </p>
        </div>
      ) : (
        <ul className="glass-raised elev-1 divide-y divide-border overflow-hidden rounded-[22px]">
          {profiles.map((profile) => (
            <BlockedUserRow
              key={profile.id}
              userId={profile.id}
              username={profile.username}
              displayName={profile.display_name}
            />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
