import { createPrivateKey, sign } from "node:crypto";
import { packByAppleProductId, type PointPack } from "@/lib/points/packs";

// Server-only. Confirms an iPhone points purchase with Apple before any
// points are credited: the app reports a transaction id, and the server
// asks Apple's App Store Server API what that transaction really is. The
// answer comes from Apple over TLS, so nothing the app sends is trusted.

/** The fields of Apple's decoded JWSTransaction this app relies on. */
export interface AppleTransaction {
  bundleId?: string;
  productId?: string;
  appAccountToken?: string;
  type?: string;
  transactionId?: string;
  revocationDate?: number;
}

export type AppleCheck = { ok: true; pack: PointPack; transactionId: string } | { ok: false; reason: string };

/** Whether a transaction Apple reported is a SORZA points pack bought by
 * this user (the app tags every purchase with the user's id as its
 * appAccountToken) and not refunded. */
export function checkAppleTransaction(t: AppleTransaction, ctx: { bundleId: string; userId: string }): AppleCheck {
  if (t.bundleId !== ctx.bundleId) return { ok: false, reason: "not this app" };
  if (t.type !== "Consumable") return { ok: false, reason: "not a points pack" };
  const pack = t.productId ? packByAppleProductId(t.productId) : null;
  if (!pack) return { ok: false, reason: "unknown product" };
  if (!t.appAccountToken || t.appAccountToken.toLowerCase() !== ctx.userId.toLowerCase()) {
    return { ok: false, reason: "bought for a different account" };
  }
  if (t.revocationDate) return { ok: false, reason: "refunded" };
  if (!t.transactionId) return { ok: false, reason: "no transaction id" };
  return { ok: true, pack, transactionId: t.transactionId };
}

/** The ES256 JWT Apple's App Store Server API wants on every request. */
export function signAppStoreJwt(input: {
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  bundleId: string;
  now?: number;
}): string {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = enc({ alg: "ES256", kid: input.keyId, typ: "JWT" });
  const payload = enc({ iss: input.issuerId, iat: now, exp: now + 1800, aud: "appstoreconnect-v1", bid: input.bundleId });
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(input.privateKeyPem),
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

export function appleIapConfig() {
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  const keyId = process.env.APPLE_IAP_KEY_ID;
  // Stored with literal \n in env dashboards.
  const privateKeyPem = process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const bundleId = process.env.APPLE_BUNDLE_ID ?? "com.sorza.app";
  if (!issuerId || !keyId || !privateKeyPem) return null;
  return { issuerId, keyId, privateKeyPem, bundleId };
}

/** Looks a transaction up with Apple. Production first; a TestFlight or
 * Xcode purchase lives in the sandbox, so a 404 there falls back to it. */
export async function fetchAppleTransaction(transactionId: string): Promise<AppleTransaction | null> {
  const config = appleIapConfig();
  if (!config) throw new Error("Apple in-app purchases are not configured.");
  if (!/^\d{1,30}$/.test(transactionId)) return null;
  const token = signAppStoreJwt(config);
  for (const host of ["api.storekit.itunes.apple.com", "api.storekit-sandbox.itunes.apple.com"]) {
    const res = await fetch(`https://${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`App Store Server API ${res.status}`);
    const { signedTransactionInfo } = (await res.json()) as { signedTransactionInfo?: string };
    const payload = signedTransactionInfo?.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AppleTransaction;
  }
  return null;
}
