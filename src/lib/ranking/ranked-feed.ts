import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";
import { getLikeCountsForPosts } from "@/lib/db/likes";
import { getCommentCountsForPosts } from "@/lib/db/comments";
import { getSaveCountsForPosts } from "@/lib/db/saves";
import { getViewCountsForPosts } from "@/lib/db/post-views";
import { getShareCountsForPosts } from "@/lib/db/post-shares";
import { getCompletionCountsForPosts } from "@/lib/db/post-view-completions";
import { getViewerAffinity, EMPTY_AFFINITY } from "@/lib/ranking/viewer-affinity";
import { computeHotScore, NO_AFFINITY, type ViewerAffinity } from "@/lib/ranking/feed-score";

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
      return { score: parsed.score, postId: parsed.postId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The main feed's actual ranking — replaces plain reverse-chronological
 * order with a per-viewer "hot score" (see feed-score.ts) computed live
 * from real engagement rows. No ranking state is ever stored: every
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

  const since = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("posts")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_MAX);
  if (vehicleIds) query = query.in("vehicle_id", vehicleIds);

  const { data: candidates, error } = await query;
  if (error) throw error;
  if (candidates.length === 0) return { items: [], hasMore: false };

  const postIds = candidates.map((p) => p.id);
  const candidateVehicleIds = [
    ...new Set(candidates.map((p) => p.vehicle_id).filter((id): id is string => Boolean(id))),
  ];

  const [likeCounts, commentCounts, saveCounts, viewCounts, shareCounts, completionCounts, affinity, vehicleRows] =
    await Promise.all([
      getLikeCountsForPosts(supabase, postIds),
      getCommentCountsForPosts(supabase, postIds),
      getSaveCountsForPosts(supabase, postIds),
      getViewCountsForPosts(supabase, postIds),
      getShareCountsForPosts(supabase, postIds),
      getCompletionCountsForPosts(supabase, postIds),
      viewerId ? getViewerAffinity(supabase, viewerId) : Promise.resolve(EMPTY_AFFINITY),
      candidateVehicleIds.length > 0
        ? supabase.from("vehicles").select("id, category, make").in("id", candidateVehicleIds)
        : Promise.resolve({ data: [] as { id: string; category: string; make: string | null }[], error: null }),
    ]);
  if (vehicleRows.error) throw vehicleRows.error;

  const vehicleById = new Map((vehicleRows.data ?? []).map((v) => [v.id, v]));
  const now = Date.now();

  const scored = candidates.map((post) => {
    const vehicle = post.vehicle_id ? vehicleById.get(post.vehicle_id) : null;
    const postAffinity: ViewerAffinity = vehicle
      ? {
          matchesCategory: affinity.categories.has(vehicle.category),
          matchesMake: Boolean(vehicle.make) && affinity.makes.has(vehicle.make!.toLowerCase()),
        }
      : NO_AFFINITY;
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
    return { post, score };
  });

  // Descending score, tie-broken by id ascending — an arbitrary but
  // stable order for the (practically never hit) case of two candidates
  // scoring identically, so the cursor logic below has a strict total
  // order to work with.
  scored.sort((a, b) => b.score - a.score || (a.post.id < b.post.id ? -1 : 1));

  const decoded = cursor ? decodeCursor(cursor) : null;
  const remaining = decoded
    ? scored.filter(
        (item) =>
          item.score < decoded.score || (item.score === decoded.score && item.post.id > decoded.postId),
      )
    : scored;

  const page = remaining.slice(0, limit);
  return {
    items: page.map((item) => ({
      post: item.post,
      cursor: encodeCursor({ score: item.score, postId: item.post.id }),
    })),
    hasMore: remaining.length > limit,
  };
}
