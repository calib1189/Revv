import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getCrewById } from "@/lib/db/crews";
import {
  getCrewMembership,
  getCrewMemberRole,
  getCrewMemberCount,
  listCrewMembers,
} from "@/lib/db/crew-members";
import { listCrewFeedPosts } from "@/lib/db/posts";
import { listCrewMeetups } from "@/lib/db/meetups";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listVehiclesByOwnerIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { composeThumbnails } from "@/lib/feed/compose-thumbnails";
import { CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import { maxScore } from "@/lib/crews/best-rank";
import { JoinButton } from "@/features/crews/join-button";
import { CrewTabs, type CrewTabMember } from "@/features/crews/crew-tabs";
import type { CrewCarItem } from "@/features/crews/crew-cars-grid";
import { Button } from "@/components/ui/button";
import { PinIcon, LockIcon, GlobeIcon } from "@/components/ui/icons";

export default async function CrewPage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = await params;
  const supabase = await createClient();

  const [crew, currentUser] = await Promise.all([getCrewById(supabase, crewId), getCurrentUser()]);
  if (!crew) notFound();

  const isOwner = currentUser?.id === crew.owner_id;

  const [membership, viewerRole, memberCount, members, posts, events] = await Promise.all([
    currentUser ? getCrewMembership(supabase, crewId, currentUser.id) : Promise.resolve(null),
    currentUser ? getCrewMemberRole(supabase, crewId, currentUser.id) : Promise.resolve(null),
    getCrewMemberCount(supabase, crewId),
    listCrewMembers(supabase, crewId),
    listCrewFeedPosts(supabase, crewId),
    listCrewMeetups(supabase, crewId),
  ]);

  const canManageMembers = viewerRole === "leader" || viewerRole === "admin";

  const memberUserIds = members.map((m) => m.user_id);
  const [profiles, memberVehicles, postThumbnails] = await Promise.all([
    getProfilesByIds(supabase, memberUserIds),
    listVehiclesByOwnerIds(supabase, memberUserIds),
    composeThumbnails(supabase, posts),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const heroIds = memberVehicles.map((v) => v.hero_media_id).filter((id): id is string => Boolean(id));
  const avatarIds = profiles.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id));
  const [heroMedia, avatarMedia, logoMedia, bannerMedia, scoreByVehicleId] = await Promise.all([
    getMediaByIds(supabase, heroIds),
    getMediaByIds(supabase, avatarIds),
    crew.logo_media_id ? getMediaByIds(supabase, [crew.logo_media_id]) : Promise.resolve([]),
    crew.banner_media_id ? getMediaByIds(supabase, [crew.banner_media_id]) : Promise.resolve([]),
    listActiveBuildsByVehicleIds(
      supabase,
      memberVehicles.map((v) => v.id),
    ),
  ]);
  const heroUrlById = new Map(heroMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const avatarUrlById = new Map(avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const logoUrl = logoMedia[0] ? publicMediaUrl(supabase, logoMedia[0].storage_path) : null;
  const bannerUrl = bannerMedia[0] ? publicMediaUrl(supabase, bannerMedia[0].storage_path) : null;

  const vehiclesByOwner = new Map<string, typeof memberVehicles>();
  for (const vehicle of memberVehicles) {
    const list = vehiclesByOwner.get(vehicle.owner_id) ?? [];
    list.push(vehicle);
    vehiclesByOwner.set(vehicle.owner_id, list);
  }

  // Each member's best rank — their highest-rated build across their
  // whole garage, not just one car — feeds both the avatar ring on the
  // Members tab and the owner badge on every one of their cars in the
  // Cars tab below.
  const bestScoreByOwner = new Map<string, number | null>();
  for (const userId of memberUserIds) {
    const scores = (vehiclesByOwner.get(userId) ?? []).map(
      (vehicle) => scoreByVehicleId.get(vehicle.id)?.ai_rating_score ?? null,
    );
    bestScoreByOwner.set(userId, maxScore(scores));
  }

  const tabMembers: CrewTabMember[] = members.map((member) => {
    const profile = profileById.get(member.user_id);
    return {
      member,
      username: profile?.username ?? "unknown",
      avatarUrl: profile?.avatar_media_id ? (avatarUrlById.get(profile.avatar_media_id) ?? null) : null,
      bestScore: bestScoreByOwner.get(member.user_id) ?? null,
    };
  });

  // The Cars tab's flat grid — one entry per vehicle across every
  // member, not grouped by owner, so the crew reads as one shared
  // garage. This is deliberately the page's default view (CrewTabs
  // starts on "cars"), not Feed.
  const cars: CrewCarItem[] = memberVehicles.map((vehicle) => {
    const profile = profileById.get(vehicle.owner_id);
    const username = profile?.username ?? "unknown";
    return {
      vehicle,
      heroUrl: vehicle.hero_media_id ? (heroUrlById.get(vehicle.hero_media_id) ?? null) : null,
      vehicleScore: scoreByVehicleId.get(vehicle.id)?.ai_rating_score ?? null,
      ownerUsername: username,
      ownerAvatarUrl: profile?.avatar_media_id ? (avatarUrlById.get(profile.avatar_media_id) ?? null) : null,
      ownerBestScore: bestScoreByOwner.get(vehicle.owner_id) ?? null,
    };
  });

  return (
    <div className="flex-1">
      <div className="relative h-40 w-full bg-surface sm:h-56">
        {bannerUrl && <Image src={bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="relative -mt-16 h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-4 border-background bg-surface-raised shadow-lg sm:h-28 sm:w-28">
            {logoUrl ? (
              <Image src={logoUrl} alt="" fill sizes="112px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold">
                {crew.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{crew.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted">
                {crew.visibility === "private" ? (
                  <LockIcon className="h-3 w-3" />
                ) : (
                  <GlobeIcon className="h-3 w-3" />
                )}
                {crew.visibility === "private" ? "Private" : "Public"}
              </span>
              <span className="glass rounded-full px-2.5 py-1 text-xs font-medium text-muted">
                {CREW_CATEGORY_LABELS[crew.category]}
              </span>
              {crew.location_text && (
                <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted">
                  <PinIcon className="h-3 w-3" />
                  {crew.location_text}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-6">
          <div>
            <p className="text-lg font-bold leading-none">{memberCount}</p>
            <p className="mt-1.5 text-xs text-muted">Member{memberCount === 1 ? "" : "s"}</p>
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{cars.length}</p>
            <p className="mt-1.5 text-xs text-muted">Car{cars.length === 1 ? "" : "s"}</p>
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{postThumbnails.length}</p>
            <p className="mt-1.5 text-xs text-muted">Post{postThumbnails.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {currentUser ? (
            <JoinButton
              crewId={crew.id}
              visibility={crew.visibility}
              initialMembership={membership}
              isOwner={isOwner}
            />
          ) : (
            <Link href={`/login?next=/crews/${crew.id}`}>
              <Button className="px-4 py-1.5 text-sm">Log in to join</Button>
            </Link>
          )}
          {isOwner && (
            <Link href={`/crews/${crew.id}/edit`}>
              <Button variant="secondary" className="px-4 py-1.5 text-sm">
                Edit crew
              </Button>
            </Link>
          )}
          {canManageMembers && (
            <Link href={`/crews/${crew.id}/requests`}>
              <Button variant="secondary" className="px-4 py-1.5 text-sm">
                Requests
              </Button>
            </Link>
          )}
        </div>

        <CrewTabs
          crewId={crew.id}
          crew={crew}
          cars={cars}
          posts={postThumbnails}
          members={tabMembers}
          events={events}
          canManageMembers={canManageMembers}
          viewerRole={viewerRole}
        />
      </div>
    </div>
  );
}
