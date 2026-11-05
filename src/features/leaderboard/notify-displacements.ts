import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVehiclesByIds, listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { sendPushToUser } from "@/lib/push/send";
import {
  LEADERBOARD_TOP_SIZE,
  findLeaderboardDisplacements,
} from "@/lib/rating/leaderboard-displacement";
import { vehicleDisplayName } from "@/lib/vehicles/display-name";

/** After `vehicleId`'s build moves from `oldScore` to `newScore`, tells
 * the owners who just lost #1 or dropped out of the top 10 of the
 * overall leaderboard. Nobody else hears about it (see
 * findLeaderboardDisplacements for why that keeps it quiet).
 *
 * Uses the leaderboard's own eligibility rule: verified vehicles only.
 * An unverified car isn't on the board, so its rating moves nobody.
 * Best-effort: a failure here never touches the rating itself. */
export async function notifyLeaderboardDisplacements(
  vehicleId: string,
  actorId: string,
  oldScore: number | null,
  newScore: number,
): Promise<void> {
  try {
    const service = createServiceRoleClient();
    const verifiedIds = await listVerifiedVehicleIds(service);
    if (!verifiedIds.includes(vehicleId)) return;

    // Only builds ranked inside the top 10 can lose a top-10 spot, and
    // their rank depends only on the scores above them, so the top
    // eleven other builds are the whole relevant board.
    const others = await listTopRatedBuilds(
      service,
      LEADERBOARD_TOP_SIZE + 1,
      verifiedIds.filter((id) => id !== vehicleId),
    );
    const displaced = findLeaderboardDisplacements(
      others
        .filter((b): b is typeof b & { ai_rating_score: number } => b.ai_rating_score !== null)
        .map((b) => ({ buildId: b.id, score: b.ai_rating_score })),
      oldScore,
      newScore,
    );
    if (displaced.length === 0) return;

    const vehicleIdByBuild = new Map(others.map((b) => [b.id, b.vehicle_id]));
    const vehicles = await listVehiclesByIds(
      service,
      displaced.map((d) => vehicleIdByBuild.get(d.buildId)).filter((id): id is string => Boolean(id)),
    );
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

    await Promise.allSettled(
      displaced.map(async (d) => {
        const vehicle = vehicleById.get(vehicleIdByBuild.get(d.buildId) ?? "");
        // Passing your own other car is not something to be told about.
        if (!vehicle || vehicle.owner_id === actorId) return;
        const name = vehicleDisplayName(vehicle);
        await sendPushToUser(
          vehicle.owner_id,
          {
            title: "SORZA",
            body:
              d.lost === "first"
                ? `Your ${name} just lost #1 on the leaderboard`
                : `Your ${name} was pushed out of the top 10`,
            url: "/leaderboard",
          },
          "leaderboard",
        );
      }),
    );
  } catch (err) {
    console.error("notifyLeaderboardDisplacements failed:", err);
  }
}
