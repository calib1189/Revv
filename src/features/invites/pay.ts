import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getReferralForInvitee } from "@/lib/db/referrals";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { insertReferralPoints } from "@/lib/db/points";
import { REFERRAL_POINTS, referralGrants } from "@/lib/invites/rewards";
import { sendPushToUser } from "@/lib/push/send";

/**
 * Pays an invite's 50 + 50 points if it has earned them: the invited
 * person has a referral on record and has added a car. Safe to call any
 * number of times (the ledger's unique key); only the first time that
 * actually pays tells the inviter. Server-only: writes with the service
 * role, after checking the referral and the car itself.
 */
export async function payReferralIfEarned(inviteeId: string): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const [referral, cars] = await Promise.all([getReferralForInvitee(admin, inviteeId), listVehiclesByOwner(admin, inviteeId)]);
    const grants = referralGrants(referral, cars.length > 0);
    if (grants.length === 0 || !referral) return;
    const paid = await insertReferralPoints(admin, grants);
    if (paid === 0) return;
    const invitee = await getProfileByUserId(admin, inviteeId).catch(() => null);
    await sendPushToUser(
      referral.referrer_id,
      {
        title: `+${REFERRAL_POINTS} points`,
        body: `@${invitee?.username ?? "Your friend"} added their car, so your invite paid off. They got ${REFERRAL_POINTS} too.`,
        url: "/invite",
      },
      "follows",
    );
  } catch (err) {
    // A reward that fails to pay is retried the next time either trigger
    // runs (naming the inviter, adding a car); never a reason to fail them.
    console.error("Referral reward not paid:", err);
  }
}
