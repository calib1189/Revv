import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { PhotoCarousel } from "@/features/feed/photo-carousel";
import { VideoPlayer } from "@/features/feed/video-player";
import { LikeButton } from "@/features/feed/like-button";
import { SaveButton } from "@/features/feed/save-button";
import { CommentIcon } from "@/components/ui/icons";
import { relativeTime } from "@/lib/format/relative-time";
import type { Post } from "@/lib/db/posts";

export interface PostMediaItem {
  url: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
}

export interface PostCardData {
  post: Post;
  authorUsername: string;
  vehicleTitle: string | null;
  media: PostMediaItem[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isAuthenticated: boolean;
}

export function PostCard({ data }: { data: PostCardData }) {
  const {
    post,
    authorUsername,
    vehicleTitle,
    media,
    likeCount,
    commentCount,
    isLiked,
    isSaved,
    isAuthenticated,
  } = data;

  const video = post.post_type === "video" ? media[0] : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar username={authorUsername} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${authorUsername}`}
            className="truncate text-sm font-medium hover:underline"
          >
            @{authorUsername}
          </Link>
          {vehicleTitle && post.vehicle_id && (
            <Link
              href={`/garage/${post.vehicle_id}`}
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

      {video ? (
        <VideoPlayer url={video.url} width={video.width} height={video.height} />
      ) : (
        <Link href={`/p/${post.id}`}>
          <PhotoCarousel photos={media.map((m) => ({ url: m.url }))} />
        </Link>
      )}

      <div className="flex items-center gap-4 px-4 pt-3">
        <LikeButton
          postId={post.id}
          initialLiked={isLiked}
          initialCount={likeCount}
          isAuthenticated={isAuthenticated}
        />
        <Link
          href={`/p/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <CommentIcon className="h-5 w-5" />
          {commentCount > 0 && <span>{commentCount}</span>}
        </Link>
        <div className="flex-1" />
        <SaveButton
          postId={post.id}
          initialSaved={isSaved}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {post.caption && (
        <p className="px-4 pb-4 pt-2 text-sm leading-relaxed">
          <span className="font-medium">@{authorUsername}</span>{" "}
          {post.caption}
        </p>
      )}
      {!post.caption && <div className="pb-4" />}
    </article>
  );
}
