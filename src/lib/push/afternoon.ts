import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listUserIdsWithDevicePushTokens } from "@/lib/db/device-push-tokens";
import { listUserIdsWithPushSubscriptions } from "@/lib/db/push-subscriptions";
import { loadPrefs, toPushPrefs } from "@/lib/daily/notify";
import { isAfternoonPushHour, localHourIn } from "@/lib/daily/notify-schedule";

/** Everyone with push on whose own clock says it's the afternoon push
 * window (isAfternoonPushHour) and who isn't in quiet hours. The hourly
 * job's afternoon pushes each start from this, then apply their own
 * once-a-day or once-ever rule from daily_push_log. */
export async function listAfternoonPushRecipients(
  service: SupabaseClient<Database>,
  now: Date,
): Promise<string[]> {
  const [deviceUsers, browserUsers] = await Promise.all([
    listUserIdsWithDevicePushTokens(service),
    listUserIdsWithPushSubscriptions(service),
  ]);
  const userIds = [...new Set([...deviceUsers, ...browserUsers])];
  if (userIds.length === 0) return [];
  const prefsByUser = await loadPrefs(service, userIds);
  return userIds.filter((id) => {
    const { prefs, timeZone } = toPushPrefs(prefsByUser.get(id));
    return isAfternoonPushHour(localHourIn(timeZone, now), prefs);
  });
}

/** Runs `tasks` ten at a time, ignoring any one failing. */
export async function runInBatches(tasks: (() => Promise<void>)[], size = 10): Promise<void> {
  for (let i = 0; i < tasks.length; i += size) {
    await Promise.all(tasks.slice(i, i + size).map((run) => run().catch(() => undefined)));
  }
}
