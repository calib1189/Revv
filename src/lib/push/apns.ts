import { createSign } from "node:crypto";
import type { PushPayload } from "@/lib/push/payload";
import { isSafeAppPath } from "@/lib/push/validation";

// Re-exported so server code has one place to import the APNs helpers from.
export { isValidDeviceToken, isSafeAppPath } from "@/lib/push/validation";

// Pure pieces of the APNs integration. Kept apart from the transport
// (lib/providers/apns-push-provider.ts) so everything with a right and a
// wrong answer is testable without a network, a key, or an iPhone.

const MAX_TITLE_LENGTH = 100;
// APNs rejects a payload over 4KB outright. A notification body is a
// glance, not a document, so this stays far below that.
const MAX_BODY_LENGTH = 240;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function buildApnsPayload(payload: PushPayload): string {
  return JSON.stringify({
    aps: {
      alert: {
        title: truncate(payload.title, MAX_TITLE_LENGTH),
        body: truncate(payload.body, MAX_BODY_LENGTH),
      },
      sound: "default",
    },
    // Custom keys sit beside `aps`, never inside it.
    url: isSafeAppPath(payload.url) ? payload.url : "/",
  });
}

export type ApnsOutcome = "sent" | "invalid-token" | "failed";

/** Only a response that says THIS TOKEN is dead may delete it.
 *
 * Getting this wrong in the permissive direction is expensive: a
 * misconfigured key (403) or a rate limit (429) would otherwise wipe
 * every user's token, silently ending notifications for the whole app
 * over a problem that had nothing to do with any device.
 *
 * BadDeviceToken is included deliberately. It is what APNs returns when
 * a token from a debug build reaches the production endpoint (or the
 * reverse), and such a token is useless to us either way. */
export function classifyApnsResponse(status: number, reason?: string): ApnsOutcome {
  if (status === 200) return "sent";
  if (status === 410) return "invalid-token";
  if (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic")) {
    return "invalid-token";
  }
  return "failed";
}

/** An env var holding a multi-line PEM usually arrives with literal "\n"
 * sequences (dashboards flatten newlines), sometimes wrapped in quotes.
 * Node's key parser wants real newlines. */
export function normalizePrivateKey(raw: string): string {
  const unquoted = raw.trim().replace(/^["']|["']$/g, "");
  return unquoted.includes("\\n") ? unquoted.replace(/\\n/g, "\n") : unquoted;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/** The provider token APNs wants on every request: an ES256 JWT signed
 * with the .p8 key from the Apple developer account.
 *
 * `dsaEncoding: "ieee-p1363"` is the load-bearing detail. Node signs
 * ECDSA as DER by default; JWT (and APNs) want the raw 64-byte r||s
 * form. A DER signature has the right header and the right claims and is
 * still rejected with InvalidProviderToken, which reads exactly like a
 * wrong key and costs an afternoon to tell apart. */
export function signApnsJwt({
  teamId,
  keyId,
  privateKey,
  issuedAt,
}: {
  teamId: string;
  keyId: string;
  privateKey: string;
  /** Seconds since the epoch. */
  issuedAt: number;
}): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: issuedAt }));
  const signingInput = `${header}.${claims}`;

  const signer = createSign("sha256");
  signer.update(signingInput);
  const signature = signer.sign({
    key: normalizePrivateKey(privateKey),
    dsaEncoding: "ieee-p1363",
  });

  return `${signingInput}.${base64url(signature)}`;
}
