import type { NativePushProvider, NativePushResult } from "@/lib/providers/native-push-provider";
import type { PushPayload } from "@/lib/push/payload";

/** Used whenever APNs isn't configured. Sends nothing to anyone.
 *
 * Deliberately quiet outside development: a production deploy that lost
 * its APNs key should not also flood the logs with one line per
 * notification. The missing key itself is the thing worth noticing, and
 * getNativePushProvider makes that visible once per boot instead. */
export class MockNativePushProvider implements NativePushProvider {
  readonly isMock = true;

  async send(tokens: string[], payload: PushPayload): Promise<NativePushResult> {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[mock native push] not sent — APNs isn't configured. Would have notified ${tokens.length} device(s): "${payload.title}"`,
      );
    }
    return { invalidTokens: [] };
  }
}
