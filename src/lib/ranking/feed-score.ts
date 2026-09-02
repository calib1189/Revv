/**
 * The feed's "hot score" — how a post gets ranked against every other
 * candidate post for a given viewer. Two things feed into it:
 *
 * 1. Engagement, weighted by how much it actually says about a post's
 *    quality — a like says more than a passive view, a share and a
 *    comment say more than a like (they cost the viewer real effort),
 *    and "watched a video all the way through" is a stronger signal
 *    than "it was on screen for a second while scrolling past."
 *    Two posts with the same view count but a different like count
 *    (100 views/25 likes vs. 100 views/2 likes) come out with very
 *    different scores here — the second isn't just "less popular," its
 *    like-to-view ratio pulls its score down relative to the first.
 * 2. Recency decay (the same shape Hacker News' ranking uses:
 *    score / (age_hours + 2) ^ gravity) — engagement earned an hour ago
 *    counts for more than the same engagement earned a month ago, so a
 *    single old viral post can't permanently bury everything newer.
 *
 * A small constant baseline (BASE_FRESHNESS) is folded into the
 * engagement total before dividing by decay — without it, a brand new
 * post with zero engagement yet scores exactly 0, identical to a
 * month-old post nobody ever engaged with, and would never get a single
 * viewer to build engagement from in the first place. The baseline
 * decays away within its first few hours same as everything else, so
 * it's a brief "here's a fair look" window for new content, not a
 * standing advantage.
 *
 * Personalization (affinity) is a separate multiplier on top — a viewer
 * who's recently engaged with this post's vehicle category, or its
 * specific make, sees it ranked higher than an identical post in a
 * category/make they've shown no interest in. Two independent boosts
 * (category and make) stack rather than one overriding the other, since
 * "same category" and "same make" are both real, separately-informative
 * signals (someone who likes JDM builds broadly is a different signal
 * from someone who specifically keeps engaging with Honda content).
 *
 * Following the author is its own, larger boost, independent of and
 * stacking with category/make — it's a deliberate, explicit relationship
 * rather than something inferred from past engagement, so it counts for
 * more than either inferred signal. Without this, a post from someone
 * you follow competed on pure engagement math exactly like a stranger's,
 * which is backwards for a feed that's supposed to feel like "your
 * people" show up reliably.
 */

export interface PostEngagementSignals {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  /** Videos watched all the way through — always 0 for a photo post. */
  completions: number;
  /** Hours since the post was created. Can be fractional and must be
   * >= 0 — a negative value (clock skew, a bad timestamp) would invert
   * the decay into a boost instead of a penalty. */
  ageHours: number;
}

export interface ViewerAffinity {
  /** True if the viewer has recently liked/saved/shared/completed a
   * watch on a post whose vehicle is in the same category as this one. */
  matchesCategory: boolean;
  /** True if the viewer has recently done the same for the same vehicle
   * make specifically (a narrower, independent signal from category). */
  matchesMake: boolean;
  /** True if the viewer follows this post's author. An explicit,
   * deliberate relationship — not inferred the way category/make are —
   * so it gets its own, larger boost (see FOLLOW_BOOST). */
  isFollowedAuthor: boolean;
}

export const NO_AFFINITY: ViewerAffinity = {
  matchesCategory: false,
  matchesMake: false,
  isFollowedAuthor: false,
};

const WEIGHTS = {
  view: 1,
  like: 5,
  comment: 8,
  save: 6,
  share: 12,
  completion: 4,
} as const;

/** Roughly "two passive views" worth of head start for a brand-new,
 * zero-engagement post — see the module comment for why this exists. */
const BASE_FRESHNESS = 2;

/** Same exponent Hacker News uses for its own ranking formula — steep
 * enough that a post's relative age within the first day or two matters
 * a lot, gentle enough that real engagement still buys a post real
 * extra time near the top rather than being erased within minutes. */
const GRAVITY = 1.5;

const CATEGORY_AFFINITY_BOOST = 0.5;
const MAKE_AFFINITY_BOOST = 0.25;
// Bigger than either inferred-affinity boost — following someone is a
// direct choice the viewer made, not a guess from past behavior.
const FOLLOW_BOOST = 0.75;

export function computeEngagementScore(signals: PostEngagementSignals): number {
  return (
    BASE_FRESHNESS +
    signals.views * WEIGHTS.view +
    signals.likes * WEIGHTS.like +
    signals.comments * WEIGHTS.comment +
    signals.saves * WEIGHTS.save +
    signals.shares * WEIGHTS.share +
    signals.completions * WEIGHTS.completion
  );
}

export function computeHotScore(
  signals: PostEngagementSignals,
  affinity: ViewerAffinity = NO_AFFINITY,
): number {
  const engagement = computeEngagementScore(signals);
  const decay = Math.pow(Math.max(0, signals.ageHours) + 2, GRAVITY);
  const boost =
    1 +
    (affinity.matchesCategory ? CATEGORY_AFFINITY_BOOST : 0) +
    (affinity.matchesMake ? MAKE_AFFINITY_BOOST : 0) +
    (affinity.isFollowedAuthor ? FOLLOW_BOOST : 0);
  return (engagement / decay) * boost;
}
