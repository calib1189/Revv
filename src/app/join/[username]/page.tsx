import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { RANK_LABELS, rankForScore } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import { Avatar } from "@/features/feed/avatar";
import { RememberInviter } from "@/features/invites/remember-inviter";
import { MediaImg } from "@/components/ui/media-img";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const name = decodeURIComponent(username).toLowerCase();
  return {
    title: `@${name} invited you to SORZA`,
    description: "Log your build, get it rated by AI, and see where it ranks.",
    robots: { index: false },
  };
}

/** Where an invite link lands: whose invite it is, their car, and the
 * way in. Remembers the inviter so the welcome screen can credit them. */
export default async function JoinPage({ params }: Props) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw).toLowerCase();
  const supabase = await createClient();
  const [inviter, viewer] = await Promise.all([
    getProfileByUsername(supabase, username).catch(() => null),
    getCurrentUser(),
  ]);
  if (!inviter || inviter.is_banned) notFound();

  // Their best-rated car, to show what SORZA does at a glance.
  const vehicles = await listVehiclesByOwner(supabase, inviter.id).catch(() => []);
  const builds = await listActiveBuildsByVehicleIds(
    supabase,
    vehicles.map((v) => v.id),
  ).catch(() => new Map());
  const rated = vehicles
    .map((v) => ({ vehicle: v, score: builds.get(v.id)?.ai_rating_score ?? null }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const featured = rated.find((r) => r.vehicle.hero_media_id) ?? rated[0] ?? null;

  const media = await getMediaByIds(
    supabase,
    [inviter.avatar_media_id, featured?.vehicle.hero_media_id].filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const urlFor = (id: string | null | undefined) => {
    const m = id ? media.find((x) => x.id === id) : null;
    return m ? publicMediaUrl(supabase, m.storage_path) : null;
  };
  const avatarUrl = urlFor(inviter.avatar_media_id);
  const carUrl = urlFor(featured?.vehicle.hero_media_id);
  const carName = featured
    ? [featured.vehicle.year, featured.vehicle.make, featured.vehicle.model].filter(Boolean).join(" ")
    : null;
  const isSelf = viewer?.id === inviter.id;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      {!viewer && <RememberInviter username={inviter.username} />}

      <div className="animate-section-rise glass-raised elev-3 overflow-hidden rounded-[32px]">
        {carUrl ? (
          <div className="relative aspect-[4/3] w-full bg-surface">
            <MediaImg src={carUrl} sizes="(max-width: 640px) 100vw, 384px" className="h-full w-full object-cover" loading="eager" />
            {featured?.score != null && (
              <span className="numeral absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-[0.8125rem] font-semibold text-white backdrop-blur">
                {formatScore(featured.score)} · {RANK_LABELS[rankForScore(featured.score)]}
              </span>
            )}
          </div>
        ) : (
          <div className="flex justify-center pt-8">
            <Image src="/logo-full-v2.png" alt="SORZA" width={120} height={120} quality={100} priority />
          </div>
        )}

        <div className="flex flex-col items-center px-6 pb-7 pt-6 text-center">
          <Avatar username={inviter.username} avatarUrl={avatarUrl} className="h-16 w-16 text-2xl" />
          <h1 className="mt-3 text-balance text-[1.5rem] font-bold leading-tight tracking-[-0.025em]">
            @{inviter.username} invited you to SORZA
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-snug text-muted">
            {carName ? `See their ${carName}, then log your own build. ` : "Log your build. "}
            AI rates it out of 100 and ranks it against everyone else&apos;s.
          </p>

          {isSelf ? (
            <>
              <p className="mt-6 text-[0.875rem] text-muted">This is your invite link.</p>
              <Link href="/invite" className="mt-3 w-full">
                <Button className="h-12 w-full text-[1rem] font-semibold">See your invites</Button>
              </Link>
            </>
          ) : viewer ? (
            <Link href={`/u/${inviter.username}`} className="mt-6 w-full">
              <Button className="h-12 w-full text-[1rem] font-semibold">See @{inviter.username}&apos;s profile</Button>
            </Link>
          ) : (
            <>
              <Link href="/signup" className="mt-6 w-full">
                <Button className="h-12 w-full text-[1rem] font-semibold">Create your account</Button>
              </Link>
              <Link href="/get" className="mt-3 w-full">
                <Button variant="secondary" className="h-12 w-full text-[1rem] font-semibold">
                  Get the iPhone app
                </Button>
              </Link>
              <p className="mt-4 text-[0.8125rem] leading-snug text-muted">
                Signing up in the app? Enter <span className="font-semibold text-foreground">@{inviter.username}</span>{" "}
                when it asks who invited you.
              </p>
              <p className="mt-4 text-[0.875rem] text-muted">
                Already on SORZA?{" "}
                <Link href="/login" className="font-semibold text-accent">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
