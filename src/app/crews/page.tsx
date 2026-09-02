import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listPublicCrews, getCrewsByIds } from "@/lib/db/crews";
import {
  listCrewIdsForUser,
  getCrewMemberCountsForCrews,
  listApprovedMembersForCrews,
} from "@/lib/db/crew-members";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listVehiclesByOwnerIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { maxScore } from "@/lib/crews/best-rank";
import { CrewDiscoverGrid, type CrewCardData } from "@/features/crews/crew-discover-grid";
import { CrewsPageTabs } from "@/features/crews/crews-page-tabs";
import { FlagIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { Crew } from "@/lib/db/crews";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

async function buildCardData(
  supabase: SupabaseClient<Database>,
  crews: Crew[],
): Promise<CrewCardData[]> {
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

  // Best rank in each crew, for the glowing border — every approved
  // member's best-rated vehicle, maxed within that crew. Batched across
  // the whole grid (one vehicles query, one builds query) rather than
  // per-card, same reasoning as getCrewMemberCountsForCrews.
  const memberUserIds = [...new Set(approvedMembers.map((m) => m.user_id))];
  const memberVehicles = await listVehiclesByOwnerIds(supabase, memberUserIds);
  const scoreByVehicleId = await listActiveBuildsByVehicleIds(
    supabase,
    memberVehicles.map((v) => v.id),
  );

  const vehicleIdsByOwner = new Map<string, string[]>();
  for (const vehicle of memberVehicles) {
    const list = vehicleIdsByOwner.get(vehicle.owner_id) ?? [];
    list.push(vehicle.id);
    vehicleIdsByOwner.set(vehicle.owner_id, list);
  }

  const memberIdsByCrew = new Map<string, string[]>();
  for (const member of approvedMembers) {
    const list = memberIdsByCrew.get(member.crew_id) ?? [];
    list.push(member.user_id);
    memberIdsByCrew.set(member.crew_id, list);
  }

  return crews.map((crew) => {
    const memberIds = memberIdsByCrew.get(crew.id) ?? [];
    const scores = memberIds.flatMap((userId) =>
      (vehicleIdsByOwner.get(userId) ?? []).map((vehicleId) => scoreByVehicleId.get(vehicleId)?.ai_rating_score ?? null),
    );
    return {
      crew,
      logoUrl: crew.logo_media_id ? (logoUrlById.get(crew.logo_media_id) ?? null) : null,
      bannerUrl: crew.banner_media_id ? (bannerUrlById.get(crew.banner_media_id) ?? null) : null,
      memberCount: memberCounts.get(crew.id) ?? 0,
      bestScore: maxScore(scores),
    };
  });
}

export default async function CrewsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [publicCrews, yourCrewIds] = await Promise.all([
    listPublicCrews(supabase),
    user ? listCrewIdsForUser(supabase, user.id) : Promise.resolve([]),
  ]);
  const yourCrews = user ? await getCrewsByIds(supabase, yourCrewIds) : [];

  const [yourCardData, publicCardData] = await Promise.all([
    buildCardData(supabase, yourCrews),
    buildCardData(supabase, publicCrews),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
            <FlagIcon className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crews</h1>
        </div>
        <Link href="/crews/new">
          <Button className="px-4 py-2 text-sm">Create a crew</Button>
        </Link>
      </div>

      {user && yourCardData.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your crews</h2>
          <CrewDiscoverGrid crews={yourCardData} showFilter={false} />
        </div>
      )}

      {publicCardData.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
            <FlagIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-medium">No crews yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              Start one around your car, your area, or your scene.
            </p>
          </div>
          <Link href="/crews/new">
            <Button>Create the first crew</Button>
          </Link>
        </div>
      ) : (
        <CrewsPageTabs crews={publicCardData} />
      )}
    </div>
  );
}
