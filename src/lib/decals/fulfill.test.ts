import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({}) }));
const { recipientFromSession } = await import("@/lib/decals/fulfill");

const address = { line1: "12 Main St", line2: "Apt 4", city: "Austin", state: "TX", postal_code: "78701", country: "US" };

describe("recipientFromSession", () => {
  it("reads Stripe's newer collected_information shape", () => {
    expect(
      recipientFromSession({
        collected_information: { shipping_details: { name: "Sam Builder", address } },
        customer_details: { email: "sam@example.com" },
      }),
    ).toEqual({
      name: "Sam Builder",
      address1: "12 Main St",
      address2: "Apt 4",
      city: "Austin",
      stateCode: "TX",
      zip: "78701",
      countryCode: "US",
      email: "sam@example.com",
    });
  });

  it("falls back to the older shipping_details shape", () => {
    expect(recipientFromSession({ shipping_details: { name: "Sam", address: { ...address, line2: null } } })).toMatchObject({
      name: "Sam",
      address2: null,
      email: null,
    });
  });

  it("refuses an incomplete address instead of guessing", () => {
    expect(recipientFromSession({ shipping_details: { name: "Sam", address: { ...address, postal_code: null } } })).toBeNull();
    expect(recipientFromSession({})).toBeNull();
  });
});
