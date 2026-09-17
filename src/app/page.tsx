import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { composeLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
import { LeaderboardHeroCard } from "@/features/leaderboard/leaderboard-hero-card";
import { Button } from "@/components/ui/button";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";

/** The real top 5 — never placeholder rows (CLAUDE.md: never present
 * mock output as real). Gated by the same ownership-verification check
 * the real /leaderboard page uses (leaderboard-page-content.tsx): a
 * build that isn't eligible there shouldn't get a podium spot here
 * either, or a visitor who clicks through to "See the full leaderboard"
 * would find the #1 build they just saw is nowhere on the real page.
 * Best-effort: an empty result just means the preview doesn't render,
 * never a broken landing page. */
async function getTopEntries(): Promise<LeaderboardEntry[]> {
  try {
    const supabase = await createClient();
    const verifiedVehicleIds = await listVerifiedVehicleIds(supabase);
    const builds = await listTopRatedBuilds(supabase, 5, verifiedVehicleIds);
    return composeLeaderboard(supabase, builds);
  } catch (err) {
    console.error("Landing page leaderboard fetch failed:", err);
    return [];
  }
}

export default async function LandingPage() {
  const configured = isSupabaseConfigured();
  if (configured) {
    const user = await getCurrentUser();
    if (user) redirect("/feed");
  }

  const topEntries = configured ? await getTopEntries() : [];

  return (
    <div className="flex flex-1 flex-col">
      {/* svh, not vh: on iOS the URL bar makes vh taller than what's
          actually on screen, so a vh-sized hero pushes its own content
          under the fold on the exact devices this app is built for. */}
      <section className="relative flex min-h-[88svh] flex-col justify-end overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/video/auth-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* One bottom-weighted scrim instead of three stacked flat
            overlays. The old stack sat at ~75-90% opacity over the whole
            frame, which turned real footage into grey mud — and ended on
            a hard horizontal seam where the hero met the section below.
            Landing on solid --background at the bottom makes that seam
            disappear, while the top stays clear enough to actually read
            as video. */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />

        <div className="relative mx-auto w-full max-w-3xl px-6 pb-16 sm:pb-24">
          <h1 className="max-w-2xl text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-7xl">
            Don&apos;t just post your build. Prove it.
          </h1>
          <p className="mt-5 max-w-md text-balance text-lg leading-relaxed text-white/75">
            Log every mod as real build data, get an AI-rated score, and climb the
            board against every other build on SORZA.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button className="px-7 py-3 text-base">Get started</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-7 py-3 text-base">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {topEntries.length > 0 && (
        <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="micro-label mb-3 text-accent">Live board</p>
          <h2 className="text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            Compete for the top spot
          </h2>
          <p className="mt-3 max-w-md text-muted">
            Every build gets scored 0–100 by AI. Climb the ranks against everyone
            else on SORZA.
          </p>

          <div className="mt-8 flex flex-col gap-2">
            <LeaderboardHeroCard entry={topEntries[0]} />
            {topEntries.slice(1).map((entry, i) => (
              <LeaderboardRow key={entry.buildId} rank={i + 2} entry={entry} showCategory />
            ))}
          </div>

          <div className="mt-8">
            <Link href="/leaderboard">
              <Button variant="secondary" className="px-5 py-2.5">
                See the full leaderboard
              </Button>
            </Link>
          </div>
        </section>
      )}

      {!configured && (
        <div className="mx-auto w-full max-w-sm px-6 pb-16">
          <SupabaseNotConfigured />
        </div>
      )}
    </div>
  );
}
