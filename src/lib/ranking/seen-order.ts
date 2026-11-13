/**
 * The For You feed's order for one viewer: every post they haven't
 * watched yet comes first, by hot score, and only then the ones they
 * already have, also by score. A great post you've seen never jumps
 * ahead of one you haven't.
 */
export interface ViewerRanked {
  id: string;
  score: number;
  /** Viewed before this scroll session started (see ranked-feed.ts). */
  seen: boolean;
}

export function compareForViewer(a: ViewerRanked, b: ViewerRanked): number {
  if (a.seen !== b.seen) return a.seen ? 1 : -1;
  return b.score - a.score || (a.id < b.id ? -1 : 1);
}

/** Whether `item` comes after the last post of the previous page, in
 * compareForViewer's order. */
export function isAfterCursor(item: ViewerRanked, cursor: { postId: string; score: number; seen: boolean }): boolean {
  if (item.seen !== cursor.seen) return item.seen;
  return item.score < cursor.score || (item.score === cursor.score && item.id > cursor.postId);
}
