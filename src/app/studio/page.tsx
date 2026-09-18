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
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";

const PERIOD_DAYS = 7;

function SummaryTile({ icon: Icon, value, label, color }: { icon: typeof EyeIcon; value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-4">
      <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-muted">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        {label}
      </span>
      <p className="numeral text-[1.625rem] leading-none">{formatCompactNumber(value)}</p>
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
    <PageShell width="2xl">
      <PageHeader
        title="Creator Studio"
        eyebrow={`Last ${PERIOD_DAYS} days`}
        back={{ href: "/settings", label: "Settings" }}
      />

      {/* One card, a 3×2 grid of figures divided by hairlines — the
          Health / Screen Time summary pattern. */}
      <div className="glass-raised elev-2 mb-10 grid grid-cols-3 overflow-hidden rounded-[22px] [&>*]:border-border [&>*:nth-child(-n+3)]:border-b [&>*:not(:nth-child(3n))]:border-r sm:grid-cols-6 sm:[&>*]:border-b-0 sm:[&>*:not(:last-child)]:border-r">
        <SummaryTile icon={EyeIcon} value={summary.views} label="Views" color="#0a84ff" />
        <SummaryTile icon={HeartIcon} value={summary.likes} label="Likes" color="#ff375f" />
        <SummaryTile icon={CommentIcon} value={summary.comments} label="Comments" color="#30b0c7" />
        <SummaryTile icon={ShareIcon} value={summary.shares} label="Shares" color="#34c759" />
        <SummaryTile icon={BookmarkIcon} value={summary.saves} label="Saves" color="#ff9f0a" />
        <SummaryTile icon={UsersIcon} value={summary.newFollowers} label="Followers" color="#bf5af2" />
      </div>

      <SectionTitle>Your posts</SectionTitle>

      {posts.length === 0 ? (
        <EmptyState
          card
          icon={<EyeIcon />}
          title="No posts yet"
          body="Once you post a build update or a video, its stats show up here."
        />
      ) : (
        <ul className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>li+li]:before:absolute [&>li+li]:before:left-[6.125rem] [&>li+li]:before:right-0 [&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-border [&>li+li]:before:content-['']">
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
    </PageShell>
  );
}
