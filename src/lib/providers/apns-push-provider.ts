import http2 from "node:http2";
import type { NativePushProvider, NativePushResult } from "@/lib/providers/native-push-provider";
import type { PushPayload } from "@/lib/push/payload";
import {
  buildApnsPayload,
  classifyApnsResponse,
  isValidDeviceToken,
  signApnsJwt,
  type ApnsOutcome,
} from "@/lib/push/apns";

const PRODUCTION_ORIGIN = "https://api.push.apple.com";
const SANDBOX_ORIGIN = "https://api.sandbox.push.apple.com";

// Apple documents that a provider token must be refreshed no more than
// once per 20 minutes and no less than once per 60. Regenerating on every
// send trips the first rule (TooManyProviderTokenUpdates); holding one
// for over an hour trips the second. 50 minutes sits safely between.
const TOKEN_TTL_SECONDS = 50 * 60;
const REQUEST_TIMEOUT_MS = 10_000;

// Module-level, not per-instance: getNativePushProvider() builds a fresh
// provider on every call, so a cache on the instance would never be hit.
let cachedToken: { jwt: string; issuedAt: number; keyId: string } | null = null;

export interface ApnsConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  environment: "production" | "sandbox";
}

interface SendOutcome {
  token: string;
  outcome: ApnsOutcome;
  reason?: string;
}

export class ApnsPushProvider implements NativePushProvider {
  readonly isMock = false;

  constructor(private readonly config: ApnsConfig) {}

  private providerToken(): string {
    const now = Math.floor(Date.now() / 1000);
    if (
      cachedToken &&
      cachedToken.keyId === this.config.keyId &&
      now - cachedToken.issuedAt < TOKEN_TTL_SECONDS
    ) {
      return cachedToken.jwt;
    }
    const jwt = signApnsJwt({
      teamId: this.config.teamId,
      keyId: this.config.keyId,
      privateKey: this.config.privateKey,
      issuedAt: now,
    });
    cachedToken = { jwt, issuedAt: now, keyId: this.config.keyId };
    return jwt;
  }

  async send(tokens: string[], payload: PushPayload): Promise<NativePushResult> {
    // The path is built from this value, so a row that somehow isn't
    // plain hex is dropped here rather than interpolated into a request.
    const valid = tokens.filter(isValidDeviceToken);
    if (valid.length === 0) return { invalidTokens: [] };

    const jwt = this.providerToken();
    const body = buildApnsPayload(payload);
    const origin = this.config.environment === "sandbox" ? SANDBOX_ORIGIN : PRODUCTION_ORIGIN;

    // One connection for the whole fan-out: a user's devices share it as
    // parallel streams instead of each paying for its own TLS handshake.
    const session = http2.connect(origin);
    // A session-level error (DNS, TLS, reset) would otherwise be an
    // unhandled 'error' event and take the process down. Each request
    // below also fails on its own, which is what turns this into a
    // per-token "failed" instead of a crash.
    session.on("error", () => {});

    try {
      const results = await Promise.all(valid.map((token) => this.sendOne(session, token, jwt, body)));

      for (const r of results) {
        if (r.outcome === "failed") {
          // Never logs the token or the notification text — only the
          // reason APNs gave, which is the part that's actually
          // diagnostic (ExpiredProviderToken, TopicDisallowed, ...).
          console.error(`[apns] send failed: ${r.reason ?? "no response"}`);
        }
      }

      return {
        invalidTokens: results.filter((r) => r.outcome === "invalid-token").map((r) => r.token),
      };
    } finally {
      session.close();
    }
  }

  private sendOne(
    session: http2.ClientHttp2Session,
    token: string,
    jwt: string,
    body: string,
  ): Promise<SendOutcome> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: SendOutcome) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      let request: http2.ClientHttp2Stream;
      try {
        request = session.request({
          ":method": "POST",
          ":path": `/3/device/${token}`,
          authorization: `bearer ${jwt}`,
          "apns-topic": this.config.bundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        });
      } catch {
        finish({ token, outcome: "failed", reason: "could not open request" });
        return;
      }

      let status = 0;
      let responseBody = "";

      request.setTimeout(REQUEST_TIMEOUT_MS, () => {
        request.close(http2.constants.NGHTTP2_CANCEL);
        finish({ token, outcome: "failed", reason: "timeout" });
      });
      request.on("response", (headers) => {
        status = Number(headers[":status"] ?? 0);
      });
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        responseBody += chunk;
      });
      request.on("end", () => {
        let reason: string | undefined;
        try {
          reason = (JSON.parse(responseBody) as { reason?: string }).reason;
        } catch {
          // A 200 has an empty body; anything else that isn't JSON just
          // has no reason to report.
        }
        finish({ token, outcome: classifyApnsResponse(status, reason), reason });
      });
      request.on("error", () => finish({ token, outcome: "failed", reason: "stream error" }));

      request.end(body);
    });
  }
}
