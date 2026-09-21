// Deliberately free of any Node import. The token check runs on the
// server, but isSafeAppPath also runs in the browser (a tapped
// notification is validated on the device before it navigates), and
// anything the client imports from lib/push/apns.ts would drag node:crypto
// into the browser bundle.

/** APNs device tokens are hex. Apple documents the length as variable and
 * says not to hardcode 64, so this checks the alphabet and a sane range
 * rather than an exact size. Validated on the way IN so garbage never
 * reaches the table, and again on the way out so a bad row can never
 * become part of a request path. */
export function isValidDeviceToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-fA-F]{32,512}$/.test(value);
}

/** A tap opens a path inside the app, never anywhere else. The payload is
 * built server-side, but the client that receives it treats this as
 * untrusted anyway: an open redirect through a push notification is the
 * kind of bug that turns into a phishing vector. Rejects absolute URLs,
 * protocol-relative "//host", and the backslash variant some browsers
 * normalise into one. */
export function isSafeAppPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}
