// Mirrors the `username_format` check constraint on profiles
// (supabase/migrations/0001_init.sql) — keep these in sync.
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function validateUsername(input: string): string | null {
  const value = input.trim();

  if (value.length === 0) return "Username is required.";
  if (value !== value.toLowerCase())
    return "Username must be lowercase.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Username must be 3-24 characters: lowercase letters, numbers, underscores only.";
  }
  return null;
}
