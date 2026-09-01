import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listPostsByAuthor } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { publicMediaUrl } from "@/lib/db/media";
import { getCreatorPostStats, getCreatorPeriodSummary } from "@/lib/analytics/creator-stats";
import { EyeIcon, HeartIcon, CommentIcon, ShareIcon, BookmarkIcon, UsersIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { PostStatRow } from "@/features/studio/post-stat-row";

const PERIOD_DAYS = 7;

function SummaryTile({ icon: Icon, value, label }: { icon: typeof EyeIcon; value: number; label: string }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-2xl p-4 text-center">
      <Icon className="h-4 w-4 text-muted" />
      <p className="text-xl font-semibold">{formatCompactNumber(value)}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");

  const supabase = await createClient();
  const [profile, posts] = await Promise.all([
    getProfileByUserId(supabase, user.id),
    listPostsByAuthor(supabase, user.id),
  ]);

  const postIds = posts.map((p) => p.id);
  const [summary, postStats, postMedia] = await Promise.all([
    getCreatorPeriodSummary(supabase, user.id, postIds, PERIOD_DAYS),
    getCreatorPostStats(supabase, posts),
    listPostMediaForPosts(supabase, postIds),
  ]);

  const statsByPostId = new Map(postStats.map((s) => [s.postId, s]));
  const firstMediaByPostId = new Map<string, (typeof postMedia)[number]>();
  for (const pm of postMedia) {
    if (!firstMediaByPostId.has(pm.post_id)) firstMediaByPostId.set(pm.post_id, pm);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Creator Studio</h1>
      <p className="mb-6 text-sm text-muted">
        Last {PERIOD_DAYS} days, across everything you&apos;ve posted.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <SummaryTile icon={EyeIcon} value={summary.views} label="Views" />
        <SummaryTile icon={HeartIcon} value={summary.likes} label="Likes" />
        <SummaryTile icon={CommentIcon} value={summary.comments} label="Comments" />
        <SummaryTile icon={ShareIcon} value={summary.shares} label="Shares" />
        <SummaryTile icon={BookmarkIcon} value={summary.saves} label="Saves" />
        <SummaryTile icon={UsersIcon} value={summary.newFollowers} label="New followers" />
      </div>

      <h2 className="mb-2 text-lg font-semibold">Your content</h2>

      {posts.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-2xl py-16 text-center">
          <p className="text-sm font-medium">No posts yet</p>
          <p className="max-w-xs text-xs text-muted">
            Once you post a build update or a video, its stats show up here.
          </p>
        </div>
      ) : (
        <ul>
          {posts.map((post) => {
            const stats = statsByPostId.get(post.id);
            if (!stats) return null;
            const media = firstMediaByPostId.get(post.id);
            return (
              <PostStatRow
                key={post.id}
                post={post}
                stats={stats}
                thumbnailUrl={media ? publicMediaUrl(supabase, media.media.storage_path) : null}
                authorUsername={profile?.username ?? ""}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
