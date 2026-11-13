import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";
import { getLikeCountsForPosts } from "@/lib/db/likes";
import { getCommentCountsForPosts } from "@/lib/db/comments";
import { getSaveCountsForPosts } from "@/lib/db/saves";
import { getPostIdsViewedBy, getViewCountsForPosts } from "@/lib/db/post-views";
import { getShareCountsForPosts } from "@/lib/db/post-shares";
import { getCompletionCountsForPosts } from "@/lib/db/post-view-completions";
import { getViewerAffinity, EMPTY_AFFINITY } from "@/lib/ranking/viewer-affinity";
import { computeHotScore, NO_AFFINITY, type ViewerAffinity } from "@/lib/ranking/feed-score";
import { listFollowingIds } from "@/lib/db/follows";
import { listBlockedEitherDirection } from "@/lib/db/blocks";
import { compareForViewer, isAfterCursor } from "@/lib/ranking/seen-order";

// Bounds the ranking computation to posts from the last month, capped at
// a fixed count — the "For You" feed re-ranks live on every request
// (there's no stored ranking to keep in sync), so this candidate window
// is what keeps that bounded regardless of how many posts have ever
// been made. A post older than this simply stops being a feed
// candidate at all, the same trade-off Reddit/Hacker News-style hot
// rankings make; it isn't a fitness statement about the post.
const CANDIDATE_WINDOW_DAYS = 30;
const CANDIDATE_MAX = 400;

export interface RankedFeedCursor {
  score: number;
  postId: string;
  /** Whether that post was in the already-seen group. */
  seen: boolean;
  /** When this scroll session's first page loaded: "seen" means viewed
   * before then, so posts watched while scrolling don't move to the
   * seen group mid-session and come round a second time. */
  asOf: string;
}

export interface RankedFeedItem {
  post: Post;
  /** Opaque — callers just pass this back verbatim as the next page's
   * cursor, never decode it themselves. Encodes the score this post was
   * ranked at, so pagination continues "everything ranked lower than
   * what you've already seen" rather than a created_at cutoff, which
   * would put the feed back in plain chronological order. */
  cursor: string;
}

export interface RankedFeedResult {
  items: RankedFeedItem[];
  hasMore: boolean;
}

