import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";
import { getViewCountsForPosts, getUniqueViewerCountsForPosts } from "@/lib/db/post-views";
import { getCompletionCountsForPosts } from "@/lib/db/post-view-completions";
import { getShareCountsForPosts } from "@/lib/db/post-shares";
import { getLikeCountsForPosts } from "@/lib/db/likes";
import { getCommentCountsForPosts } from "@/lib/db/comments";
import { getSaveCountsForPosts } from "@/lib/db/saves";
import { getNewFollowerCount } from "@/lib/db/follows";
import { computeEngagementScore } from "@/lib/ranking/feed-score";
import { relativePercentDiff } from "@/lib/format/percent";

export interface CreatorPostStats {
  postId: string;
  views: number;
  uniqueViewers: number;
  completions: number;
  /** Null for a photo post — a completion rate only means anything for
   * a video, since a photo has no "watched it all the way through". */
  completionRate: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  /** How this post's engagement score compares to the average of this
   * creator's *other* posts — null when there's nothing else to compare
   * against yet (their first post, or their only post). */
  vsAveragePercent: number | null;
}

/** Every post's stats, all-time — backs the "your content" list and the
 * per-post "X% better than your average" comparison, which needs every
 * post's engagement score computed up front to have a real average to
 * compare against, not just the one post someone's looking at. */
export async function getCreatorPostStats(
  supabase: SupabaseClient<Database>,
  posts: Post[],
): Promise<CreatorPostStats[]> {
  if (posts.length === 0) return [];
  const postIds = posts.map((p) => p.id);

  const [views, uniqueViewers, completions, shares, likes, comments, saves] = await Promise.all([
    getViewCountsForPosts(supabase, postIds),
    getUniqueViewerCountsForPosts(supabase, postIds),
    getCompletionCountsForPosts(supabase, postIds),
    getShareCountsForPosts(supabase, postIds),
    getLikeCountsForPosts(supabase, postIds),
    getCommentCountsForPosts(supabase, postIds),
    getSaveCountsForPosts(supabase, postIds),
  ]);

  const now = Date.now();
  const scored = posts.map((post) => {
    const v = views.get(post.id) ?? 0;
    const c = completions.get(post.id) ?? 0;
    const ageHours = Math.max(0, (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60));
    const engagementScore = computeEngagementScore({
      views: v,
      likes: likes.get(post.id) ?? 0,
      comments: comments.get(post.id) ?? 0,
      saves: saves.get(post.id) ?? 0,
      shares: shares.get(post.id) ?? 0,
      completions: c,
      ageHours,
    });
    return { post, v, c, engagementScore };
  });

  const totalScore = scored.reduce((sum, s) => sum + s.engagementScore, 0);

  return scored.map(({ post, v, c, engagementScore }) => {
    // Compared against the average of every OTHER post, not including
    // itself — comparing a post to an average that already contains it
    // means a lone post always reads as "0% vs average" (compared to
    // itself), which looks like a bug rather than an honest "not enough
    // data yet".
    const otherPostsAverage =
      scored.length > 1 ? (totalScore - engagementScore) / (scored.length - 1) : null;

    return {
      postId: post.id,
      views: v,
      uniqueViewers: uniqueViewers.get(post.id) ?? 0,
      completions: c,
      completionRate: post.post_type === "video" && v > 0 ? Math.round((c / v) * 100) : null,
      likes: likes.get(post.id) ?? 0,
      comments: comments.get(post.id) ?? 0,
      shares: shares.get(post.id) ?? 0,
      saves: saves.get(post.id) ?? 0,
      vsAveragePercent:
        otherPostsAverage != null ? relativePercentDiff(engagementScore, otherPostsAverage) : null,
    };
  });
}

export interface CreatorPeriodSummary {
  periodDays: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  newFollowers: number;
}

const EMPTY_SUMMARY = (periodDays: number): CreatorPeriodSummary => ({
  periodDays,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  newFollowers: 0,
});

/** "This week" (or however many days) summary across every post this
 * creator has ever made — engagement recorded *in the window* counts
 * even when the post itself is older, matching how a creator actually
 * thinks about "how did I do this week" (an old post picking up new
 * comments this week is still something that happened this week). */
export async function getCreatorPeriodSummary(
  supabase: SupabaseClient<Database>,
  authorId: string,
  postIds: string[],
  periodDays = 7,
): Promise<CreatorPeriodSummary> {
  if (postIds.length === 0) return EMPTY_SUMMARY(periodDays);

  const sinceIso = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const countSince = (table: "post_views" | "likes" | "comments" | "post_shares" | "saves") =>
    supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds)
      .gte("created_at", sinceIso);

  const [viewsRes, likesRes, commentsRes, sharesRes, savesRes, newFollowers] = await Promise.all([
    countSince("post_views"),
    countSince("likes"),
    countSince("comments"),
    countSince("post_shares"),
    countSince("saves"),
    getNewFollowerCount(supabase, authorId, sinceIso),
  ]);

  for (const res of [viewsRes, likesRes, commentsRes, sharesRes, savesRes]) {
    if (res.error) throw res.error;
  }

  return {
    periodDays,
    views: viewsRes.count ?? 0,
    likes: likesRes.count ?? 0,
    comments: commentsRes.count ?? 0,
    shares: sharesRes.count ?? 0,
    saves: savesRes.count ?? 0,
    newFollowers,
  };
}
