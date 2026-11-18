/** What a successful invite pays: one instant re-rate's worth of points,
 * to the inviter and to the friend they brought. */
export const REFERRAL_POINTS = 50;

export interface ReferralGrant {
  userId: string;
  /** points_ledger.source_id: the invitee's id, for both rows. */
  sourceId: string;
  amount: number;
}

/**
 * The points a referral has earned, or none yet. Paid once the invited
 * person has added a car: the same bar an invite already has to clear to
 * count, so an empty sign-up can't farm points. The ledger's unique key
 * (0125) makes paying the same pair twice a no-op.
 */
export function referralGrants(
  referral: { referrer_id: string; invitee_id: string } | null,
  inviteeHasCar: boolean,
): ReferralGrant[] {
  if (!referral || !inviteeHasCar || referral.referrer_id === referral.invitee_id) return [];
  return [
    { userId: referral.referrer_id, sourceId: referral.invitee_id, amount: REFERRAL_POINTS },
    { userId: referral.invitee_id, sourceId: referral.invitee_id, amount: REFERRAL_POINTS },
  ];
}
