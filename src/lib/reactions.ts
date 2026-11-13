/** Reactions on DMs and comments: one per person per message or comment.
 * Drawn as the app's own icons (features/reactions), not emoji. */
export const REACTIONS = ["heart", "fire", "laugh", "wow", "sad", "up"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const REACTION_LABELS: Record<Reaction, string> = {
  heart: "Love",
  fire: "Fire",
  laugh: "Haha",
  wow: "Wow",
  sad: "Sad",
  up: "Like",
};

export function isReaction(v: unknown): v is Reaction {
  return typeof v === "string" && (REACTIONS as readonly string[]).includes(v);
}

/** What shows under a comment or on a bubble: how many of each, and the
 * viewer's own. */
export interface ReactionSummary {
  counts: Partial<Record<Reaction, number>>;
  mine: Reaction | null;
}

export const NO_REACTIONS: ReactionSummary = { counts: {}, mine: null };

export function summarizeReactions(rows: { userId: string; reaction: string }[], viewerId: string | null): ReactionSummary {
  const counts: Partial<Record<Reaction, number>> = {};
  let mine: Reaction | null = null;
  for (const row of rows) {
    if (!isReaction(row.reaction)) continue;
    counts[row.reaction] = (counts[row.reaction] ?? 0) + 1;
    if (row.userId === viewerId) mine = row.reaction;
  }
  return { counts, mine };
}

/** The reactions used, most popular first. */
export function topReactions(s: ReactionSummary): Reaction[] {
  return REACTIONS.filter((r) => (s.counts[r] ?? 0) > 0).sort((a, b) => (s.counts[b] ?? 0) - (s.counts[a] ?? 0));
}

export function totalReactions(s: ReactionSummary): number {
  return REACTIONS.reduce((sum, r) => sum + (s.counts[r] ?? 0), 0);
}

/** The summary after the viewer sets their reaction (or clears it with
 * null), for updating the screen before the server answers. */
export function withMyReaction(s: ReactionSummary, next: Reaction | null): ReactionSummary {
  const counts = { ...s.counts };
  if (s.mine) counts[s.mine] = Math.max(0, (counts[s.mine] ?? 0) - 1);
  if (next) counts[next] = (counts[next] ?? 0) + 1;
  return { counts, mine: next };
}
