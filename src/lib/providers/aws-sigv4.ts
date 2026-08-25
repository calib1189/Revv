import { createHash, createHmac } from "crypto";

/** AWS Signature Version 4 — the same request-signing scheme every AWS
 * service uses, including the Product Advertising API. Hand-rolled with
 * Node's built-in crypto rather than pulling in the AWS SDK: PA-API is
 * the only AWS-family call this app makes, a full SDK would be a lot of
 * dependency weight for one signed POST, and the algorithm itself is
 * fixed and well-documented (not something that benefits from a library
 * doing it "the right way" — there's only one right way).
 *
 * Split out from the provider that calls it so the actual signing math —
 * the part that's easy to get subtly wrong and hard to debug against a
 * real API — can be exercised with fixed, deterministic inputs. */

export interface SigV4Input {
  method: string;
  host: string;
  path: string;
  region: string;
  service: string;
  accessKey: string;
  secretKey: string;
  amzTarget: string;
  contentEncoding: string;
  contentType: string;
  payload: string;
  /** "YYYYMMDDTHHMMSSZ" — defaults to now; overridable so signing is
   * deterministic and testable. */
  amzDate?: string;
}

export interface SigV4Headers {
  [key: string]: string;
  "content-encoding": string;
  "content-type": string;
  host: string;
  "x-amz-date": string;
  "x-amz-target": string;
  authorization: string;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function nowAmzDate(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export function signAmzRequest(input: SigV4Input): SigV4Headers {
  const amzDate = input.amzDate ?? nowAmzDate();
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders =
    `content-encoding:${input.contentEncoding}\n` +
    `content-type:${input.contentType}\n` +
    `host:${input.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${input.amzTarget}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest = [
    input.method,
    input.path,
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(input.payload),
  ].join("\n");

  const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${input.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, input.service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    "content-encoding": input.contentEncoding,
    "content-type": input.contentType,
    host: input.host,
    "x-amz-date": amzDate,
    "x-amz-target": input.amzTarget,
    authorization,
  };
}
