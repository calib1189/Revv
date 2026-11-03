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
