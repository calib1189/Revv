import { describe, expect, it } from "vitest";
import { REFERRAL_POINTS, referralGrants } from "./rewards";

const referral = { referrer_id: "inviter", invitee_id: "friend" };

describe("referralGrants", () => {
  it("pays both people once the friend has a car", () => {
    expect(referralGrants(referral, true)).toEqual([
      { userId: "inviter", sourceId: "friend", amount: REFERRAL_POINTS },
      { userId: "friend", sourceId: "friend", amount: REFERRAL_POINTS },
    ]);
  });

  it("pays nothing before the friend adds a car", () => {
    expect(referralGrants(referral, false)).toEqual([]);
  });

  it("pays nothing without a referral", () => {
    expect(referralGrants(null, true)).toEqual([]);
  });

  it("never pays someone for inviting themselves", () => {
    expect(referralGrants({ referrer_id: "a", invitee_id: "a" }, true)).toEqual([]);
  });

  it("is one instant re-rate each", () => {
    expect(REFERRAL_POINTS).toBe(50);
  });
});
