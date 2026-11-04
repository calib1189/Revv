import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BuildRating } from "@/lib/providers/rating-provider";
import { listRankedFeedPosts } from "@/lib/ranking/ranked-feed";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVehiclesByOwner, listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { listUpcomingMeetups } from "@/lib/db/meetups";
import { listMeetupMediaForMeetups } from "@/lib/db/meetup-media";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { parseSubscores } from "@/lib/rating/parse-subscores";

/** Real content from SORZA the walkthrough demonstrates with, so every
 * screen in it shows the actual app rather than invented examples. */
export interface TutorialShowcase {
  posts: {
    id: string;
    mediaUrl: string;
    kind: "image" | "video";
    authorUsername: string;
    authorAvatarUrl: string | null;
    vehicleTitle: string | null;
    caption: string | null;
    likeCount: number;
    commentCount: number;
  }[];
  /** The best-rated verified build with a full stored breakdown. */
  topBuild: {
    vehicleTitle: string;
    ownerUsername: string;
    heroUrl: string | null;
    rating: BuildRating;
  } | null;
  podium: {
    buildId: string;
    vehicleTitle: string;
    ownerUsername: string;
    heroUrl: string | null;
    score: number;
  }[];
  meets: {
    id: string;
    title: string;
    locationName: string;
    startsAt: string;
    photoUrl: string | null;
  }[];
  viewer: {
    username: string;
    avatarUrl: string | null;
    vehicle: { id: string; title: string; heroUrl: string | null } | null;
  } | null;
}

/** Each section is fetched on its own: one failing leaves that screen in
 * its empty state rather than taking the whole tour down. */
async function settle<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

async function loadPosts(supabase: SupabaseClient<Database>, viewerId: string): Promise<TutorialShowcase["posts"]> {
  const { items } = await listRankedFeedPosts(supabase, { viewerId, limit: 8 });
  const cards = await composePostCards(supabase, items.map((i) => i.post), viewerId);
  return cards
    .filter((c) => c.media[0] && !c.isOwnPost)
    .slice(0, 4)
    .map((c) => ({
      id: c.post.id,
      mediaUrl: c.media[0].url,
      kind: c.media[0].kind,
      authorUsername: c.authorUsername,
      authorAvatarUrl: c.authorAvatarUrl,
      vehicleTitle: c.vehicleTitle,
      caption: c.post.caption,
      likeCount: c.likeCount,
      commentCount: c.commentCount,
    }));
}

async function loadBoard(supabase: SupabaseClient<Database>) {
  // Same eligibility as the real leaderboard: verified vehicles only.
  const verified = await listVerifiedVehicleIds(supabase);
  const builds = await listTopRatedBuilds(supabase, 10, verified);
  const entries = await composeLeaderboard(supabase, builds);
  const podium = entries.slice(0, 3).map((e) => ({
    buildId: e.buildId,
    vehicleTitle: e.vehicleTitle,
    ownerUsername: e.ownerUsername,
    heroUrl: e.heroUrl,
    score: e.score,
  }));

  let topBuild: TutorialShowcase["topBuild"] = null;
  for (const entry of entries) {
    const build = builds.find((b) => b.id === entry.buildId);
    const subscores = parseSubscores(build?.ai_rating_subscores);
    if (!build || build.ai_rating_score == null || !subscores) continue;
    topBuild = {
      vehicleTitle: entry.vehicleTitle,
      ownerUsername: entry.ownerUsername,
      heroUrl: entry.heroUrl,
      rating: {
        score: build.ai_rating_score,
        strengths: build.ai_rating_strengths ?? "",
        limitingFactors: build.ai_rating_limiting_factors ?? "",
        subscores,
        isMock: false,
      },
    };
    break;
  }
  return { podium, topBuild };
}

async function loadMeets(supabase: SupabaseClient<Database>): Promise<TutorialShowcase["meets"]> {
  const meetups = (await listUpcomingMeetups(supabase)).slice(0, 2);
  const media = await listMeetupMediaForMeetups(supabase, meetups.map((m) => m.id));
  return meetups.map((m) => {
    const first = media.find((mm) => mm.meetup_id === m.id);
    return {
      id: m.id,
      title: m.title,
      locationName: m.location_name,
      startsAt: m.starts_at,
      photoUrl: first ? publicMediaUrl(supabase, first.media.storage_path) : null,
    };
  });
}

async function loadViewer(supabase: SupabaseClient<Database>, userId: string): Promise<TutorialShowcase["viewer"]> {
  const [profile, vehicles] = await Promise.all([getProfileByUserId(supabase, userId), listVehiclesByOwner(supabase, userId)]);
  if (!profile) return null;
  const [avatar, hero] = await Promise.all([
    profile.avatar_media_id ? getMediaById(supabase, profile.avatar_media_id).catch(() => null) : null,
    vehicles[0]?.hero_media_id ? getMediaById(supabase, vehicles[0].hero_media_id).catch(() => null) : null,
  ]);
  const v = vehicles[0];
  return {
    username: profile.username,
    avatarUrl: avatar ? publicMediaUrl(supabase, avatar.storage_path) : null,
    vehicle: v
      ? {
          id: v.id,
          title: v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" "),
          heroUrl: hero ? publicMediaUrl(supabase, hero.storage_path) : null,
        }
      : null,
  };
}

export async function loadTutorialShowcase(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TutorialShowcase> {
  const [posts, board, meets, viewer] = await Promise.all([
    settle(loadPosts(supabase, userId), []),
    settle(loadBoard(supabase), { podium: [], topBuild: null }),
    settle(loadMeets(supabase), []),
    settle(loadViewer(supabase, userId), null),
  ]);
  return { posts, topBuild: board.topBuild, podium: board.podium, meets, viewer };
}
