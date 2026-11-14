import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId, getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listOwnersWithCars, listReferralsByReferrer } from "@/lib/db/referrals";
import { InviteView, type InviteeRow } from "@/features/invites/invite-view";
import { InviterSection } from "@/features/invites/inviter-section";

/** Invite friends. Counts are read from referrals and vehicles at request
 * time, never stored. */
export default async function InvitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/invite");

  const supabase = await createClient();
  const [profile, referrals] = await Promise.all([
    getProfileByUserId(supabase, user.id),
    listReferralsByReferrer(supabase, user.id),
  ]);
  if (!profile) redirect("/login?next=/invite");

  const inviteeIds = referrals.map((r) => r.invitee_id);
  const [invitees, withCars] = await Promise.all([
    getProfilesByIds(supabase, inviteeIds),
    listOwnersWithCars(supabase, inviteeIds),
  ]);
  const avatars = await getMediaByIds(
    supabase,
    invitees.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const avatarUrlById = new Map(avatars.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const inviteeById = new Map(invitees.map((p) => [p.id, p]));

  const rows: InviteeRow[] = referrals.flatMap((r) => {
    const invitee = inviteeById.get(r.invitee_id);
    if (!invitee) return [];
    return [
      {
        id: invitee.id,
        username: invitee.username,
        avatarUrl: invitee.avatar_media_id ? (avatarUrlById.get(invitee.avatar_media_id) ?? null) : null,
        joinedAt: r.created_at,
        counts: withCars.has(invitee.id),
      },
    ];
  });
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  return (
    <InviteView
      username={profile.username}
      invitees={rows}
      inviterSlot={<InviterSection supabase={supabase} profile={profile} now={now} />}
    />
  );
}
