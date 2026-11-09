import { describe, expect, it } from "vitest";
import { validateUsername, isPlaceholderUsername, suggestUsernameBases, usernameCandidates } from "./username";

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    expect(validateUsername("turbo_dan_92")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validateUsername("")).toMatch(/required/i);
  });

  it("rejects uppercase letters", () => {
    expect(validateUsername("TurboDan")).toMatch(/lowercase/i);
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(validateUsername("ab")).toMatch(/3-24/);
  });

  it("rejects usernames longer than 24 characters", () => {
    expect(validateUsername("a".repeat(25))).toMatch(/3-24/);
  });

  it("rejects disallowed characters", () => {
    expect(validateUsername("turbo-dan")).toMatch(/3-24/);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateUsername("  turbo_dan  ")).toBeNull();
  });

  it("keeps names that would pass for SORZA or its staff", () => {
    expect(validateUsername("sorza")).toMatch(/reserved/i);
    expect(validateUsername("support")).toMatch(/reserved/i);
    expect(validateUsername("admin")).toMatch(/reserved/i);
  });

  it("still allows a name that only contains a reserved word", () => {
    expect(validateUsername("sorza_fan_92")).toBeNull();
  });
});

describe("isPlaceholderUsername", () => {
  it("matches the name the signup trigger gives OAuth accounts", () => {
    expect(isPlaceholderUsername("user_a1b2c3d4")).toBe(true);
  });

  it("doesn't match names people chose", () => {
    expect(isPlaceholderUsername("user_dan")).toBe(false);
    expect(isPlaceholderUsername("turbo_dan")).toBe(false);
    expect(isPlaceholderUsername("user_a1b2c3d4e")).toBe(false);
  });
});

describe("suggestUsernameBases", () => {
  it("builds one from the person's name first, then their email", () => {
    expect(suggestUsernameBases({ fullName: "Dan O'Brien", email: "d.obrien92+cars@gmail.com" })).toEqual([
      "dan_obrien",
      "d_obrien92",
    ]);
  });

  it("drops accents and odd characters", () => {
    expect(suggestUsernameBases({ fullName: "José Núñez", email: null })).toEqual(["jose_nunez"]);
  });

  it("never suggests from an Apple private-relay address", () => {
    expect(suggestUsernameBases({ fullName: null, email: "x7k2pq9z@privaterelay.appleid.com" })).toEqual([]);
  });

  it("skips anything too short, reserved or shaped like a placeholder", () => {
    expect(suggestUsernameBases({ fullName: "Al", email: "support@sorza.net" })).toEqual([]);
    expect(suggestUsernameBases({ fullName: null, email: "user_a1b2c3d4@x.com" })).toEqual([]);
  });

  it("cuts long names to the 24-character limit without a trailing underscore", () => {
    const [first] = suggestUsernameBases({ fullName: "Maximilian Alexander Featherstonehaugh", email: null });
    expect(first.length).toBeLessThanOrEqual(24);
    expect(first.endsWith("_")).toBe(false);
    expect(first.startsWith("maximilian_alexander")).toBe(true);
  });

  it("removes duplicates", () => {
    expect(suggestUsernameBases({ fullName: "Calib", email: "calib@gmail.com" })).toEqual(["calib"]);
  });
});

describe("usernameCandidates", () => {
  it("tries each base, then numbered versions that still fit", () => {
    const list = usernameCandidates(["calib"]);
    expect(list.slice(0, 3)).toEqual(["calib", "calib2", "calib3"]);
    expect(list).toContain("calib9");
    for (const name of usernameCandidates(["a".repeat(24)])) expect(name.length).toBeLessThanOrEqual(24);
  });
});
