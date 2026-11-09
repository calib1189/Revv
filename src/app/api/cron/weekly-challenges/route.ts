import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/authorize";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { listUserIdsWithDevicePushTokens } from "@/lib/db/device-push-tokens";
import { listUserIdsWithPushSubscriptions } from "@/lib/db/push-subscriptions";
import { sendPushToUser } from "@/lib/push/send";
import { CHALLENGES } from "@/lib/challenges/catalog";

// Fan-out to everyone with push on. Generous so a growing user base
// doesn't get cut off halfway through.
export const maxDuration = 60;

// People notified at once. Each send opens its own connection to Apple,
// so this bounds how many are open together.
const BATCH_SIZE = 10;

/** Vercel Cron calls this on Mondays at 20:00 UTC (2pm Central in winter,
 * 3pm in summer; vercel.json), well after the weekly
 * challenges reset at 00:00 UTC (lib/challenges/week.ts). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const [deviceUsers, browserUsers] = await Promise.all([
    listUserIdsWithDevicePushTokens(service),
    listUserIdsWithPushSubscriptions(service),
  ]);
  const userIds = [...new Set([...deviceUsers, ...browserUsers])];

  const payload = {
    title: "SORZA",
    body: `${CHALLENGES.length} new weekly challenges are live. Finish them before they reset next Monday.`,
    url: "/garage",
  };

  // sendPushToUser skips anyone who switched challenges off and never
  // throws, so one bad device can't stop the rest.
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    await Promise.all(
      userIds.slice(i, i + BATCH_SIZE).map((id) => sendPushToUser(id, payload, "challenges")),
    );
  }

  return NextResponse.json({ notified: userIds.length });
}
