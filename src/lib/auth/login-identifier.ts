/** What someone typed into the sign-in box: an email, or their SORZA
 * username (with or without @, any case). Usernames are lowercase
 * letters, numbers and underscores (lib/validation/username.ts), so the
 * two can't be confused. */
export type LoginIdentifier =
  | { kind: "email"; value: string }
  | { kind: "username"; value: string }
  | { kind: "invalid" };

const USERNAME = /^[a-z0-9_]{3,24}$/;

export function parseLoginIdentifier(raw: string): LoginIdentifier {
  const value = raw.trim();
  if (!value) return { kind: "invalid" };
  if (/^[^@\s]+@[^@\s]+$/.test(value)) return { kind: "email", value };
  const username = value.replace(/^@/, "").toLowerCase();
  return USERNAME.test(username) ? { kind: "username", value: username } : { kind: "invalid" };
}
