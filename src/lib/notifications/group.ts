import type { Notification } from "@/lib/db/notifications";

export type GroupableNotification = Pick<
  Notification,
  "id" | "kind" | "actor_id" | "target_type" | "target_id" | "read_at" | "created_at"
>;

export interface NotificationGroup<T extends GroupableNotification> {
  /** The newest notification in the run: its actor, time and link. */
  lead: T;
  ids: string[];
  /** Distinct things acted on, so "liked 2 of your posts" stays true when
   * one post was liked, unliked and liked again. */
  targetCount: number;
  unread: boolean;
}

/** Repeats worth folding: one person liking or commenting on several
 * posts in a row. Follows, ratings and admin events stay one per row. */
const GROUPABLE_KINDS = new Set(["like", "comment"]);

/**
 * Folds back-to-back notifications from the same person of the same
 * groupable kind into one row, the way iOS stacks repeats, so the inbox
 * reads "turbussy liked 2 of your posts" instead of the same line twice.
 * Expects newest-first order and keeps it; a run only joins notifications
 * that are adjacent, so the timeline never reorders.
 */
export function groupNotifications<T extends GroupableNotification>(
  notifications: T[],
): NotificationGroup<T>[] {
  const groups: { lead: T; items: T[] }[] = [];
  for (const n of notifications) {
    const last = groups[groups.length - 1];
    if (
      last &&
      n.actor_id &&
      GROUPABLE_KINDS.has(n.kind) &&
      last.lead.kind === n.kind &&
      last.lead.actor_id === n.actor_id
    ) {
      last.items.push(n);
    } else {
      groups.push({ lead: n, items: [n] });
    }
  }
  return groups.map(({ lead, items }) => ({
    lead,
    ids: items.map((i) => i.id),
    targetCount: new Set(items.map((i) => i.target_id ?? i.id)).size,
    unread: items.some((i) => !i.read_at),
  }));
}

/** The verb for a grouped row, e.g. "liked 3 of your posts". */
export function groupedVerb(kind: string, targetCount: number, singleVerb: string): string {
  if (targetCount < 2) return singleVerb;
  if (kind === "like") return `liked ${targetCount} of your posts`;
  if (kind === "comment") return `commented on ${targetCount} of your posts`;
  return singleVerb;
}