function encodeCursor(cursor: RankedFeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string): RankedFeedCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<RankedFeedCursor>;
    if (typeof parsed.score === "number" && typeof parsed.postId === "string") {
      // Cursors from before the seen ordering have neither field.
      const asOf =
        typeof parsed.asOf === "string" && !Number.isNaN(Date.parse(parsed.asOf))
          ? new Date(parsed.asOf).toISOString()
          : new Date().toISOString();
      return { score: parsed.score, postId: parsed.postId, seen: parsed.seen === true, asOf };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The main feed's actual ranking — replaces plain reverse-chronological
 * order with a per-viewer "hot score" (see feed-score.ts) computed live
 * from real engagement rows, with every post the viewer hasn't watched
 * yet ahead of the ones they have (seen-order.ts). No ranking state is ever stored: every
 * request re-fetches the candidate window, re-counts engagement, and
 * re-scores, which is also why the score naturally drifts a little
 * between page loads as posts age and accumulate more engagement — the
 * same behavior any live-ranked feed has (a pull-to-refresh a minute
 * later isn't guaranteed to look identical), not a bug in the
 * pagination.
 */
export async function listRankedFeedPosts(
  supabase: SupabaseClient<Database>,
  {
    viewerId,
    cursor,
    limit = 8,
    vehicleIds,
  }: { viewerId: string | null; cursor?: string | null; limit?: number; vehicleIds?: string[] },
): Promise<RankedFeedResult> {
  if (vehicleIds && vehicleIds.length === 0) return { items: [], hasMore: false };
  const decoded = cursor ? decodeCursor(cursor) : null;
  const asOf = decoded?.asOf ?? new Date().toISOString();

  const since = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("posts")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_MAX);
  if (vehicleIds) query = query.in("vehicle_id", vehicleIds);

  const { data: rawCandidates, error } = await query;
  if (error) throw error;
  if (rawCandidates.length === 0) return { items: [], hasMore: false };

  // Blocking hides a pair's content from each other everywhere, not
  // just DMs — a blocked/blocking author's posts are filtered out of
  // the feed entirely, in both directions, before they're ever scored.
  const blockedIds = viewerId ? new Set(await listBlockedEitherDirection(supabase)) : null;
  const candidates =
    blockedIds && blockedIds.size > 0
      ? rawCandidates.filter((post) => !blockedIds.has(post.author_id))
      : rawCandidates;
  if (candidates.length === 0) return { items: [], hasMore: false };

  const postIds = candidates.map((p) => p.id);
  const candidateVehicleIds = [
    ...new Set(candidates.map((p) => p.vehicle_id).filter((id): id is string => Boolean(id))),
  ];

  const [
    likeCounts,
    commentCounts,
    saveCounts,
    viewCounts,
    shareCounts,
    completionCounts,
    seenIds,
    affinity,
    followingIds,
    vehicleRows,
  ] = await Promise.all([
    getLikeCountsForPosts(supabase, postIds),
    getCommentCountsForPosts(supabase, postIds),
    getSaveCountsForPosts(supabase, postIds),
    getViewCountsForPosts(supabase, postIds),
    getShareCountsForPosts(supabase, postIds),
    getCompletionCountsForPosts(supabase, postIds),
    viewerId ? getPostIdsViewedBy(supabase, viewerId, postIds, asOf) : Promise.resolve(new Set<string>()),
    viewerId ? getViewerAffinity(supabase, viewerId) : Promise.resolve(EMPTY_AFFINITY),
    viewerId ? listFollowingIds(supabase, viewerId) : Promise.resolve([] as string[]),
    candidateVehicleIds.length > 0
      ? supabase.from("vehicles").select("id, category, make").in("id", candidateVehicleIds)
      : Promise.resolve({ data: [] as { id: string; category: string; make: string | null }[], error: null }),
  ]);
  if (vehicleRows.error) throw vehicleRows.error;
  const followingSet = new Set(followingIds);

  const vehicleById = new Map((vehicleRows.data ?? []).map((v) => [v.id, v]));
  const now = Date.now();

  const scored = candidates.map((post) => {
    const vehicle = post.vehicle_id ? vehicleById.get(post.vehicle_id) : null;
    const postAffinity: ViewerAffinity = {
      matchesCategory: vehicle ? affinity.categories.has(vehicle.category) : NO_AFFINITY.matchesCategory,
      matchesMake: vehicle
        ? Boolean(vehicle.make) && affinity.makes.has(vehicle.make!.toLowerCase())
        : NO_AFFINITY.matchesMake,
      isFollowedAuthor: followingSet.has(post.author_id),
    };
    const ageHours = (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    const score = computeHotScore(
      {
        views: viewCounts.get(post.id) ?? 0,
        likes: likeCounts.get(post.id) ?? 0,
        comments: commentCounts.get(post.id) ?? 0,
        saves: saveCounts.get(post.id) ?? 0,
        shares: shareCounts.get(post.id) ?? 0,
        completions: completionCounts.get(post.id) ?? 0,
        ageHours,
      },
      postAffinity,
    );
    return { post, id: post.id, score, seen: seenIds.has(post.id) };
  });

  // Posts the viewer hasn't watched first, then the ones they have, each
  // by descending score, tie-broken by id so the cursor logic below has
  // a strict total order to work with (seen-order.ts).
  scored.sort(compareForViewer);

  const remaining = decoded ? scored.filter((item) => isAfterCursor(item, decoded)) : scored;

  const page = remaining.slice(0, limit);
  return {
    items: page.map((item) => ({
      post: item.post,
      cursor: encodeCursor({ score: item.score, postId: item.post.id, seen: item.seen, asOf }),
    })),
    hasMore: remaining.length > limit,
  };
}
