import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { composeLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import { RankFrame } from "@/features/garage/rank-frame";
import { Button } from "@/components/ui/button";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { WrenchIcon, GemIcon, CompassIcon } from "@/components/ui/icons";

/** A handful of real top-rated builds for the showcase strip below the
 * hero — never placeholder cars (CLAUDE.md: never present mock output
 * as real). Best-effort: an empty result just means that section
 * doesn't render, never a broken landing page. */
async function getShowcaseBuilds(): Promise<LeaderboardEntry[]> {
  try {
    const supabase = await createClient();
    const builds = await listTopRatedBuilds(supabase, 8);
    const entries = await composeLeaderboard(supabase, builds);
    return entries.filter((e) => e.heroUrl).slice(0, 6);
  } catch (err) {
    console.error("Landing page showcase fetch failed:", err);
    return [];
  }
}

const VALUE_PROPS = [
  {
    icon: WrenchIcon,
    title: "Real build data",
    description: "Every mod logged as structured data — part, price, install date — not just a caption.",
  },
  {
    icon: CompassIcon,
    title: "Local car culture",
    description: "Real car meets and local shops — mechanics, tint, body work — happening near you.",
  },
  {
    icon: GemIcon,
    title: "AI-rated builds",
    description: "An AI vision model scores your build 0–100. Climb the tiers from Bronze to Cosmic.",
  },
];

export default async function LandingPage() {
  const configured = isSupabaseConfigured();
  if (configured) {
    const user = await getCurrentUser();
    if (user) redirect("/feed");
  }

  const showcase = configured ? await getShowcaseBuilds() : [];

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
            Your build. Documented. Rated. Seen.
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

      {showcase.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Real builds. Rated by AI.
            </h2>
            <p className="mt-2 text-muted">
              Every score below comes from an actual SORZA garage — nothing staged.
            </p>
          </div>

          <div className="no-scrollbar mt-10 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible">
            {showcase.map((entry, i) => (
              <Link
                key={entry.buildId}
                href={`/garage/${entry.vehicleId}`}
                className="group w-[72vw] flex-shrink-0 sm:w-auto"
              >
                <RankFrame score={entry.score} compact>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface">
                    {entry.heroUrl && (
                      <Image
                        src={entry.heroUrl}
                        alt={entry.vehicleTitle}
                        fill
                        priority={i === 0}
                        sizes="(min-width: 640px) 33vw, 72vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="truncate text-sm font-medium text-white">{entry.vehicleTitle}</p>
                      <p className="truncate text-xs text-white/70">@{entry.ownerUsername}</p>
                    </div>
                  </div>
                </RankFrame>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="glass flex flex-col gap-2.5 rounded-2xl p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-accent">
                <prop.icon className="h-4 w-4" />
              </span>
              <p className="font-medium">{prop.title}</p>
              <p className="text-sm text-muted">{prop.description}</p>
            </div>
          ))}
        </div>
      </section>

      {!configured && (
        <div className="mx-auto w-full max-w-sm px-6 pb-16">
          <SupabaseNotConfigured />
        </div>
      )}
    </div>
  );
}
