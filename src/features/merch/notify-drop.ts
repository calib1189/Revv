import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getProfilesByIds } from "@/lib/db/profiles";
import { sendPushToUser } from "@/lib/push/send";
import { listAfternoonPushRecipients, runInBatches } from "@/lib/push/afternoon";
import { claimLogSlot } from "@/lib/daily/notify";
import { merchEnabled, teesOnSale } from "@/lib/merch/products";
import { dropLogDay, dropPushPayload } from "@/lib/merch/drop";

/** The hourly job's drop step: when a limited tee is on sale, everyone
 * with push on hears about it once, in their afternoon and outside quiet
 * hours, under the Updates setting. Only while tees are switched on for
 * everyone (MERCH_ENABLED): a push for a shirt people can't see would be
 * worse than none. Each person's push is claimed in daily_push_log under
 * the drop's own key first, so it's sent once per drop however many runs
 * overlap. Returns how many were sent. */
export async function sendDueDropPushes(now: Date = new Date()): Promise<number> {
  if (!merchEnabled()) return 0;
  const drops = teesOnSale(now.getTime()).filter((d) => d.endsAt);
  if (drops.length === 0) return 0;

  const service = createServiceRoleClient();
  const recipients = await listAfternoonPushRecipients(service, now);
  if (recipients.length === 0) return 0;
  const people = (await getProfilesByIds(service, recipients)).filter((p) => !p.is_banned);

  let sent = 0;
  for (const drop of drops) {
    const day = dropLogDay(drop);
    const payload = dropPushPayload(drop);
    await runInBatches(
      people.map((person) => async () => {
        if (!(await claimLogSlot(service, person.id, day, "drop"))) return;
        await sendPushToUser(person.id, payload, "updates");
        sent += 1;
      }),
    );
  }
  return sent;
}
