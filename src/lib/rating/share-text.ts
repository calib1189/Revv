/** A build score the way the app shows it everywhere: two decimals. */
export function formatScore(score: number): string {
  return score.toFixed(2);
}

/**
 * The message that goes out with a shared build link. A rated build
 * leads with its score and dares the reader to beat it, which is what
 * gets someone to tap through and rate their own car; an unrated one
 * just names the car.
 */
export function buildShareText({
  title,
  score,
  isOwner,
}: {
  title: string;
  score: number | null;
  isOwner: boolean;
}): string {
  if (score == null) {
    return isOwner ? `My ${title} on SORZA` : `Check out this ${title} on SORZA`;
  }
  const formatted = formatScore(score);
  return isOwner
    ? `My ${title} scored ${formatted} on SORZA. Think yours can beat it?`
    : `This ${title} scored ${formatted} on SORZA. Think yours can beat it?`;
}
