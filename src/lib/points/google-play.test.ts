import { describe, expect, it } from "vitest";
import { checkGooglePurchase } from "./google-play";

const done = { purchaseState: 0, orderId: "GPA.3399-1234-5678-90123", consumptionState: 0 };

describe("checkGooglePurchase", () => {
  it("accepts a completed purchase of a points pack", () => {
    const r = checkGooglePurchase(done, { productId: "points_550", purchaseToken: "tok" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pack.points).toBe(550);
      expect(r.providerRef).toBe("GPA.3399-1234-5678-90123");
      expect(r.test).toBe(false);
    }
  });

  it("refuses a product that isn't a points pack", () => {
    expect(checkGooglePurchase(done, { productId: "something_else", purchaseToken: "tok" }).ok).toBe(false);
  });

  it("refuses a pending or cancelled purchase", () => {
    expect(checkGooglePurchase({ ...done, purchaseState: 2 }, { productId: "points_100", purchaseToken: "tok" }).ok).toBe(false);
    expect(checkGooglePurchase({ ...done, purchaseState: 1 }, { productId: "points_100", purchaseToken: "tok" }).ok).toBe(false);
  });

  it("marks a licence tester's purchase as a test, so it's recorded at no charge", () => {
    const r = checkGooglePurchase({ ...done, purchaseType: 0 }, { productId: "points_100", purchaseToken: "tok" });
    expect(r.ok && r.test).toBe(true);
  });

  it("falls back to a stable reference from the token when there's no order id", () => {
    const a = checkGooglePurchase({ purchaseState: 0 }, { productId: "points_100", purchaseToken: "abc" });
    const b = checkGooglePurchase({ purchaseState: 0 }, { productId: "points_100", purchaseToken: "abc" });
    expect(a.ok && b.ok && a.providerRef === b.providerRef).toBe(true);
    expect(a.ok && a.providerRef.length).toBeLessThanOrEqual(200);
  });
});
