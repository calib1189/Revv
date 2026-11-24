import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVehiclesByIds, listLeaderboardVehicleIds } from "@/lib/db/vehicles";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listBuildRatingHistoryForBuilds } from "@/lib/db/build-rating-history";
import { sendPushToUser } from "@/lib/push/send";
import { listAfternoonPushRecipients, runInBatches } from "@/lib/push/afternoon";
import { claimLogSlot } from "@/lib/daily/notify";
import { dailyDateKey } from "@/lib/daily/day";
import {
  bestDropPerOwner,
  findRankDrops,
  gapToPlaceAbove,
  rankDropBody,
  scoreAsOf,
  type RankBoardEntry,
} from "@/lib/rating/rank-drops";
import { MY_ROW_HASH } from "@/lib/leaderboard/my-row";
import { vehicleDisplayName } from "@/lib/vehicles/display-name";

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** The hourly job's "your car got passed" step. For each person with push
 * on, whose afternoon it is and who hasn't had one today: if another
 * owner's car moved ahead of theirs on the overall leaderboard in the
 * last 24 hours, one push naming who passed them and where they stand.
 * Returns how many were sent. */
export async function sendDueRankPushes(now: Date = new Date()): Promise<number> {
  const service = createServiceRoleClient();
  const recipients = await listAfternoonPushRecipients(service, now);
  if (recipients.length === 0) return 0;

  const day = dailyDateKey(now);
  const log = await service
    .from("daily_push_log")
    .select("user_id")
    .eq("day", day)
    .eq("kind", "rank")
    .in("user_id", recipients);
  if (log.error) throw log.error;
  const sentToday = new Set(log.data.map((row) => row.user_id));
  const due = new Set(recipients.filter((id) => !sentToday.has(id)));
  // Most hours it's nobody's afternoon: skip rebuilding the board.
  if (due.size === 0) return 0;

  // The board as the leaderboard page builds it: active, rated builds on
  // approved cars.
  const approvedIds = await listLeaderboardVehicleIds(service);
  const builds = await listTopRatedBuilds(service, 1000, approvedIds);
  const vehicles = await listVehiclesByIds(service, builds.map((b) => b.vehicle_id));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const since = new Date(now.getTime() - WINDOW_MS);
  const changedIds = builds
    .filter((b) => b.ai_rating_rated_at && new Date(b.ai_rating_rated_at) > since)
    .map((b) => b.id);
  if (changedIds.length === 0) return 0;
  const history = await listBuildRatingHistoryForBuilds(service, changedIds);

  const board: RankBoardEntry[] = builds.flatMap((b) => {
    const vehicle = vehicleById.get(b.vehicle_id);
    if (!vehicle || b.ai_rating_score === null) return [];
    const scoreThen = scoreAsOf(
      { score: b.ai_rating_score, ratedAt: b.ai_rating_rated_at },
      history.filter((h) => h.buildId === b.id),
      since,
    );
    return [{ buildId: b.id, ownerId: vehicle.owner_id, scoreThen, scoreNow: b.ai_rating_score }];
  });

  const drops = bestDropPerOwner(findRankDrops(board)).filter((d) => due.has(d.ownerId));
  if (drops.length === 0) return 0;

  const buildById = new Map(builds.map((b) => [b.id, b]));
  const nowScores = board.map((e) => e.scoreNow);
  const vehicleOfBuild = (buildId: string) => vehicleById.get(buildById.get(buildId)?.vehicle_id ?? "");
  const passerOwnerIds = new Set(drops.flatMap((d) => d.passedBy.map((id) => vehicleOfBuild(id)?.owner_id ?? "")));
  const owners = await getProfilesByIds(service, [...passerOwnerIds].filter(Boolean));
  const usernameById = new Map(owners.map((p) => [p.id, p.username]));

  let sent = 0;
  const work = drops.map((drop) => async () => {
    const mine = vehicleOfBuild(drop.buildId);
    if (!mine) return;
    const passers = drop.passedBy.flatMap((id) => {
      const vehicle = vehicleOfBuild(id);
      const username = vehicle ? usernameById.get(vehicle.owner_id) : undefined;
      return vehicle && username ? [{ username, carName: vehicleDisplayName(vehicle) }] : [];
    });
    if (passers.length === 0) return;
    if (!(await claimLogSlot(service, drop.ownerId, day, "rank"))) return;
    const scoreNow = buildById.get(drop.buildId)?.ai_rating_score ?? null;
    const gap = scoreNow === null ? null : gapToPlaceAbove(scoreNow, nowScores);
    await sendPushToUser(
      drop.ownerId,
      {
        title: "SORZA",
        body: rankDropBody({ carName: vehicleDisplayName(mine), to: drop.to, passers, gap }),
        // Lands on their own row, not the top of the board.
        url: `/leaderboard${MY_ROW_HASH}`,
      },
      "leaderboard",
    );
    sent += 1;
  });

  await runInBatches(work);
  return sent;
}
