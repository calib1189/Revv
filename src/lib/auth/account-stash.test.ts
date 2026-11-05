import { describe, expect, it } from "vitest";
import {
  MAX_ACCOUNTS,
  canAddAccount,
  parseAccountStash,
  serializeAccountStash,
  stashAccount,
  unstashAccount,
  type StashedAccount,
} from "@/lib/auth/account-stash";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const acct = (n: number, token = `rt-${n}`): StashedAccount => ({ id: id(n), refreshToken: token });

describe("account stash", () => {
  it("round-trips through the cookie format", () => {
    const accounts = [acct(1), acct(2)];
    expect(parseAccountStash(serializeAccountStash(accounts))).toEqual(accounts);
  });

  it("treats a missing or garbage cookie as no accounts", () => {
    expect(parseAccountStash(undefined)).toEqual([]);
    expect(parseAccountStash("")).toEqual([]);
    expect(parseAccountStash("not base64 json!!")).toEqual([]);
    expect(parseAccountStash(Buffer.from('{"id":1}').toString("base64url"))).toEqual([]);
  });

  it("drops malformed entries and duplicates", () => {
    const raw = Buffer.from(
      JSON.stringify([
        acct(1),
        { id: "not-a-uuid", refreshToken: "x" },
        { id: id(2), refreshToken: "" },
        { id: id(3), refreshToken: "x".repeat(600) },
        acct(1, "older"),
        acct(4),
      ]),
    ).toString("base64url");
    expect(parseAccountStash(raw)).toEqual([acct(1), acct(4)]);
  });

  it("never reads back more than fit beside the active account", () => {
    const many = Array.from({ length: 9 }, (_, i) => acct(i + 1));
    expect(parseAccountStash(serializeAccountStash(many))).toHaveLength(MAX_ACCOUNTS - 1);
  });

  it("stashing puts the account first and replaces its stale token", () => {
    expect(stashAccount([acct(1), acct(2, "old")], acct(2, "new"))).toEqual([acct(2, "new"), acct(1)]);
  });

  it("stashing past the cap drops the oldest", () => {
    const full = [acct(1), acct(2), acct(3), acct(4)];
    expect(stashAccount(full, acct(5)).map((a) => a.id)).toEqual([id(5), id(1), id(2), id(3)]);
  });

  it("unstashes by id", () => {
    expect(unstashAccount([acct(1), acct(2)], id(1))).toEqual([acct(2)]);
  });

  it("allows up to five accounts in total", () => {
    expect(canAddAccount([], id(9))).toBe(true);
    expect(canAddAccount([acct(1), acct(2), acct(3)], id(9))).toBe(true);
    expect(canAddAccount([acct(1), acct(2), acct(3), acct(4)], id(9))).toBe(false);
    // The active account showing up in the stash isn't counted twice.
    expect(canAddAccount([acct(1), acct(2), acct(3), acct(9)], id(9))).toBe(true);
  });
});
