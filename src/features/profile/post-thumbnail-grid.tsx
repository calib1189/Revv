import Link from "next/link";
import Image from "next/image";

export interface PostThumbnail {
  postId: string;
  url: string | null;
  kind: "photo" | "video";
}

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="white"
      className="absolute right-1.5 top-1.5 h-4 w-4 drop-shadow"
    >
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function PostThumbnailGrid({
  posts,
  username,
}: {
  posts: PostThumbnail[];
  username: string;
}) {
  if (posts.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post) => (
        <Link
          key={post.postId}
          href={
            post.kind === "video"
              ? `/u/${username}/reel/${post.postId}`
              : `/p/${post.postId}`
          }
          className="relative aspect-square overflow-hidden bg-surface"
        >
          {post.url && post.kind === "photo" && (
            <Image
              src={post.url}
              alt=""
              fill
              sizes="33vw"
              className="object-cover"
            />
          )}
          {post.url && post.kind === "video" && (
            <video
              src={post.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          )}
          {post.kind === "video" && <PlayGlyph />}
        </Link>
      ))}
    </div>
  );
}
