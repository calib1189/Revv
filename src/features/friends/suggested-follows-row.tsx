import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { FollowButton } from "@/features/profile/follow-button";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { SuggestedFollow } from "@/lib/ranking/suggested-follows";

/** "People you might like" — see suggested-follows.ts for how the list
 * is picked. Renders nothing at all when there's nothing real to
 * suggest, rather than an empty section header. */
export function SuggestedFollowsRow({ suggestions }: { suggestions: SuggestedFollow[] }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Suggested for you
      </h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {suggestions.map(({ profile, avatarUrl, bestScore }) => {
          const tier = rankForScore(bestScore);
          return (
            <div
              key={profile.id}
              className="glass flex w-36 flex-shrink-0 flex-col items-center gap-2 rounded-2xl p-4 text-center"
            >
              <Link href={`/u/${profile.username}`}>
                <RankFrame score={bestScore} compact hideBadge className="flex-shrink-0 rounded-full">
                  <Avatar username={profile.username} avatarUrl={avatarUrl} className="h-14 w-14 text-lg" />
                </RankFrame>
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/u/${profile.username}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  @{profile.username}
                </Link>
                <p
                  className="truncate text-xs font-medium"
                  style={{ color: RANK_TEXT_COLORS[tier] }}
                >
                  {RANK_LABELS[tier]} · {bestScore.toFixed(2)}
                </p>
              </div>
              <FollowButton followeeId={profile.id} followeeUsername={profile.username} initialIsFollowing={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
