import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { listMainBoardVehicleIds, listVehiclesByIds } from "@/lib/db/vehicles";
import { listTopRatedBuilds } from "@/lib/db/builds";
import {
  assignPriority,
  claimBattleSettlement,
  claimPriorityRefund,
  createBattle,
  getBattleByDate,
  listBattleVotes,
  listLastBattleDates,
  listOpenPriority,
  listUnsettledEndedBattles,
  type Battle,
} from "@/lib/db/battles";
import { SKIP_LINE } from "@/lib/battles/skip-line";
import { awardDailyPoints } from "@/lib/db/daily-activity";
import { claimLogSlot } from "@/lib/daily/notify";
import { dailyDateKey, dayBounds } from "@/lib/daily/day";
import { sendPushToUser } from "@/lib/push/send";
import { vehicleDisplayName } from "@/lib/vehicles/display-name";
import { hasTimeForBattle, pickMatchup } from "@/lib/battles/match";
import { battleOutcome, battlePayouts, votePercents } from "@/lib/battles/result";

/** The hourly job's Build Battle step (api/cron/daily). Sets today's
 * battle if there isn't one: approved cars with a score and a cover
 * photo, matched by lib/battles/match. Alerts both owners once. Returns
 * the battle, or null when there aren't two cars to pair. */
export async function ensureTodayBattle(now: Date = new Date()): Promise<Battle | null> {
  const service = createServiceRoleClient();
  const dateKey = dailyDateKey(now);
  const existing = await getBattleByDate(service, dateKey);
  if (existing) return existing;
  const { startsAt, endsAt } = dayBounds(dateKey);
  // Too late in the day for a fair vote: tomorrow's battle opens at midnight.
  if (!hasTimeForBattle(endsAt, now)) return null;

  const approvedIds = await listMainBoardVehicleIds(service);
  const builds = await listTopRatedBuilds(service, 1000, approvedIds);
  const vehicles = await listVehiclesByIds(
    service,
    builds.map((b) => b.vehicle_id),
  );
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const lastBattled = await listLastBattleDates(service);

  const candidates = builds.flatMap((b) => {
    const v = vehicleById.get(b.vehicle_id);
    if (!v || !v.hero_media_id || b.ai_rating_score == null) return [];
    return [
      {
        vehicleId: v.id,
        ownerId: v.owner_id,
        score: Number(b.ai_rating_score),
        category: v.category ?? "cars",
        lastBattledOn: lastBattled.get(v.id) ?? null,
      },
    ];
  });
  // The first paid spot whose car can still battle leads today.
  const paid = (await listOpenPriority(service)).find((p) => candidates.some((c) => c.vehicleId === p.vehicle_id));
  const match = pickMatchup(candidates, dateKey, paid?.vehicle_id ?? null);
  if (!match) return null;

  const created = await createBattle(service, {
    battle_date: dateKey,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    vehicle_a_id: match.a.vehicleId,
    vehicle_b_id: match.b.vehicleId,
    score_a: match.a.score,
    score_b: match.b.score,
  });
  if (!created) return getBattleByDate(service, dateKey);
  if (paid && created.vehicle_a_id === paid.vehicle_id) {
    await assignPriority(service, paid.id, created.id).catch((err) => console.error("assignPriority failed:", err));
  }

  // Only the run that created it tells the owners.
  const nameOf = (id: string) => {
    const v = vehicleById.get(id);
    return v ? vehicleDisplayName(v) : "car";
  };
  for (const [mine, theirs] of [
    [match.a, match.b],
    [match.b, match.a],
  ] as const) {
    try {
      await service.from("notifications").insert({
        user_id: mine.ownerId,
        kind: "battle_entered",
        actor_id: null,
        target_type: "battle",
        target_id: created.id,
      });
      if (await claimLogSlot(service, mine.ownerId, dateKey, "battle", 0)) {
        await sendPushToUser(
          mine.ownerId,
          {
            title: "Your car is in today's Build Battle",
            body: `Your ${nameOf(mine.vehicleId)} is up against a ${nameOf(theirs.vehicleId)}. Share it and get your votes in.`,
            url: `/battle/${created.id}`,
          },
          "daily_challenge",
        );
      }
    } catch (err) {
      console.error("battle owner alert failed:", err);
    }
  }
  return created;
}

