import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listVehiclesByOwnerIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";

/** owner_id -> highest ai_rating_score across all of that owner's
 * vehicles' active builds (nulls skipped) — the same "best build wins"
 * rule the profile page (app/u/[username]/page.tsx) uses for its rank
 * badge, batched across many owners at once for list contexts like a
 * comment thread. Feed straight into RankFrame (features/garage/
 * rank-frame.tsx), which already treats a null score as "no badge". */
export async function getBestRatingScoresByOwnerIds(
  supabase: SupabaseClient<Database>,
  ownerIds: string[],
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(ownerIds)];
  if (uniqueIds.length === 0) return new Map();

  const vehicles = await listVehiclesByOwnerIds(supabase, uniqueIds);
  const activeBuildByVehicle = await listActiveBuildsByVehicleIds(
    supabase,
    vehicles.map((v) => v.id),
  );

  const scores = new Map<string, number>();
  for (const vehicle of vehicles) {
    const score = activeBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null;
    if (score == null) continue;
    const best = scores.get(vehicle.owner_id);
    if (best == null || score > best) scores.set(vehicle.owner_id, score);
  }
  return scores;
}
