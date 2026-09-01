import Link from "next/link";
import Image from "next/image";
import { EyeIcon, HeartIcon, CommentIcon, ShareIcon, BookmarkIcon, ArrowUpIcon, ArrowDownIcon, PersonIcon, WrenchIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { formatDateOnly } from "@/lib/format/date";
import { VideoThumbnail } from "@/features/profile/video-thumbnail";
import type { CreatorPostStats } from "@/lib/analytics/creator-stats";
import type { Post } from "@/lib/db/posts";

function Stat({ icon: Icon, value }: { icon: typeof EyeIcon; value: number }) {
  return (
    <span className="flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" />
      {formatCompactNumber(value)}
    </span>
  );
}

/** One row in the creator's own post list — thumbnail, the real
 * engagement counts for that post, and (once there's another post to
 * compare against) how it's doing relative to this creator's own
 * average, computed from the exact same weighted engagement score the
 * feed's own ranking uses (see lib/ranking/feed-score.ts) rather than a
 * separate, invented metric. */
export function PostStatRow({
  post,
  stats,
  thumbnailUrl,
  authorUsername,
}: {
  post: Post;
  stats: CreatorPostStats;
  thumbnailUrl: string | null;
  authorUsername: string;
}) {
  const href = post.post_type === "video" ? `/u/${authorUsername}/reel/${post.id}` : `/p/${post.id}`;

  return (
    <li className="flex gap-3 border-b border-border py-4 last:border-b-0">
      <Link href={href} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-raised">
        {thumbnailUrl && post.post_type === "video" && (
          <VideoThumbnail url={thumbnailUrl} className="h-full w-full object-cover" />
        )}
        {thumbnailUrl && post.post_type !== "video" && (
          <Image src={thumbnailUrl} alt="" fill sizes="64px" className="object-cover" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={href} className="block min-w-0">
          <p className="truncate text-sm font-medium">{post.caption || "Untitled post"}</p>
          <p className="text-xs text-muted">{formatDateOnly(post.created_at)}</p>
        </Link>

        {stats.vsAveragePercent != null && (
          <span
            className={`mt-1 flex w-fit items-center gap-0.5 text-xs font-medium ${
              stats.vsAveragePercent >= 0 ? "text-success" : "text-muted"
            }`}
          >
            {stats.vsAveragePercent >= 0 ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : (
              <ArrowDownIcon className="h-3 w-3" />
            )}
            {Math.abs(stats.vsAveragePercent)}% vs your average
          </span>
        )}

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <Stat icon={EyeIcon} value={stats.views} />
          {stats.completionRate != null && <span>{stats.completionRate}% completion</span>}
          <Stat icon={HeartIcon} value={stats.likes} />
          <Stat icon={CommentIcon} value={stats.comments} />
          <Stat icon={ShareIcon} value={stats.shares} />
          <Stat icon={BookmarkIcon} value={stats.saves} />
          {stats.profileVisits > 0 && <Stat icon={PersonIcon} value={stats.profileVisits} />}
          {stats.garageVisits > 0 && <Stat icon={WrenchIcon} value={stats.garageVisits} />}
        </div>
      </div>
    </li>
  );
}