/** Settles every ended battle once: pays the winner's owner and everyone
 * who called it, and tells both owners how it went. Returns how many
 * were settled. */
export async function settleDueBattles(now: Date = new Date()): Promise<number> {
  const service = createServiceRoleClient();
  const due = await listUnsettledEndedBattles(service);
  let settled = 0;

  for (const battle of due) {
    if (!(await claimBattleSettlement(service, battle.id))) continue;
    settled += 1;
    try {
      const votes = await listBattleVotes(service, battle.id);
      const outcome = battleOutcome(
        {
          vehicleAId: battle.vehicle_a_id,
          vehicleBId: battle.vehicle_b_id,
          scoreA: Number(battle.score_a),
          scoreB: Number(battle.score_b),
        },
        {
          a: votes.filter((v) => v.vehicleId === battle.vehicle_a_id).length,
          b: votes.filter((v) => v.vehicleId === battle.vehicle_b_id).length,
        },
      );
      const vehicles = await listVehiclesByIds(service, [battle.vehicle_a_id, battle.vehicle_b_id]);
      const ownerByVehicle = Object.fromEntries(vehicles.map((v) => [v.id, v.owner_id]));

      for (const p of battlePayouts(outcome, votes, ownerByVehicle)) {
        await awardDailyPoints(p.userId, `${p.key}:${battle.battle_date}`, p.amount).catch((err) =>
          console.error("battle payout failed:", err),
        );
      }

      if (outcome.winnerId && outcome.loserId) {
        const winner = vehicles.find((v) => v.id === outcome.winnerId);
        const loser = vehicles.find((v) => v.id === outcome.loserId);
        const [pa, pb] = votePercents(outcome.a, outcome.b);
        const score = outcome.winnerId === battle.vehicle_a_id ? `${pa}–${pb}` : `${pb}–${pa}`;
        if (winner) {
          await service.from("notifications").insert({
            user_id: winner.owner_id,
            kind: outcome.upset ? "battle_upset" : "battle_won",
            actor_id: null,
            target_type: "battle",
            target_id: battle.id,
          });
          if (await claimLogSlot(service, winner.owner_id, dailyDateKey(now), "battle", 1)) {
            await sendPushToUser(
              winner.owner_id,
              {
                title: outcome.upset ? "Upset! Your car won its Build Battle" : "Your car won its Build Battle",
                body: `Your ${vehicleDisplayName(winner)} won ${score}${loser ? ` over a ${vehicleDisplayName(loser)}` : ""}.`,
                url: `/battle/${battle.id}`,
              },
              "daily_results",
            );
          }
        }
        if (loser) {
          await service.from("notifications").insert({
            user_id: loser.owner_id,
            kind: "battle_lost",
            actor_id: null,
            target_type: "battle",
            target_id: battle.id,
          });
        }
      }
    } catch (err) {
      console.error("settling battle failed:", battle.id, err);
    }
  }
  return settled;
}

/** Gives back the points for paid spots that didn't get a battle within
 * SKIP_LINE.expiresDays: the charge is removed (like a failed re-rate)
 * and the owner is told. Returns how many were refunded. */
export async function refundExpiredPriority(now: Date = new Date()): Promise<number> {
  const service = createServiceRoleClient();
  const cutoff = now.getTime() - SKIP_LINE.expiresDays * 86_400_000;
  const expired = (await listOpenPriority(service)).filter((p) => Date.parse(p.created_at) <= cutoff);
  let refunded = 0;
  for (const spot of expired) {
    if (!(await claimPriorityRefund(service, spot.id))) continue;
    const { error } = await service
      .from("points_ledger")
      .delete()
      .eq("user_id", spot.user_id)
      .eq("source_type", "battle_priority")
      .eq("source_id", spot.id);
    if (error) {
      console.error("skip line refund failed:", spot.id, error);
      continue;
    }
    refunded += 1;
    await service
      .from("notifications")
      .insert({ user_id: spot.user_id, kind: "battle_refunded", actor_id: null, target_type: "vehicle", target_id: spot.vehicle_id })
      .then(({ error: e }) => e && console.error("refund notice failed:", e));
  }
  return refunded;
}
