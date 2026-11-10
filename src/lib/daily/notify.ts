import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPushToUser, type PushPayload } from "@/lib/push/send";
import { listUserIdsWithDevicePushTokens } from "@/lib/db/device-push-tokens";
import { listUserIdsWithPushSubscriptions } from "@/lib/db/push-subscriptions";
import { DEFAULT_NOTIFICATION_PREFERENCES, DEFAULT_QUIET_HOURS } from "@/lib/db/notification-preferences";
import { getDailyChallengeByDate, type DailyChallenge } from "@/lib/db/daily";
import { addDays, dailyDateKey } from "@/lib/daily/day";
import {
  decideScheduledPush,
  localHourIn,
  mayNotifyVote,
  type DayState,
  type PushPrefs,
  type ScheduledKind,
  type ScheduledPush,
} from "@/lib/daily/notify-schedule";

const ORDINAL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
const BATCH_SIZE = 10;

interface PrefsRow {
  user_id: string;
  daily_challenge: boolean;
  daily_results: boolean;
  daily_votes: boolean;
  rate_ride: boolean;
  quiet_hours: boolean;
  quiet_start: number;
  quiet_end: number;
  time_zone: string | null;
}

function toPushPrefs(row: PrefsRow | undefined): { prefs: PushPrefs; timeZone: string | null } {
  return {
    prefs: {
      dailyChallenge: row?.daily_challenge ?? DEFAULT_NOTIFICATION_PREFERENCES.daily_challenge,
      dailyResults: row?.daily_results ?? DEFAULT_NOTIFICATION_PREFERENCES.daily_results,
      dailyVotes: row?.daily_votes ?? DEFAULT_NOTIFICATION_PREFERENCES.daily_votes,
      rateRide: row?.rate_ride ?? DEFAULT_NOTIFICATION_PREFERENCES.rate_ride,
      quietHours: row?.quiet_hours ?? DEFAULT_QUIET_HOURS.enabled,
      quietStart: row?.quiet_start ?? DEFAULT_QUIET_HOURS.start,
      quietEnd: row?.quiet_end ?? DEFAULT_QUIET_HOURS.end,
    },
    timeZone: row?.time_zone ?? null,
  };
}

async function loadPrefs(service: SupabaseClient<Database>, userIds: string[]): Promise<Map<string, PrefsRow>> {
  const { data, error } = await service
    .from("notification_preferences")
    .select("user_id, daily_challenge, daily_results, daily_votes, rate_ride, quiet_hours, quiet_start, quiet_end, time_zone")
    .in("user_id", userIds);
  if (error) throw error;
  return new Map(data.map((row) => [row.user_id, row]));
}

/** Claims a log slot before sending. The log's primary key means only
 * one caller ever wins a given (person, day, kind, slot), so two runs
 * overlapping can't send the same push twice. */
async function claimLogSlot(
  service: SupabaseClient<Database>,
  userId: string,
  day: string,
  kind: "morning" | "evening" | "vote",
  slot = 0,
): Promise<boolean> {
  const { data, error } = await service
    .from("daily_push_log")
    .upsert({ user_id: userId, day, kind, slot }, { onConflict: "user_id,day,kind,slot", ignoreDuplicates: true })
    .select("user_id");
  if (error) throw error;
  return data.length > 0;
}

/** ", presented by X" on a sponsored day (0109 columns), else nothing. */
function presentedBy(challenge: DailyChallenge): string {
  return challenge.sponsor_name ? `, presented by ${challenge.sponsor_name}` : "";
}

function payloadFor(
  push: ScheduledPush,
  today: DailyChallenge,
  yesterday: DailyChallenge | null,
  place: number | null,
  rides: number,
): PushPayload {
  switch (push.variant) {
    case "placed":
      return {
        title: "Sorza Daily",
        body:
          place === 1
            ? `You won yesterday's ${yesterday?.title ?? "challenge"}. Congrats, champ.`
            : `You placed ${ORDINAL[place ?? 3]} in yesterday's ${yesterday?.title ?? "challenge"}. See the results.`,
        url: yesterday ? `/daily/results/${yesterday.challenge_date}` : "/daily",
      };
    case "results":
      return {
        title: "Sorza Daily",
        body: `Yesterday's winner has been crowned. Today's challenge is live: ${today.title}.`,
        // The Daily page shows both: today's challenge and yesterday's podium.
        url: "/daily",
      };
    case "live":
      return {
        title: "Sorza Daily",
        body: today.prize
          ? `Today's challenge is live: ${today.title}${presentedBy(today)}. Winner gets ${today.prize}.`
          : `Today's challenge is live: ${today.title}${presentedBy(today)}. Think your build can win?`,
        url: "/daily",
      };
    case "reminder":
      return {
        title: "Sorza Daily",
        body: today.prize
          ? `${today.title} ends tonight, and the winner gets ${today.prize}. Have you submitted your ride?`
          : `${today.title} ends tonight. Have you submitted your ride?`,
        url: "/daily",
      };
    case "rides":
      return {
        title: "Rate the Ride",
        body: rides === 1 ? "A new ride is waiting for your rating." : `${rides || 3} new rides are waiting for your rating.`,
        url: "/daily/rate",
      };
  }
}

/** The hourly job's notification step: for everyone with push turned on,
 * send the morning or evening Daily push if it's due for them now. */
