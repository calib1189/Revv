import { describe, expect, it } from "vitest";
import { validateMeetup } from "./meetup";

describe("validateMeetup", () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  it("accepts valid fields", () => {
    expect(
      validateMeetup({ title: "Cars & Coffee", locationName: "Main St", startsAt: future }),
    ).toBeNull();
  });

  it("rejects an empty title", () => {
    expect(
      validateMeetup({ title: "  ", locationName: "Main St", startsAt: future }),
    ).toBe("Give it a title.");
  });

  it("rejects an empty location", () => {
    expect(
      validateMeetup({ title: "Cars & Coffee", locationName: " ", startsAt: future }),
    ).toBe("Add a location.");
  });

  it("rejects a missing start time", () => {
    expect(
      validateMeetup({ title: "Cars & Coffee", locationName: "Main St", startsAt: "" }),
    ).toBe("Pick a date and time.");
  });

  it("rejects an invalid date string", () => {
    expect(
      validateMeetup({ title: "Cars & Coffee", locationName: "Main St", startsAt: "not-a-date" }),
    ).toBe("That date and time isn't valid.");
  });

  it("rejects a time well in the past", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(
      validateMeetup({ title: "Cars & Coffee", locationName: "Main St", startsAt: past }),
    ).toBe("Pick a time that hasn't already passed.");
  });

  it("allows a start time a few minutes in the past (clock skew grace)", () => {
    const justPast = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(
      validateMeetup({ title: "Cars & Coffee", locationName: "Main St", startsAt: justPast }),
    ).toBeNull();
  });
});
