import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getProfileByUserId, getProfileByUsername } from "@/lib/db/profiles";
import { getReferralForInvitee, insertReferral, type Referral } from "@/lib/db/referrals";
import { canNameInviter, parseInviterInput } from "@/lib/invites/tiers";
import { sendPushToUser } from "@/lib/push/send";

export type RecordInviteResult = { ok: true; inviterUsername: string } | { ok: false; error: string };

/**
 * Records that `inviterInput` (a username, @username or invite link)
 * brought `inviteeId` to SORZA, and pushes the inviter. Checked here for
 * a clear message, and again by RLS (0121): only about yourself, never
 * yourself, only in your first week, only once.
 */
export async function recordInvite(
  supabase: SupabaseClient<Database>,
  inviteeId: string,
  inviterInput: string,
  source: Referral["source"],
): Promise<RecordInviteResult> {
  const username = parseInviterInput(inviterInput);
  if (!username) return { ok: false, error: "Enter the username of the person who invited you." };

  const [invitee, existing, inviter] = await Promise.all([
    getProfileByUserId(supabase, inviteeId),
    getReferralForInvitee(supabase, inviteeId),
    getProfileByUsername(supabase, username),
  ]);
  if (existing) return { ok: false, error: "You've already said who invited you." };
  if (!invitee || !canNameInviter(invitee.created_at, Date.now())) {
    return { ok: false, error: "Only accounts in their first week can add who invited them." };
  }
  if (!inviter) return { ok: false, error: `There's no one on SORZA called @${username}.` };
  if (inviter.id === inviteeId) return { ok: false, error: "You can't invite yourself." };

  const created = await insertReferral(supabase, { invitee_id: inviteeId, referrer_id: inviter.id, source });
  if (!created) return { ok: false, error: "You've already said who invited you." };

  after(() =>
    sendPushToUser(
      inviter.id,
      {
        title: "Your invite worked",
        body: `@${invitee.username} joined SORZA from your invite. It counts once they add their car.`,
        url: `/u/${invitee.username}`,
      },
      "follows",
    ),
  );
  return { ok: true, inviterUsername: inviter.username };
}
