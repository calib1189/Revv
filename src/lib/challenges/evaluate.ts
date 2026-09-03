import { CHALLENGES } from "@/lib/challenges/catalog";

export interface ChallengeStats {
  postsThisWeek: number;
  ratingAttemptsThisWeek: number;
  likesReceivedThisWeek: number;
  commentsMadeThisWeek: number;
}

export interface ChallengeProgress {
  id: string;
  current: number;
  target: number;
  completed: boolean;
}

function statFor(id: string, stats: ChallengeStats): number {
  switch (id) {
    case "post_3":
      return stats.postsThisWeek;
    case "rate_a_build":
      return stats.ratingAttemptsThisWeek;
    case "get_20_likes":
      return stats.likesReceivedThisWeek;
    case "comment_5":
      return stats.commentsMadeThisWeek;
    default:
      return 0;
  }
}

/** Pure — maps a week's real stats onto every challenge's progress.
 * `current` is clamped to `target` (a post count of 5 against a target
 * of 3 still shows as "3/3 done", not an overshoot the progress bar
 * can't render). */
export function evaluateChallenges(stats: ChallengeStats): ChallengeProgress[] {
  return CHALLENGES.map((challenge) => {
    const raw = statFor(challenge.id, stats);
    const current = Math.min(raw, challenge.target);
    return { id: challenge.id, current, target: challenge.target, completed: raw >= challenge.target };
  });
}
