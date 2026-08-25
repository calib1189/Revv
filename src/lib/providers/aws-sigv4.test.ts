import { describe, expect, it } from "vitest";
import { signAmzRequest, type SigV4Input } from "./aws-sigv4";

const BASE_INPUT: SigV4Input = {
  method: "POST",
  host: "webservices.amazon.com",
  path: "/paapi5/searchitems",
  region: "us-east-1",
  service: "ProductAdvertisingAPI",
  accessKey: "AKIAEXAMPLE",
  secretKey: "secretExampleKey",
  amzTarget: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
  contentEncoding: "amz-1.0",
  contentType: "application/json; charset=utf-8",
  payload: JSON.stringify({ Keywords: "brake kit", ItemCount: 6 }),
  amzDate: "20260101T000000Z",
};

// There's no way to validate this against a real PA-API call from this
// sandbox (no network, no real credentials) — these check the signing
// math's structural properties and determinism instead of matching a
// fixed reference signature, since a misremembered "golden" hex value
// would be worse than no test at all: a wrong expectation would either
// mask a real bug or fail a correct implementation.
describe("signAmzRequest", () => {
  it("is deterministic for identical inputs", () => {
    const a = signAmzRequest(BASE_INPUT);
    const b = signAmzRequest(BASE_INPUT);
    expect(a).toEqual(b);
  });

  it("passes through the fixed headers unchanged", () => {
    const headers = signAmzRequest(BASE_INPUT);
    expect(headers["content-encoding"]).toBe("amz-1.0");
    expect(headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(headers.host).toBe("webservices.amazon.com");
    expect(headers["x-amz-date"]).toBe("20260101T000000Z");
    expect(headers["x-amz-target"]).toBe(
      "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    );
  });

  it("produces a well-formed Authorization header", () => {
    const { authorization } = signAmzRequest(BASE_INPUT);
    expect(authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/20260101\/us-east-1\/ProductAdvertisingAPI\/aws4_request, SignedHeaders=content-encoding;content-type;host;x-amz-date;x-amz-target, Signature=[0-9a-f]{64}$/,
    );
  });

  it("changes the signature when the payload changes", () => {
    const a = signAmzRequest(BASE_INPUT);
    const b = signAmzRequest({ ...BASE_INPUT, payload: JSON.stringify({ Keywords: "wheels" }) });
    expect(a.authorization).not.toBe(b.authorization);
  });

  it("changes the signature when the secret key changes", () => {
    const a = signAmzRequest(BASE_INPUT);
    const b = signAmzRequest({ ...BASE_INPUT, secretKey: "differentSecret" });
    expect(a.authorization).not.toBe(b.authorization);
  });

  it("changes the signature when the date changes", () => {
    const a = signAmzRequest(BASE_INPUT);
    const b = signAmzRequest({ ...BASE_INPUT, amzDate: "20260601T120000Z" });
    expect(a.authorization).not.toBe(b.authorization);
  });

  it("defaults x-amz-date to a well-formed current timestamp when omitted", () => {
    const { amzDate: _unused, ...withoutDate } = BASE_INPUT;
    const headers = signAmzRequest(withoutDate);
    expect(headers["x-amz-date"]).toMatch(/^\d{8}T\d{6}Z$/);
  });
});
