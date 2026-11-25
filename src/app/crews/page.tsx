import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listPublicCrews, getCrewsByIds } from "@/lib/db/crews";
import { CrewDiscoverGrid } from "@/features/crews/crew-discover-grid";
import { listCrewIdsForUser } from "@/lib/db/crew-members";
import { getCrewStats } from "@/lib/db/crew-stats";
import { CrewsPageTabs } from "@/features/crews/crews-page-tabs";
import { FlagIcon, PlusIcon } from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function CrewsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [publicCrews, yourCrewIds] = await Promise.all([
    listPublicCrews(supabase),
    user ? listCrewIdsForUser(supabase, user.id) : Promise.resolve([]),
  ]);
  const yourCrews = user ? await getCrewsByIds(supabase, yourCrewIds) : [];

  const [yourCardData, unsortedPublic] = await Promise.all([
    getCrewStats(supabase, yourCrews),
    getCrewStats(supabase, publicCrews),
  ]);
  // Strongest crews first, then the biggest.
  const publicCardData = [...unsortedPublic].sort(
    (a, b) => (b.score.score ?? -1) - (a.score.score ?? -1) || b.memberCount - a.memberCount,
  );

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
        // Someone already in a (private) crew saw "No crews yet" right
        // under their own crew. The empty state is about crews to join.
        yourCardData.length > 0 ? (
          <EmptyState
            card
            icon={<FlagIcon />}
            title="No crews to join yet"
            body="Public crews other people start will show up here."
            action={
              <Link href="/crews/new">
                <Button variant="secondary" className="px-5">Start another crew</Button>
              </Link>
            }
          />
        ) : (
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
        )
      ) : (
        <CrewsPageTabs crews={publicCardData} />
      )}
    </div>
  );
}
