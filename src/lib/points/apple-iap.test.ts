import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { POINT_PACKS } from "@/lib/points/packs";
import { checkAppleTransaction, signAppStoreJwt } from "@/lib/points/apple-iap";

const pack = POINT_PACKS[1];
const good = {
  bundleId: "com.sorza.app",
  productId: pack.appleProductId,
  appAccountToken: "6f1c2d3e-0000-4000-8000-000000000001",
  type: "Consumable",
  transactionId: "2000000123456789",
  price: pack.priceCents * 10,
  currency: "USD",
};
const ctx = { bundleId: "com.sorza.app", userId: "6f1c2d3e-0000-4000-8000-000000000001" };

describe("checkAppleTransaction", () => {
  it("accepts SORZA's own consumable pack bought by this user", () => {
    expect(checkAppleTransaction(good, ctx)).toEqual({ ok: true, pack, transactionId: good.transactionId });
  });

  it("rejects another app, an unknown product, or a non-consumable", () => {
    expect(checkAppleTransaction({ ...good, bundleId: "com.other.app" }, ctx)).toHaveProperty("ok", false);
    expect(checkAppleTransaction({ ...good, productId: "com.sorza.app.points.999999" }, ctx)).toHaveProperty("ok", false);
    expect(checkAppleTransaction({ ...good, type: "Auto-Renewable Subscription" }, ctx)).toHaveProperty("ok", false);
  });

  it("rejects a purchase made for a different account", () => {
    expect(checkAppleTransaction({ ...good, appAccountToken: "someone-else" }, ctx)).toHaveProperty("ok", false);
    expect(checkAppleTransaction({ ...good, appAccountToken: undefined }, ctx)).toHaveProperty("ok", false);
  });

  it("rejects a refunded purchase", () => {
    expect(checkAppleTransaction({ ...good, revocationDate: 1731200000000 }, ctx)).toHaveProperty("ok", false);
  });
});

describe("signAppStoreJwt", () => {
  it("makes an ES256 token Apple's server API accepts the shape of", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const token = signAppStoreJwt({ issuerId: "iss-1", keyId: "KEY123", privateKeyPem: pem, bundleId: "com.sorza.app", now: 1_800_000_000 });
    const [h, p, sig] = token.split(".");
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(header).toEqual({ alg: "ES256", kid: "KEY123", typ: "JWT" });
    expect(payload).toMatchObject({ iss: "iss-1", aud: "appstoreconnect-v1", bid: "com.sorza.app", iat: 1_800_000_000 });
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(3600);
    const ok = verify("sha256", Buffer.from(`${h}.${p}`), { key: createPublicKey(privateKey), dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
    expect(ok).toBe(true);
  });
});
