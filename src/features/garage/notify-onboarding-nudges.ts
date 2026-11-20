import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listVehiclesByOwnerIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listVehicleIdsWithGalleryPhotos } from "@/lib/db/vehicle-media";
import { sendPushToUser } from "@/lib/push/send";
import { listAfternoonPushRecipients, runInBatches } from "@/lib/push/afternoon";
import { claimLogSlot } from "@/lib/daily/notify";
import { dailyDateKey } from "@/lib/daily/day";
import {
  decideOnboardingNudge,
  onboardingNudgePayload,
  type NudgeCar,
  type OnboardingNudgeKind,
} from "@/lib/onboarding/nudges";
import { vehicleDisplayName } from "@/lib/vehicles/display-name";

const HOUR_MS = 60 * 60 * 1000;

/** The hourly job's onboarding step: for people with push on whose
 * afternoon it is, the one-time "add your car" or "get your car rated"
 * push, if they're stuck at that step (see lib/onboarding/nudges).
 * Returns how many were sent. */
export async function sendDueOnboardingNudges(now: Date = new Date()): Promise<number> {
  const service = createServiceRoleClient();
  const recipients = await listAfternoonPushRecipients(service, now);
  if (recipients.length === 0) return 0;

  const [log, profiles, vehicles] = await Promise.all([
    service.from("daily_push_log").select("user_id, kind").in("kind", ["add_car", "rate_car"]).in("user_id", recipients),
    getProfilesByIds(service, recipients),
    listVehiclesByOwnerIds(service, recipients),
  ]);
  if (log.error) throw log.error;

  const vehicleIds = vehicles.map((v) => v.id);
  const [builds, withGalleryPhotos] = await Promise.all([
    listActiveBuildsByVehicleIds(service, vehicleIds),
    listVehicleIdsWithGalleryPhotos(service, vehicleIds),
  ]);

  const sentByUser = new Map<string, Set<OnboardingNudgeKind>>();
  for (const row of log.data) {
    const set = sentByUser.get(row.user_id) ?? new Set<OnboardingNudgeKind>();
    set.add(row.kind as OnboardingNudgeKind);
    sentByUser.set(row.user_id, set);
  }
  const carsByOwner = new Map<string, NudgeCar[]>();
  for (const v of vehicles) {
    const list = carsByOwner.get(v.owner_id) ?? [];
    list.push({
      id: v.id,
      name: vehicleDisplayName(v),
      hasPhoto: Boolean(v.hero_media_id) || withGalleryPhotos.has(v.id),
      rated: builds.get(v.id)?.ai_rating_score != null,
      approved: v.ownership_verification_status === "approved",
      ageHours: (now.getTime() - new Date(v.created_at).getTime()) / HOUR_MS,
    });
    carsByOwner.set(v.owner_id, list);
  }

  const day = dailyDateKey(now);
  let sent = 0;
  const work = profiles
    .filter((p) => !p.is_banned)
    .map((profile) => async () => {
      const nudge = decideOnboardingNudge({
        accountAgeHours: (now.getTime() - new Date(profile.created_at).getTime()) / HOUR_MS,
        cars: carsByOwner.get(profile.id) ?? [],
        sent: sentByUser.get(profile.id) ?? new Set(),
      });
      if (!nudge) return;
      if (!(await claimLogSlot(service, profile.id, day, nudge.kind))) return;
      await sendPushToUser(profile.id, onboardingNudgePayload(nudge), "updates");
      sent += 1;
    });

  await runInBatches(work);
  return sent;
}
