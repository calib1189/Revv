import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/db/profiles";
import { getReferralForInvitee } from "@/lib/db/referrals";
import { getProfilesByIds } from "@/lib/db/profiles";
import { INVITE_COOKIE, canNameInviter } from "@/lib/invites/tiers";
import { recordInvite } from "@/features/invites/record";
import { InvitedBy, NameInviterForm } from "@/features/invites/name-inviter-form";

/**
 * Who invited this person. Credits the invite link they opened (the
 * cookie /join sets) the first time they land here; otherwise asks,
 * while the account is in its first week. Renders nothing once that
 * window has closed with no inviter, or if invites aren't migrated yet.
 */
export async function InviterSection({
  supabase,
  profile,
  now,
}: {
  supabase: SupabaseClient<Database>;
  profile: Profile;
  now: number;
}) {
  let referral;
  try {
    referral = await getReferralForInvitee(supabase, profile.id);
  } catch {
    return null;
  }

  if (referral) {
    const [inviter] = await getProfilesByIds(supabase, [referral.referrer_id]).catch(() => []);
    return inviter ? <InvitedBy username={inviter.username} /> : null;
  }
  if (!canNameInviter(profile.created_at, now)) return null;

  const fromLink = (await cookies()).get(INVITE_COOKIE)?.value ?? "";
  if (fromLink) {
    const result = await recordInvite(supabase, profile.id, fromLink, "link").catch(() => null);
    if (result?.ok) return <InvitedBy username={result.inviterUsername} />;
  }
  return <NameInviterForm defaultValue={fromLink ? `@${fromLink}` : ""} />;
}
