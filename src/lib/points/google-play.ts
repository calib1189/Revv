import { createHash, createSign } from "node:crypto";
import { packByGoogleProductId, type PointPack } from "@/lib/points/packs";

// Server-only. Confirms an Android points purchase with Google before any
// points are credited: the app reports the product and its purchase
// token, and the server asks the Google Play Developer API what that
// purchase really is. Nothing the app sends is trusted on its own.

/** The fields of a Play ProductPurchase this app relies on. */
export interface GooglePurchase {
  /** 0 purchased, 1 cancelled, 2 pending. */
  purchaseState?: number;
  /** 0 not yet consumed, 1 consumed. */
  consumptionState?: number;
  orderId?: string;
  /** Present only for non-real purchases: 0 is a licence tester's. */
  purchaseType?: number;
}

export type GoogleCheck =
  | { ok: true; pack: PointPack; providerRef: string; test: boolean }
  | { ok: false; reason: string };

/** Whether a purchase Google reported is a completed points pack. Keyed
 * by its order id (unique per purchase), or a hash of the token when
 * there isn't one, so the same purchase can only ever be credited once. */
export function checkGooglePurchase(p: GooglePurchase, ctx: { productId: string; purchaseToken: string }): GoogleCheck {
  const pack = packByGoogleProductId(ctx.productId);
  if (!pack) return { ok: false, reason: "unknown product" };
  if (p.purchaseState !== 0) return { ok: false, reason: p.purchaseState === 2 ? "pending" : "not completed" };
  const providerRef = p.orderId?.slice(0, 200) || `token:${createHash("sha256").update(ctx.purchaseToken).digest("hex")}`;
  return { ok: true, pack, providerRef, test: p.purchaseType === 0 };
}

export function googlePlayConfig() {
  const clientEmail = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL;
  // Stored with literal \n in env dashboards.
  const privateKeyPem = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");
  const packageName = process.env.GOOGLE_PLAY_PACKAGE ?? "com.sorza.app";
  if (!clientEmail || !privateKeyPem) return null;
  return { clientEmail, privateKeyPem, packageName };
}

/** An OAuth access token for the Play Developer API, from the service
 * account's key (an RS256 JWT exchanged at Google's token endpoint). */
async function accessToken(config: NonNullable<ReturnType<typeof googlePlayConfig>>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(config.privateKeyPem, "base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

function purchaseUrl(packageName: string, productId: string, token: string, action = "") {
  return `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}${action}`;
}

/** Looks a purchase up with Google. Null if Google doesn't know it. */
export async function fetchGooglePurchase(productId: string, purchaseToken: string): Promise<GooglePurchase | null> {
  const config = googlePlayConfig();
  if (!config) throw new Error("Google Play billing is not configured.");
  if (!/^[\w.-]{1,100}$/.test(productId) || purchaseToken.length > 1000) return null;
  const res = await fetch(purchaseUrl(config.packageName, productId, purchaseToken), {
    headers: { Authorization: `Bearer ${await accessToken(config)}` },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Play Developer API ${res.status}`);
  return (await res.json()) as GooglePurchase;
}

/** Marks a purchase consumed, so the same pack can be bought again. */
export async function consumeGooglePurchase(productId: string, purchaseToken: string): Promise<void> {
  const config = googlePlayConfig();
  if (!config) return;
  const res = await fetch(purchaseUrl(config.packageName, productId, purchaseToken, ":consume"), {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(config)}` },
  });
  if (!res.ok && res.status !== 400) throw new Error(`Play consume ${res.status}`);
}
