import { describe, expect, it } from "vitest";
import { joinsApprovalQueue, newCarPush } from "@/lib/admin/notify-new-car";

describe("joinsApprovalQueue", () => {
  it("is true only when an unreviewed car gets its first photo", () => {
    expect(joinsApprovalQueue({ hadPhoto: false, hasPhoto: true, status: "none" })).toBe(true);
    expect(joinsApprovalQueue({ hadPhoto: false, hasPhoto: true, status: "pending" })).toBe(true);
  });

  it("stays quiet for a photo swap, a car with no photo, or one already reviewed", () => {
    expect(joinsApprovalQueue({ hadPhoto: true, hasPhoto: true, status: "none" })).toBe(false);
    expect(joinsApprovalQueue({ hadPhoto: false, hasPhoto: false, status: "none" })).toBe(false);
    expect(joinsApprovalQueue({ hadPhoto: false, hasPhoto: true, status: "approved" })).toBe(false);
    expect(joinsApprovalQueue({ hadPhoto: false, hasPhoto: true, status: "rejected" })).toBe(false);
  });
});

describe("newCarPush", () => {
  it("names the owner and the car and opens the approval queue", () => {
    expect(newCarPush({ year: 2019, make: "BMW", model: "M3" }, "s55")).toEqual({
      title: "New car to approve",
      body: "@s55 added 2019 BMW M3",
      url: "/admin/verifications",
    });
    expect(newCarPush({ year: null, make: null, model: null }, null).body).toBe("Someone added a car");
  });
});
