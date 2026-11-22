import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listUserIdsWithDevicePushTokens } from "@/lib/db/device-push-tokens";
import { listUserIdsWithPushSubscriptions } from "@/lib/db/push-subscriptions";
import { sendPushToUser } from "@/lib/push/send";
import { runInBatches } from "@/lib/push/afternoon";
import { claimLogSlot, loadPrefs, toPushPrefs } from "@/lib/daily/notify";
import { isQuietHour, localHourIn } from "@/lib/daily/notify-schedule";
import { isPostBonusPushDue, isPromoPushHour, POST_BONUS, postBonusPushPayload } from "@/lib/promo/post-bonus";

/** The hourly job's post-bonus step: while the offer runs, everyone with
 * push on hears about it once, in their waking hours and outside quiet
 * hours, under the Updates setting. Claimed in daily_push_log first, so
 * overlapping runs can't send it twice. Returns how many were sent. */
export async function sendDuePostBonusPushes(now: Date = new Date()): Promise<number> {
  if (!isPostBonusPushDue(now)) return 0;
  const service = createServiceRoleClient();
  const [deviceUsers, browserUsers] = await Promise.all([
    listUserIdsWithDevicePushTokens(service),
    listUserIdsWithPushSubscriptions(service),
  ]);
  const userIds = [...new Set([...deviceUsers, ...browserUsers])];
  if (userIds.length === 0) return 0;

  const prefsByUser = await loadPrefs(service, userIds);
  const due = userIds.filter((id) => {
    const { prefs, timeZone } = toPushPrefs(prefsByUser.get(id));
    const hour = localHourIn(timeZone, now);
    return isPromoPushHour(hour) && !isQuietHour(hour, prefs);
  });
  if (due.length === 0) return 0;
  const people = (await getProfilesByIds(service, due)).filter((p) => !p.is_banned);

  const payload = postBonusPushPayload();
  let sent = 0;
  await runInBatches(
    people.map((person) => async () => {
      if (!(await claimLogSlot(service, person.id, POST_BONUS.pushLogDay, "drop", POST_BONUS.pushLogSlot))) return;
      await sendPushToUser(person.id, payload, "updates");
      sent += 1;
    }),
  );
  return sent;
}