export async function sendDueDailyPushes(today: DailyChallenge, now: Date = new Date()): Promise<number> {
  const service = createServiceRoleClient();
  const [deviceUsers, browserUsers] = await Promise.all([
    listUserIdsWithDevicePushTokens(service),
    listUserIdsWithPushSubscriptions(service),
  ]);
  const userIds = [...new Set([...deviceUsers, ...browserUsers])];
  if (userIds.length === 0) return 0;

  const todayKey = today.challenge_date;
  const yesterday = await getDailyChallengeByDate(service, addDays(todayKey, -1));
  const [prefsByUser, log, todayEntries, yesterdayEntries, yesterdayVotes, yesterdayPlacements, rounds] =
    await Promise.all([
      loadPrefs(service, userIds),
      service.from("daily_push_log").select("user_id, kind").eq("day", todayKey).in("user_id", userIds),
      service.from("daily_submissions").select("user_id").eq("challenge_id", today.id),
      yesterday
        ? service.from("daily_submissions").select("user_id").eq("challenge_id", yesterday.id)
        : Promise.resolve({ data: [] as { user_id: string }[], error: null }),
      yesterday
        ? service.from("daily_votes").select("voter_id").eq("challenge_id", yesterday.id)
        : Promise.resolve({ data: [] as { voter_id: string }[], error: null }),
      yesterday
        ? service.from("daily_placements").select("user_id, place").eq("challenge_id", yesterday.id)
        : Promise.resolve({ data: [] as { user_id: string; place: number }[], error: null }),
      service.from("rate_ride_rounds").select("user_id, vehicle_ids").eq("round_date", todayKey).in("user_id", userIds),
    ]);

  const sentByUser = new Map<string, Set<ScheduledKind>>();
  for (const row of log.data ?? []) {
    if (row.kind === "vote") continue;
    const set = sentByUser.get(row.user_id) ?? new Set<ScheduledKind>();
    set.add(row.kind);
    sentByUser.set(row.user_id, set);
  }
  const enteredToday = new Set((todayEntries.data ?? []).map((r) => r.user_id));
  const participatedYesterday = new Set([
    ...(yesterdayEntries.data ?? []).map((r) => r.user_id),
    ...(yesterdayVotes.data ?? []).map((r) => r.voter_id),
  ]);
  const bestPlace = new Map<string, number>();
  for (const p of yesterdayPlacements.data ?? []) {
    bestPlace.set(p.user_id, Math.min(bestPlace.get(p.user_id) ?? 9, p.place));
  }
  const roundByUser = new Map((rounds.data ?? []).map((r) => [r.user_id, r.vehicle_ids]));

  // Who has finished today's rides: every car in their round rated.
  const roundVehicleIds = [...new Set([...roundByUser.values()].flat())];
  const { data: rideRatings } = roundVehicleIds.length
    ? await service.from("peer_ratings").select("rater_id, vehicle_id").in("vehicle_id", roundVehicleIds).in("rater_id", userIds)
    : { data: [] as { rater_id: string; vehicle_id: string }[] };
  const ratedByUser = new Map<string, Set<string>>();
  for (const r of rideRatings ?? []) {
    const set = ratedByUser.get(r.rater_id) ?? new Set<string>();
    set.add(r.vehicle_id);
    ratedByUser.set(r.rater_id, set);
  }

  const minutesLeft = Math.floor((new Date(today.ends_at).getTime() - now.getTime()) / 60_000);
  let sent = 0;

  const work = userIds.map((userId) => async () => {
    const { prefs, timeZone } = toPushPrefs(prefsByUser.get(userId));
    const round = roundByUser.get(userId);
    const rated = ratedByUser.get(userId) ?? new Set<string>();
    const state: DayState = {
      participatedYesterday: participatedYesterday.has(userId),
      placeYesterday: bestPlace.get(userId) ?? null,
      yesterdayHadWinner: bestPlace.size > 0,
      enteredToday: enteredToday.has(userId),
      ratedRidesToday: Boolean(round && round.length > 0 && round.every((id) => rated.has(id))),
      // A round is only built when they open Rate the Ride; until then
      // there's no reason to think the pool is empty.
      ridesAvailable: round ? round.length > 0 : true,
      minutesLeft,
    };
    const push = decideScheduledPush({
      localHour: localHourIn(timeZone, now),
      prefs,
      sent: sentByUser.get(userId) ?? new Set(),
      state,
    });
    if (!push) return;
    if (!(await claimLogSlot(service, userId, todayKey, push.kind))) return;
    const remaining = round ? round.filter((id) => !rated.has(id)).length : 3;
    await sendPushToUser(userId, payloadFor(push, today, yesterday, state.placeYesterday, remaining), push.category);
    sent += 1;
  });

  for (let i = 0; i < work.length; i += BATCH_SIZE) {
    await Promise.all(work.slice(i, i + BATCH_SIZE).map((run) => run().catch(() => undefined)));
  }
  return sent;
}

/** "Someone just voted for your build." Anonymous on purpose: votes are
 * private. Throttled (see mayNotifyVote) and skipped in quiet hours. */
export async function notifyEntryVote(ownerId: string, now: Date = new Date()): Promise<void> {
  try {
    const service = createServiceRoleClient();
    const day = dailyDateKey(now);
    const [prefsByUser, { data: log }] = await Promise.all([
      loadPrefs(service, [ownerId]),
      service.from("daily_push_log").select("sent_at, slot").eq("user_id", ownerId).eq("day", day).eq("kind", "vote"),
    ]);
    const { prefs, timeZone } = toPushPrefs(prefsByUser.get(ownerId));
    const sentTodayAt = (log ?? []).map((r) => new Date(r.sent_at));
    if (!mayNotifyVote({ prefs, localHour: localHourIn(timeZone, now), sentTodayAt, now })) return;
    if (!(await claimLogSlot(service, ownerId, day, "vote", sentTodayAt.length))) return;
    await sendPushToUser(
      ownerId,
      { title: "Sorza Daily", body: "Someone just voted for your build.", url: "/daily" },
      "daily_votes",
    );
  } catch (err) {
    console.error("notifyEntryVote failed:", err);
  }
}
