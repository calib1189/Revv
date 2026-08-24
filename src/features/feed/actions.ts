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
import { createComment, deleteComment, listCommentsByPost } from "@/lib/db/comments";
import { deletePost, listFeedPosts, getPostById } from "@/lib/db/posts";
import { createReport } from "@/lib/db/reports";
import { getProfileByUserId } from "@/lib/db/profiles";
import { validateComment } from "@/lib/validation/comment";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { sendPushToUser } from "@/lib/push/send";
import type { PostCardData } from "@/features/feed/post-card";
import type { CommentWithAuthor } from "@/features/feed/comment-list";

export async function loadMoreFeedPostsAction(
  before: string,
): Promise<PostCardData[]> {
  const supabase = await createClient();
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    listFeedPosts(supabase, { before, limit: 8 }),
  ]);

  return composePostCards(supabase, posts, user?.id ?? null);
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
  const authors = await Promise.all(authorIds.map((id) => getProfileByUserId(supabase, id)));
  const usernameById = new Map(
    authors.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a.id, a.username]),
  );

  return {
    comments: comments.map((c) => ({
      ...c,
      authorUsername: usernameById.get(c.author_id) ?? "unknown",
    })),
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

const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;

export interface ReportFormState {
  error: string | null;
  success: boolean;
}

export async function createReportAction(
  targetType: "post" | "comment",
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
