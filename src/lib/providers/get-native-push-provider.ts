import type { NativePushProvider } from "@/lib/providers/native-push-provider";
import { MockNativePushProvider } from "@/lib/providers/mock-native-push-provider";
import { ApnsPushProvider } from "@/lib/providers/apns-push-provider";

let warnedUnconfigured = false;

/**
 * Real APNs when APNS_KEY_ID, APNS_TEAM_ID and APNS_PRIVATE_KEY are all
 * set, the mock otherwise — same shape as get-moderation-provider.ts.
 *
 * APNS_BUNDLE_ID defaults to com.sorza.app, and APNS_ENVIRONMENT to
 * production. Production is right for anything that came through
 * TestFlight or the App Store; only a build run straight from Xcode onto
 * a device talks to the sandbox, and needs APNS_ENVIRONMENT=sandbox.
 */
export function getNativePushProvider(): NativePushProvider {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;

  if (keyId && teamId && privateKey) {
    return new ApnsPushProvider({
      keyId,
      teamId,
      privateKey,
      bundleId: process.env.APNS_BUNDLE_ID || "com.sorza.app",
      environment: process.env.APNS_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
    });
  }

  if (!warnedUnconfigured && process.env.NODE_ENV === "production") {
    warnedUnconfigured = true;
    console.warn(
      "[push] APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY are not set — iOS app notifications are disabled.",
    );
  }
  return new MockNativePushProvider();
}
