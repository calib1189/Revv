import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { FollowButton } from "@/features/profile/follow-button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SectionTitle } from "@/components/ui/grouped-list";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import type { SuggestedFollow } from "@/lib/ranking/suggested-follows";

/** "Suggested for you" — see suggested-follows.ts for how the list is
 * picked. A swipeable shelf of cards, each avatar inside its owner's
 * best-build ring. Renders nothing when there's nothing real to
 * suggest, rather than an empty section header. */
export function SuggestedFollowsRow({ suggestions }: { suggestions: SuggestedFollow[] }) {
  if (suggestions.length === 0) return null;

  return (
    <section className="mb-10">
      <SectionTitle>Suggested for you</SectionTitle>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {suggestions.map(({ profile, avatarUrl, bestScore }) => {
          const tier = rankForScore(bestScore);
          return (
            <div
              key={profile.id}
              className="glass-raised elev-1 flex w-[9.5rem] flex-shrink-0 snap-start flex-col items-center rounded-[22px] px-3 pb-3.5 pt-4 text-center"
            >
              <Link href={`/u/${profile.username}`} className="flex flex-col items-center">
                <ProgressRing value={bestScore / 100} size={76} stroke={4} color={tierColorVar(tier)}>
                  <Avatar username={profile.username} avatarUrl={avatarUrl} className="h-[62px] w-[62px] text-xl" />
                </ProgressRing>
                <p className="mt-2.5 w-full truncate text-[0.875rem] font-semibold">
                  {profile.display_name || profile.username}
                </p>
              </Link>
              <p className="mt-0.5 w-full truncate text-[0.75rem] font-medium" style={{ color: tierColorVar(tier) }}>
                {RANK_LABELS[tier]} · <span className="numeral">{bestScore.toFixed(2)}</span>
              </p>
              <div className="mt-3 w-full">
                <FollowButton
                  followeeId={profile.id}
                  followeeUsername={profile.username}
                  initialIsFollowing={false}
                  className="h-8 w-full py-0 text-[0.8125rem] font-semibold"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
