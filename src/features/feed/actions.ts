"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { likePost, unlikePost } from "@/lib/db/likes";
import { savePost, unsavePost } from "@/lib/db/saves";
import { recordPostView } from "@/lib/db/post-views";
import { recordPostViewCompletion } from "@/lib/db/post-view-completions";
import { recordPostShare } from "@/lib/db/post-shares";
import { createComment, deleteComment, listCommentsByPost } from "@/lib/db/comments";
import { deletePost, getPostById, updatePostCaption } from "@/lib/db/posts";
import { listRankedFeedPosts } from "@/lib/ranking/ranked-feed";
import { createReport } from "@/lib/db/reports";
import { getProfileByUserId, getProfilesByIds } from "@/lib/db/profiles";
import { listVehicleIdsByCategory } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getBestRatingScoresByOwnerIds } from "@/lib/rating/best-build-scores";
import { validateComment } from "@/lib/validation/comment";
import { validateCaption } from "@/lib/validation/post";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { sendPushToUser } from "@/lib/push/send";
import { isVehicleCategory, type VehicleCategory } from "@/lib/vehicles/category";
import type { PostCardData } from "@/features/feed/post-card";
import type { CommentWithAuthor } from "@/features/feed/comment-list";

async function resolveCategoryVehicleIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  category: VehicleCategory | null,
): Promise<string[] | undefined> {
  if (!category) return undefined;
  return listVehicleIdsByCategory(supabase, category);
}

async function rankedFeedPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
  vehicleIds: string[] | undefined,
  cursor?: string | null,
): Promise<PostCardData[]> {
  const { items } = await listRankedFeedPosts(supabase, { viewerId: userId, cursor, limit: 8, vehicleIds });
  const cards = await composePostCards(supabase, items.map((item) => item.post), userId);
  return cards.map((card, i) => ({ ...card, rankCursor: items[i].cursor }));
}

export async function loadMoreFeedPostsAction(
  cursor: string,
  category?: string | null,
): Promise<PostCardData[]> {
  const supabase = await createClient();
  const resolvedCategory = category && isVehicleCategory(category) ? category : null;
  const [user, vehicleIds] = await Promise.all([
    getCurrentUser(),
    resolveCategoryVehicleIds(supabase, resolvedCategory),
  ]);
  return rankedFeedPage(supabase, user?.id ?? null, vehicleIds, cursor);
}

/** Switching the FYP's category filter (category-filter-bar.tsx) replaces
 * the whole post list rather than appending to it — this is the initial
 * fetch for a newly-selected category, not pagination. */
export async function loadFeedByCategoryAction(
  category: string | null,
): Promise<PostCardData[]> {
  const supabase = await createClient();
  const resolvedCategory = category && isVehicleCategory(category) ? category : null;
  const [user, vehicleIds] = await Promise.all([
    getCurrentUser(),
    resolveCategoryVehicleIds(supabase, resolvedCategory),
  ]);
  return rankedFeedPage(supabase, user?.id ?? null, vehicleIds);
}

/** Fire-and-forget from the client when a post becomes visible in the
 * feed. Swallows its own errors — a missed view shouldn't surface
 * anywhere in the UI. */
export async function recordViewAction(postId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return;
    await recordPostView(supabase, postId, user.id);
  } catch {
    // best-effort only
  }
}

/** Fire-and-forget from swipe-slide.tsx's VideoMedia when a video has
 * been watched all the way through — a stronger signal than the plain
 * view-ping above, feeding the feed ranking algorithm's engagement
 * score (feed-score.ts). */
export async function recordViewCompletionAction(postId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return;
    await recordPostViewCompletion(supabase, postId, user.id);
  } catch {
    // best-effort only
  }
}

/** Fire-and-forget from swipe-slide.tsx's ShareButton once a share
 * actually completes (the native share sheet was used, or the link was
 * copied) — silently no-ops when logged out, same as every other
 * best-effort feed signal. */
export async function recordShareAction(postId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return;
    await recordPostShare(supabase, postId, user.id);
  } catch {
    // best-effort only
  }
}

export async function toggleLikeAction(
  postId: string,
  isLiked: boolean,
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (isLiked) {
    await unlikePost(supabase, user.id, postId);
  } else {
    await likePost(supabase, user.id, postId);
    after(() => notifyPostAuthor(supabase, postId, user.id, "liked your post"));
  }
  revalidatePath(`/p/${postId}`);
  revalidatePath("/feed");
}

/** Fire-and-forget push to a post's author — never blocks or fails the
 * action that triggered it. Skips self-notifications the same way the
 * database triggers that create the in-app notification rows already do. */
