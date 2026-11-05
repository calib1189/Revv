/**
 * The other accounts signed in on this device, for the account switcher.
 *
 * Supabase only keeps one session in its own cookies: the active
 * account's. Every other signed-in account is kept here as its user id
 * plus a refresh token, the one thing needed to resume that session
 * later without a password. The cookie holding it is httpOnly (see
 * account-switching.ts), so page scripts can never read these tokens.
 *
 * Pure functions only, so the rules are testable without cookies.
 */

export interface StashedAccount {
  id: string;
  refreshToken: string;
}

/** Accounts on one device, counting the active one, the same cap
 * Instagram uses. Also keeps the cookie well under the 4 KB limit. */
export const MAX_ACCOUNTS = 5;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TOKEN_LENGTH = 512;

function isStashedAccount(value: unknown): value is StashedAccount {
  if (typeof value !== "object" || value === null) return false;
  const { id, refreshToken } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    UUID.test(id) &&
    typeof refreshToken === "string" &&
    refreshToken.length > 0 &&
    refreshToken.length <= MAX_TOKEN_LENGTH
  );
}

/** Never throws: a cookie that's missing, tampered with or from an older
 * format just means "no other accounts". */
export function parseAccountStash(raw: string | undefined): StashedAccount[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const accounts: StashedAccount[] = [];
    for (const entry of parsed) {
      if (!isStashedAccount(entry) || seen.has(entry.id)) continue;
      seen.add(entry.id);
      accounts.push({ id: entry.id, refreshToken: entry.refreshToken });
      if (accounts.length === MAX_ACCOUNTS - 1) break;
    }
    return accounts;
  } catch {
    return [];
  }
}

export function serializeAccountStash(accounts: StashedAccount[]): string {
  return Buffer.from(JSON.stringify(accounts), "utf8").toString("base64url");
}

/** Puts `account` at the front, replacing any older entry for the same
 * user (its token is stale once a newer one exists). */
export function stashAccount(accounts: StashedAccount[], account: StashedAccount): StashedAccount[] {
  return [account, ...accounts.filter((a) => a.id !== account.id)].slice(0, MAX_ACCOUNTS - 1);
}

export function unstashAccount(accounts: StashedAccount[], id: string): StashedAccount[] {
  return accounts.filter((a) => a.id !== id);
}

/** Whether one more account fits, with `activeId` signed in as well. */
export function canAddAccount(accounts: StashedAccount[], activeId: string | null): boolean {
  const others = accounts.filter((a) => a.id !== activeId).length;
  return others + (activeId ? 1 : 0) < MAX_ACCOUNTS;
}
