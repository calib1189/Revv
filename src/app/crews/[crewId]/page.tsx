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
import { getStoreItem } from "@/lib/store/catalog";
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
    const ownerNameColorItem = profile?.equipped_vehicle_name_color
      ? getStoreItem(profile.equipped_vehicle_name_color)
      : undefined;
    return {
      vehicle,
      heroUrl: vehicle.hero_media_id ? (heroUrlById.get(vehicle.hero_media_id) ?? null) : null,
      vehicleScore: scoreByVehicleId.get(vehicle.id)?.ai_rating_score ?? null,
      ownerUsername: username,
      ownerAvatarUrl: profile?.avatar_media_id ? (avatarUrlById.get(profile.avatar_media_id) ?? null) : null,
      ownerBestScore: bestScoreByOwner.get(vehicle.owner_id) ?? null,
      ownerNameColorValue: ownerNameColorItem?.value,
      ownerNameColorEffectClassName: ownerNameColorItem?.effectClassName,
    };
  });

  const bannerItem = crew.equipped_crew_banner ? getStoreItem(crew.equipped_crew_banner) : undefined;
  const crewNameColorItem = crew.equipped_crew_name_color ? getStoreItem(crew.equipped_crew_name_color) : undefined;
  const crewFrameItem = crew.equipped_crew_frame ? getStoreItem(crew.equipped_crew_frame) : undefined;
  const crewNameIsGradient = crewNameColorItem?.value.includes("gradient") ?? false;

  const actionClass = "h-10 w-full px-3 py-0 text-[0.9375rem] font-semibold";
  const stats = [
    { label: memberCount === 1 ? "Member" : "Members", value: memberCount },
    { label: cars.length === 1 ? "Car" : "Cars", value: cars.length },
    { label: postThumbnails.length === 1 ? "Post" : "Posts", value: postThumbnails.length },
  ];

  return (
    <div className="flex-1 pb-16">
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6 sm:pt-8">
        {/* Banner: the uploaded photo if there is one, otherwise the
            equipped Crew Banner cosmetic, otherwise a quiet surface. */}
        <div
          className={`relative h-36 overflow-hidden rounded-[28px] bg-surface elev-2 sm:h-48 ${
            !bannerUrl ? (bannerItem?.effectClassName ?? "") : ""
          }`}
          style={!bannerUrl && bannerItem ? { backgroundImage: bannerItem.value } : undefined}
        >
          {bannerUrl && <Image src={bannerUrl} alt="" fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" priority />}
        </div>

        <header className="animate-section-rise -mt-14 flex flex-col items-center text-center">
          <div className={`relative h-[104px] w-[104px] rounded-[30px] ${crewFrameItem?.value ?? ""}`}>
            <div className="relative h-full w-full overflow-hidden rounded-[30px] border-4 border-background bg-surface-raised elev-2">
              {logoUrl ? (
                <Image src={logoUrl} alt="" fill sizes="104px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold">
                  {crew.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {crewNameIsGradient ? (
            <h1
              className={`mt-4 max-w-full truncate bg-clip-text text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-transparent ${crewNameColorItem?.effectClassName ?? ""}`}
              style={{ backgroundImage: crewNameColorItem!.value }}
            >
              {crew.name}
            </h1>
          ) : (
            <h1
              className={`mt-4 max-w-full truncate text-[1.75rem] font-bold leading-tight tracking-[-0.025em] ${crewNameColorItem?.effectClassName ?? ""}`}
              style={crewNameColorItem ? { color: crewNameColorItem.value } : undefined}
            >
              {crew.name}
            </h1>
          )}

          <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 text-[0.875rem] text-muted">
            <span className="inline-flex items-center gap-1">
              {crew.visibility === "private" ? <LockIcon className="h-3.5 w-3.5" /> : <GlobeIcon className="h-3.5 w-3.5" />}
              {crew.visibility === "private" ? "Private" : "Public"}
            </span>
            <span>·</span>
            <span>{CREW_CATEGORY_LABELS[crew.category]}</span>
            {crew.location_text && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <PinIcon className="h-3.5 w-3.5" />
                  {crew.location_text}
                </span>
              </>
            )}
          </p>

          <div className="mt-6 flex w-full max-w-sm items-stretch">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex min-w-0 flex-1 items-stretch">
                {i > 0 && <div className="my-1 w-px flex-shrink-0 bg-border" />}
                <div className="min-w-0 flex-1">
                  <p className="numeral text-[1.375rem] leading-none">{stat.value}</p>
                  <p className="mt-1.5 text-[0.75rem] font-medium text-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex w-full max-w-md gap-2.5">
            {currentUser ? (
              !isOwner && (
                <div className="min-w-0 flex-1">
                  <JoinButton
                    crewId={crew.id}
                    visibility={crew.visibility}
                    initialMembership={membership}
                    isOwner={isOwner}
                    className={actionClass}
                  />
                </div>
              )
            ) : (
              <Link href={`/login?next=/crews/${crew.id}`} className="min-w-0 flex-1">
                <Button className={actionClass}>Log in to join</Button>
              </Link>
            )}
            {isOwner && (
              <Link href={`/crews/${crew.id}/edit`} className="min-w-0 flex-1">
                <Button variant="secondary" className={actionClass}>
                  Edit Crew
                </Button>
              </Link>
            )}
            {canManageMembers && (
              <Link href={`/crews/${crew.id}/requests`} className="min-w-0 flex-1">
                <Button variant="secondary" className={actionClass}>
                  Requests
                </Button>
              </Link>
            )}
          </div>
        </header>

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
