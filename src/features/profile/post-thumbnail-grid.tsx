import Link from "next/link";
import Image from "next/image";
import { EyeIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

export interface PostThumbnail {
  postId: string;
  url: string | null;
  kind: "photo" | "video";
  authorUsername: string;
  viewCount: number;
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

export function PostThumbnailGrid({ posts }: { posts: PostThumbnail[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post) => (
        <Link
          key={post.postId}
          href={
            post.kind === "video"
              ? `/u/${post.authorUsername}/reel/${post.postId}`
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
            <span className="flex items-center gap-1 text-[11px] font-medium text-white">
              <EyeIcon className="h-3 w-3" />
              {formatCompactNumber(post.viewCount)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