async function notifyPostAuthor(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  postId: string,
  actorId: string,
  verb: string,
): Promise<void> {
  try {
    const post = await getPostById(supabase, postId);
    if (!post || post.author_id === actorId) return;
    const actor = await getProfileByUserId(supabase, actorId);
    await sendPushToUser(post.author_id, {
      title: "REVV",
      body: `@${actor?.username ?? "Someone"} ${verb}`,
      url: `/p/${postId}`,
    });
  } catch {
    // best-effort only
  }
}

export async function toggleSaveAction(
  postId: string,
  isSaved: boolean,
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (isSaved) {
    await unsavePost(supabase, user.id, postId);
  } else {
    await savePost(supabase, user.id, postId);
  }
  revalidatePath(`/p/${postId}`);
  revalidatePath("/saved");
}

export interface CommentSheetData {
  comments: CommentWithAuthor[];
  currentUserId: string | null;
}

/** Loads a post's comments on demand for the feed's slide-up comment
 * sheet — the feed itself only ever fetches counts, never full comment
 * threads, for every post up front. */
export async function listCommentsForSheetAction(postId: string): Promise<CommentSheetData> {
  const supabase = await createClient();
  const [user, comments] = await Promise.all([
    getCurrentUser(),
    listCommentsByPost(supabase, postId),
  ]);

  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const [authors, authorScores] = await Promise.all([
    getProfilesByIds(supabase, authorIds),
    getBestRatingScoresByOwnerIds(supabase, authorIds),
  ]);
  const authorById = new Map(authors.map((a) => [a.id, a]));

  const avatarIds = authors.map((a) => a.avatar_media_id).filter((id): id is string => Boolean(id));
  const avatarMedia = await getMediaByIds(supabase, avatarIds);
  const avatarUrlByMediaId = new Map(
    avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  return {
    comments: comments.map((c) => {
      const author = authorById.get(c.author_id);
      return {
        ...c,
        authorUsername: author?.username ?? "unknown",
        authorDisplayName: author?.display_name ?? null,
        authorAvatarUrl: author?.avatar_media_id
          ? (avatarUrlByMediaId.get(author.avatar_media_id) ?? null)
          : null,
        authorRatingScore: authorScores.get(c.author_id) ?? null,
      };
    }),
    currentUserId: user?.id ?? null,
  };
}

export interface CommentFormState {
  error: string | null;
}

export async function createCommentAction(
  postId: string,
  parentId: string | null,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const body = String(formData.get("body") ?? "");
  const error = validateComment(body);
  if (error) return { error };

  const { supabase, user } = await requireUser();
  try {
    await createComment(supabase, postId, user.id, body.trim(), parentId);
  } catch {
    return { error: "Couldn't post that comment. Try again in a bit." };
  }
  after(() => notifyPostAuthor(supabase, postId, user.id, "commented on your post"));
  revalidatePath(`/p/${postId}`);
  return { error: null };
}

export async function deleteCommentAction(
  commentId: string,
  postId: string,
): Promise<void> {
  const { supabase } = await requireUser();
  await deleteComment(supabase, commentId);
  revalidatePath(`/p/${postId}`);
}

export async function deletePostAction(postId: string): Promise<void> {
  const { supabase } = await requireUser();
  await deletePost(supabase, postId);
  revalidatePath("/feed");
  redirect("/feed");
}

export interface UpdateCaptionResult {
  error?: string;
}

export async function updateCaptionAction(postId: string, caption: string): Promise<UpdateCaptionResult> {
  const trimmed = caption.trim();
  const validationError = validateCaption(trimmed);
  if (validationError) return { error: validationError };

  const { supabase } = await requireUser();
  try {
    await updatePostCaption(supabase, postId, trimmed || null);
  } catch {
    return { error: "Couldn't update that caption. Try again." };
  }
  revalidatePath(`/p/${postId}`);
  revalidatePath("/feed");
  return {};
}

const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "fake_ownership",
  "other",
] as const;

export interface ReportFormState {
  error: string | null;
  success: boolean;
}

export async function createReportAction(
  targetType: "post" | "comment" | "vehicle",
  targetId: string,
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const reason = String(formData.get("reason") ?? "");
  if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) {
    return { error: "Please choose a reason.", success: false };
  }

  const { supabase, user } = await requireUser();
  try {
    await createReport(supabase, {
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
    });
  } catch {
    return { error: "Couldn't file that report. Try again in a bit.", success: false };
  }

  return { error: null, success: true };
}
