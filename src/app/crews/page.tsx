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
import { FlagIcon, PlusIcon } from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-muted">Clubs, scenes, and local groups</p>
          <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">Crews</h1>
        </div>
        <Link
          href="/crews/new"
          aria-label="Create a crew"
          title="Create a crew"
          className="pressable mb-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground elev-2"
        >
          <PlusIcon className="h-5 w-5" />
        </Link>
      </header>

      {user && yourCardData.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Your crews</SectionTitle>
          <CrewDiscoverGrid crews={yourCardData} showFilter={false} />
        </section>
      )}

      {publicCardData.length === 0 ? (
        <EmptyState
          card
          icon={<FlagIcon />}
          title="No crews yet"
          body="Start one around your car, your area, or your scene."
          action={
            <Link href="/crews/new">
              <Button className="px-5">Create the first crew</Button>
            </Link>
          }
        />
      ) : (
        <CrewsPageTabs crews={publicCardData} />
      )}
    </div>
  );
}
