import type { PushPayload } from "@/lib/push/payload";

export interface NativePushResult {
  /** Tokens the push service said are permanently dead. The caller
   * deletes exactly these and nothing else — a failed send that isn't
   * proof of a dead token (bad server config, a rate limit) must never
   * end up in this list. */
  invalidTokens: string[];
}

/** Delivers a notification to native-app device tokens. Sits behind an
 * interface like every other external provider, so the transport (APNs
 * today) is swappable and local dev can run without an Apple key. */
export interface NativePushProvider {
  /** True for the stand-in. Nothing user-facing reads this — push has no
   * UI to label — but it keeps "did this really go to a phone" answerable
   * from code and logs rather than by inference. */
  readonly isMock: boolean;
  send(tokens: string[], payload: PushPayload): Promise<NativePushResult>;
}
