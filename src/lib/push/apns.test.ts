// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import {
  buildApnsPayload,
  classifyApnsResponse,
  isValidDeviceToken,
  isSafeAppPath,
  normalizePrivateKey,
  signApnsJwt,
} from "@/lib/push/apns";

describe("isValidDeviceToken", () => {
  it("accepts a 64-character hex token", () => {
    expect(isValidDeviceToken("a".repeat(64))).toBe(true);
    expect(isValidDeviceToken("0123456789abcdefABCDEF0123456789abcdef0123456789abcdef0123456789")).toBe(true);
  });

  it("accepts longer tokens, since Apple documents the length as variable", () => {
    expect(isValidDeviceToken("f".repeat(160))).toBe(true);
  });

  it("rejects anything that isn't plain hex", () => {
    expect(isValidDeviceToken("")).toBe(false);
    expect(isValidDeviceToken("g".repeat(64))).toBe(false);
    expect(isValidDeviceToken(`${"a".repeat(63)} `)).toBe(false);
    expect(isValidDeviceToken("../../etc/passwd")).toBe(false);
  });

  it("rejects tokens too short to be real", () => {
    expect(isValidDeviceToken("abcd")).toBe(false);
  });

  it("rejects absurdly long input", () => {
    expect(isValidDeviceToken("a".repeat(513))).toBe(false);
  });
});

describe("isSafeAppPath", () => {
  it("accepts an in-app path", () => {
    expect(isSafeAppPath("/p/123")).toBe(true);
    expect(isSafeAppPath("/u/calib_lawson")).toBe(true);
    expect(isSafeAppPath("/messages?thread=1")).toBe(true);
  });

  it("rejects anything that could leave the app", () => {
    expect(isSafeAppPath("https://evil.example")).toBe(false);
    expect(isSafeAppPath("//evil.example")).toBe(false);
    expect(isSafeAppPath("/\\evil.example")).toBe(false);
    expect(isSafeAppPath("javascript:alert(1)")).toBe(false);
    expect(isSafeAppPath("p/123")).toBe(false);
    expect(isSafeAppPath("")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isSafeAppPath(undefined)).toBe(false);
    expect(isSafeAppPath(42)).toBe(false);
    expect(isSafeAppPath(null)).toBe(false);
  });
});

describe("buildApnsPayload", () => {
  it("puts title and body in the alert and the path beside aps", () => {
    const parsed = JSON.parse(buildApnsPayload({ title: "New like", body: "@sam liked your post", url: "/p/9" }));
    expect(parsed.aps.alert).toEqual({ title: "New like", body: "@sam liked your post" });
    expect(parsed.aps.sound).toBe("default");
    expect(parsed.url).toBe("/p/9");
  });

  it("truncates an oversized body instead of risking APNs' 4KB cap", () => {
    const parsed = JSON.parse(buildApnsPayload({ title: "t", body: "x".repeat(2000), url: "/" }));
    expect(parsed.aps.alert.body.length).toBeLessThanOrEqual(240);
    expect(parsed.aps.alert.body.endsWith("…")).toBe(true);
  });

  it("truncates an oversized title", () => {
    const parsed = JSON.parse(buildApnsPayload({ title: "t".repeat(500), body: "b", url: "/" }));
    expect(parsed.aps.alert.title.length).toBeLessThanOrEqual(100);
  });

  it("leaves short text untouched", () => {
    const parsed = JSON.parse(buildApnsPayload({ title: "Hi", body: "There", url: "/" }));
    expect(parsed.aps.alert.body).toBe("There");
  });

  it("drops an unsafe url rather than shipping it to the device", () => {
    const parsed = JSON.parse(buildApnsPayload({ title: "t", body: "b", url: "https://evil.example" }));
    expect(parsed.url).toBe("/");
  });
});

describe("classifyApnsResponse", () => {
  it("treats 200 as sent", () => {
    expect(classifyApnsResponse(200)).toBe("sent");
  });

  it("treats 410 as an invalid token, so it gets deleted", () => {
    expect(classifyApnsResponse(410, "Unregistered")).toBe("invalid-token");
  });

  it("treats BadDeviceToken as invalid — the wrong-environment case too", () => {
    expect(classifyApnsResponse(400, "BadDeviceToken")).toBe("invalid-token");
    expect(classifyApnsResponse(400, "DeviceTokenNotForTopic")).toBe("invalid-token");
  });

  it("does not delete tokens over our own config errors", () => {
    expect(classifyApnsResponse(403, "InvalidProviderToken")).toBe("failed");
    expect(classifyApnsResponse(403, "ExpiredProviderToken")).toBe("failed");
    expect(classifyApnsResponse(400, "PayloadTooLarge")).toBe("failed");
  });

  it("does not delete tokens over transient server errors", () => {
    expect(classifyApnsResponse(429, "TooManyRequests")).toBe("failed");
    expect(classifyApnsResponse(500)).toBe("failed");
    expect(classifyApnsResponse(503, "ServiceUnavailable")).toBe("failed");
  });
});

describe("normalizePrivateKey", () => {
  const body = "MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg";

  it("keeps a real multi-line PEM intact, trimming only surrounding whitespace", () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
    expect(normalizePrivateKey(`${pem}\n`)).toBe(pem);
    expect(normalizePrivateKey(`  ${pem}  `)).toBe(pem);
  });

  it("expands literal \\n sequences, which is how an env var usually arrives", () => {
    const flat = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----`;
    expect(normalizePrivateKey(flat)).toBe(`-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`);
  });

  it("strips surrounding quotes a dashboard might add", () => {
    const quoted = `"-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----"`;
    expect(normalizePrivateKey(quoted).startsWith("-----BEGIN")).toBe(true);
  });
});

describe("signApnsJwt", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  function decode(part: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  }

  it("produces three base64url segments with no padding", () => {
    const jwt = signApnsJwt({ teamId: "TEAM123456", keyId: "KEY1234567", privateKey: pem, issuedAt: 1_700_000_000 });
    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);
    for (const p of parts) expect(p).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("carries the algorithm, key id, issuer and issue time APNs requires", () => {
    const jwt = signApnsJwt({ teamId: "TEAM123456", keyId: "KEY1234567", privateKey: pem, issuedAt: 1_700_000_000 });
    const [header, claims] = jwt.split(".");
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(decode(claims)).toEqual({ iss: "TEAM123456", iat: 1_700_000_000 });
  });

  it("signs in raw 64-byte r||s form, not DER — APNs rejects DER", () => {
    const jwt = signApnsJwt({ teamId: "T", keyId: "K", privateKey: pem, issuedAt: 1 });
    expect(Buffer.from(jwt.split(".")[2], "base64url")).toHaveLength(64);
  });

  it("produces a signature the matching public key actually verifies", () => {
    const jwt = signApnsJwt({ teamId: "T", keyId: "K", privateKey: pem, issuedAt: 1 });
    const [header, claims, signature] = jwt.split(".");
    const verifier = createVerify("sha256");
    verifier.update(`${header}.${claims}`);
    expect(
      verifier.verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url")),
    ).toBe(true);
  });

  it("works from a key that arrived with escaped newlines", () => {
    const flat = pem.trim().replace(/\n/g, "\\n");
    const jwt = signApnsJwt({ teamId: "T", keyId: "K", privateKey: flat, issuedAt: 1 });
    expect(jwt.split(".")).toHaveLength(3);
  });
});
