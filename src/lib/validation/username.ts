// Mirrors the `username_format` check constraint on profiles
// (supabase/migrations/0001_init.sql) — keep these in sync.
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

/** Names that would read as SORZA itself or its staff speaking. Checked
 * at signup and on every change, so nobody can become "@sorza" or
 * "@support" — existing accounts are unaffected until they try to change
 * to one. */
const RESERVED_USERNAMES = new Set([
  "sorza",
  "sorza_official",
  "sorza_support",
  "sorza_team",
  "official",
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "support",
  "help",
  "team",
  "system",
  "root",
]);

export function validateUsername(input: string): string | null {
  const value = input.trim();

  if (value.length === 0) return "Username is required.";
  if (value !== value.toLowerCase())
    return "Username must be lowercase.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Username must be 3-24 characters: lowercase letters, numbers, underscores only.";
  }
  if (RESERVED_USERNAMES.has(value)) return "That username is reserved.";
  return null;
}

/** The name the auth.users signup trigger gives an account that didn't
 * pick one (Google and Apple never ask), e.g. "user_a1b2c3d4". */
const PLACEHOLDER_PATTERN = /^user_[0-9a-f]{8}$/;

export function isPlaceholderUsername(username: string): boolean {
  return PLACEHOLDER_PATTERN.test(username);
}

/** Turns free text into username characters: no accents, lowercase,
 * anything else becomes one underscore, none at either end. */
function toUsernameShape(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24)
    .replace(/_+$/, "");
}

/** Starting points for the "pick your username" field: the name Google
 * or Apple shared, then the part of their email before the @ (minus any
 * +tag). Apple's private-relay addresses are random, so never those.
 * Only ever a pre-filled suggestion the person can change. */
export function suggestUsernameBases({
  fullName,
  email,
}: {
  fullName: string | null | undefined;
  email: string | null | undefined;
}): string[] {
  const sources: string[] = [];
  if (fullName) sources.push(fullName);
  if (email && !/@privaterelay\.appleid\.com$/i.test(email)) {
    sources.push(email.split("@")[0].split("+")[0]);
  }
  const out: string[] = [];
  for (const source of sources) {
    const shaped = toUsernameShape(source);
    if (!shaped || validateUsername(shaped) || isPlaceholderUsername(shaped) || out.includes(shaped)) continue;
    out.push(shaped);
  }
  return out;
}

/** Every name worth checking for a base, in order: as-is, then 2-9 on
 * the end (cut to fit the 24-character limit). */
export function usernameCandidates(bases: string[]): string[] {
  const out: string[] = [];
  for (const base of bases) {
    out.push(base);
    for (let n = 2; n <= 9; n++) out.push(`${base.slice(0, 23)}${n}`);
  }
  return [...new Set(out)];
}
