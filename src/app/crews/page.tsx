import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listPublicCrews, getCrewsByIds } from "@/lib/db/crews";
import { listCrewIdsForUser, getCrewMemberCountsForCrews } from "@/lib/db/crew-members";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { CrewCard } from "@/features/crews/crew-card";
import { Button } from "@/components/ui/button";
import type { Crew } from "@/lib/db/crews";

async function CrewGrid({
  crews,
  supabase,
}: {
  crews: Crew[];
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const logoIds = crews.map((c) => c.logo_media_id).filter((id): id is string => Boolean(id));
  const [logoMedia, memberCounts] = await Promise.all([
    getMediaByIds(supabase, logoIds),
    getCrewMemberCountsForCrews(
      supabase,
      crews.map((c) => c.id),
    ),
  ]);
  const logoUrlById = new Map(logoMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {crews.map((crew) => (
        <CrewCard
          key={crew.id}
          crew={crew}
          logoUrl={crew.logo_media_id ? (logoUrlById.get(crew.logo_media_id) ?? null) : null}
          memberCount={memberCounts.get(crew.id) ?? 0}
        />
      ))}
    </div>
  );
}

export default async function CrewsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [publicCrews, yourCrewIds] = await Promise.all([
    listPublicCrews(supabase),
    user ? listCrewIdsForUser(supabase, user.id) : Promise.resolve([]),
  ]);
  const yourCrews = user ? await getCrewsByIds(supabase, yourCrewIds) : [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crews</h1>
        <Link href="/crews/new">
          <Button className="px-3 py-1.5 text-sm">Create a crew</Button>
        </Link>
      </div>

      {user && yourCrews.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your crews</h2>
          <CrewGrid crews={yourCrews} supabase={supabase} />
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Discover</h2>
      {publicCrews.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No crews yet</p>
          <p className="max-w-xs text-sm text-muted">
            Start one around your car, your area, or your scene.
          </p>
          <Link href="/crews/new">
            <Button>Create the first crew</Button>
          </Link>
        </div>
      ) : (
        <CrewGrid crews={publicCrews} supabase={supabase} />
      )}
    </div>
  );
}
