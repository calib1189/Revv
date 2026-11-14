import { createClient } from "@/lib/supabase/server";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listAllReferrals, listOwnersWithCars } from "@/lib/db/referrals";
import { inviteLeaders } from "@/lib/invites/tiers";
import { InvitesView } from "@/features/admin/invites-view";

/** Who brings people to SORZA, read from referrals at request time. */
export default async function AdminInvitesPage() {
  const supabase = await createClient();
  const referrals = await listAllReferrals(supabase);
  const withCars = await listOwnersWithCars(
    supabase,
    referrals.map((r) => r.invitee_id),
  );
  const leaders = inviteLeaders(referrals, withCars);

  const recentRows = referrals.slice(0, 100);
  const people = await getProfilesByIds(supabase, [
    ...new Set([...leaders.slice(0, 50).map((l) => l.referrerId), ...recentRows.flatMap((r) => [r.invitee_id, r.referrer_id])]),
  ]);

  return (
    <InvitesView
      leaders={leaders}
      recent={referrals.map((r) => ({
        inviteeId: r.invitee_id,
        referrerId: r.referrer_id,
        createdAt: r.created_at,
        source: r.source,
        hasCar: withCars.has(r.invitee_id),
      }))}
      usernames={Object.fromEntries(people.map((p) => [p.id, p.username]))}
      now={new Date().getTime()}
    />
  );
}
