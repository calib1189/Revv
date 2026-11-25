import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Crew } from "@/lib/db/crews";
import { getCrewMemberCountsForCrews, listApprovedMembersForCrews, listCrewIdsForUser } from "@/lib/db/crew-members";
import { getCrewsByIds } from "@/lib/db/crews";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listVehiclesByOwnerIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { maxScore } from "@/lib/crews/best-rank";
import { crewScore, type CrewScore } from "@/lib/crews/crew-score";

/** What a list of crews needs to show each one: images, size, and the
 * crew score (lib/crews/crew-score.ts), all computed at read time. */
export interface CrewStats {
  crew: Crew;
  logoUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  /** The single best rated build among the members. */
  bestScore: number | null;
  score: CrewScore;
}

/** Batched across every crew given: one query per table, not per crew. */
export async function getCrewStats(supabase: SupabaseClient<Database>, crews: Crew[]): Promise<CrewStats[]> {
  if (crews.length === 0) return [];

  const crewIds = crews.map((c) => c.id);
  const logoIds = crews.map((c) => c.logo_media_id).filter((id): id is string => Boolean(id));
  const bannerIds = crews.map((c) => c.banner_media_id).filter((id): id is string => Boolean(id));
  const [logoMedia, bannerMedia, memberCounts, approvedMembers] = await Promise.all([
    getMediaByIds(supabase, logoIds),
    getMediaByIds(supabase, bannerIds),
    getCrewMemberCountsForCrews(supabase, crewIds),
    listApprovedMembersForCrews(supabase, crewIds),
  ]);
  const logoUrlById = new Map(logoMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const bannerUrlById = new Map(bannerMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const memberUserIds = [...new Set(approvedMembers.map((m) => m.user_id))];
  const memberVehicles = await listVehiclesByOwnerIds(supabase, memberUserIds);
  const scoreByVehicleId = await listActiveBuildsByVehicleIds(
    supabase,
    memberVehicles.map((v) => v.id),
  );

  // Each member's best build across their whole garage.
  const bestByUser = new Map<string, number | null>();
  for (const userId of memberUserIds) {
    const scores = memberVehicles
      .filter((v) => v.owner_id === userId)
      .map((v) => scoreByVehicleId.get(v.id)?.ai_rating_score ?? null);
    bestByUser.set(userId, maxScore(scores));
  }

  return crews.map((crew) => {
    const memberBest = approvedMembers.filter((m) => m.crew_id === crew.id).map((m) => bestByUser.get(m.user_id) ?? null);
    return {
      crew,
      logoUrl: crew.logo_media_id ? (logoUrlById.get(crew.logo_media_id) ?? null) : null,
      bannerUrl: crew.banner_media_id ? (bannerUrlById.get(crew.banner_media_id) ?? null) : null,
      memberCount: memberCounts.get(crew.id) ?? 0,
      bestScore: maxScore(memberBest),
      score: crewScore(memberBest),
    };
  });
}

/** The crew someone is shown with: the one they run, otherwise the one
 * they joined most recently. Null if they're in none (or none this viewer
 * can see). */
export async function getPrimaryCrewForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ crew: Crew; logoUrl: string | null } | null> {
  const ids = await listCrewIdsForUser(supabase, userId);
  if (ids.length === 0) return null;
  const crews = await getCrewsByIds(supabase, ids);
  if (crews.length === 0) return null;
  const order = new Map(ids.map((id, i) => [id, i]));
  const crew =
    crews.find((c) => c.owner_id === userId) ?? [...crews].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))[0];
  const logo = crew.logo_media_id ? (await getMediaByIds(supabase, [crew.logo_media_id]))[0] : undefined;
  return { crew, logoUrl: logo ? publicMediaUrl(supabase, logo.storage_path) : null };
}
