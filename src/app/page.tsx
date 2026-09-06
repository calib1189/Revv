import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { composeLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
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
      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/video/auth-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/55 to-background" />
        <div className="absolute inset-0 bg-background/20" />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Don&apos;t just post your build. Prove it.
          </h1>
          <p className="mt-5 max-w-lg text-balance text-lg text-muted">
            SORZA is the social platform built for your garage — log every mod as
            real build data, get an AI-rated score, and find the meets and shops
            happening near you.
          </p>

          <div className="mt-8 flex gap-3">
            <Link href="/signup">
              <Button className="px-6 py-2.5 text-base">Get started</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-6 py-2.5 text-base">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {topEntries.length > 0 && (
        <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Compete for the top spot
            </h2>
            <p className="mt-2 text-muted">
              Every build gets scored 0–100 by AI. Climb the ranks against
              everyone else on SORZA.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            {topEntries.map((entry, i) => (
              <LeaderboardRow key={entry.buildId} rank={i + 1} entry={entry} showCategory />
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Link href="/leaderboard">
              <Button variant="secondary">See the full leaderboard</Button>
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
