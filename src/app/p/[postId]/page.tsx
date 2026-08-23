import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getPostById } from "@/lib/db/posts";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getVehicleById } from "@/lib/db/vehicles";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { publicMediaUrl } from "@/lib/db/media";
import { getLikeCount, getLikedPostIds } from "@/lib/db/likes";
import { getSavedPostIds } from "@/lib/db/saves";
import { listCommentsByPost } from "@/lib/db/comments";
import { Avatar } from "@/features/feed/avatar";
import { PhotoCarousel } from "@/features/feed/photo-carousel";
import { VideoPlayer } from "@/features/feed/video-player";
import { LikeButton } from "@/features/feed/like-button";
import { SaveButton } from "@/features/feed/save-button";
import { CommentList } from "@/features/feed/comment-list";
import { CommentForm } from "@/features/feed/comment-form";
import { DeletePostButton } from "@/features/feed/delete-post-button";
import { ReportButton } from "@/features/feed/report-button";
import { relativeTime } from "@/lib/format/relative-time";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();

  const [post, user] = await Promise.all([
    getPostById(supabase, postId),
    getCurrentUser(),
  ]);
  if (!post) notFound();

  const [author, vehicle, postMedia, likeCount, comments] = await Promise.all([
    getProfileByUserId(supabase, post.author_id),
    post.vehicle_id ? getVehicleById(supabase, post.vehicle_id) : null,
    listPostMediaForPosts(supabase, [post.id]),
    getLikeCount(supabase, post.id),
    listCommentsByPost(supabase, post.id),
  ]);

  const [likedIds, savedIds, commentAuthors] = await Promise.all([
    user ? getLikedPostIds(supabase, user.id, [post.id]) : Promise.resolve(new Set<string>()),
    user ? getSavedPostIds(supabase, user.id, [post.id]) : Promise.resolve(new Set<string>()),
    Promise.all(
      [...new Set(comments.map((c) => c.author_id))].map((id) =>
        getProfileByUserId(supabase, id),
      ),
    ),
  ]);

  const authorUsernameById = new Map(
    commentAuthors.filter(Boolean).map((p) => [p!.id, p!.username]),
  );
  const commentsWithAuthor = comments.map((c) => ({
    ...c,
    authorUsername: authorUsernameById.get(c.author_id) ?? "unknown",
  }));

  const isOwner = user?.id === post.author_id;
  const vehicleTitle = vehicle
    ? vehicle.nickname || `${vehicle.make} ${vehicle.model}`
    : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar username={author?.username ?? "unknown"} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/u/${author?.username ?? "unknown"}`}
              className="truncate text-sm font-medium hover:underline"
            >
              @{author?.username ?? "unknown"}
            </Link>
            {vehicleTitle && (
              <Link
                href={`/garage/${vehicle!.id}`}
                className="truncate text-xs text-muted hover:text-foreground"
              >
                {vehicleTitle}
              </Link>
            )}
          </div>
          <span className="flex-shrink-0 text-xs text-muted">
            {relativeTime(post.created_at)}
          </span>
        </div>

        {post.post_type === "video" && postMedia[0] ? (
          <VideoPlayer
            url={publicMediaUrl(supabase, postMedia[0].media.storage_path)}
            width={postMedia[0].media.width}
            height={postMedia[0].media.height}
          />
        ) : (
          <PhotoCarousel
            photos={postMedia.map((pm) => ({
              url: publicMediaUrl(supabase, pm.media.storage_path),
            }))}
          />
        )}

        <div className="flex items-center gap-4 px-4 pt-3">
          <LikeButton
            postId={post.id}
            initialLiked={likedIds.has(post.id)}
            initialCount={likeCount}
            isAuthenticated={Boolean(user)}
          />
          <div className="flex-1" />
          <SaveButton
            postId={post.id}
            initialSaved={savedIds.has(post.id)}
            isAuthenticated={Boolean(user)}
          />
        </div>

        {post.caption && (
          <p className="px-4 pb-4 pt-2 text-sm leading-relaxed">
            <span className="font-medium">@{author?.username}</span>{" "}
            {post.caption}
          </p>
        )}
        {!post.caption && <div className="pb-4" />}

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          {isOwner ? (
            <DeletePostButton postId={post.id} />
          ) : user ? (
            <ReportButton targetType="post" targetId={post.id} />
          ) : (
            <span />
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Comments</h2>
        <CommentList
          comments={commentsWithAuthor}
          postId={post.id}
          currentUserId={user?.id ?? null}
        />
        {user ? (
          <div className="mt-4">
            <CommentForm postId={post.id} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            to comment.
          </p>
        )}
      </div>
    </div>
  );
}
