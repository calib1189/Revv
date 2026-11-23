import { SYSTEM_NOTIFICATION_KINDS } from "@/lib/notifications/verbs";

interface NotificationLike {
  kind: string;
  read_at: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface NotificationBucket<T> {
  latest: T | null;
  unread: number;
}

/** The inbox's two pinned rows: activity from people (likes, comments,
 * follows…) and system notices (approvals, verification), each with its
 * newest item and unread count. Input newest first, as listed. */
export function summarizeNotifications<T extends NotificationLike>(items: T[]): { activity: NotificationBucket<T>; system: NotificationBucket<T> } {
  const activity: NotificationBucket<T> = { latest: null, unread: 0 };
  const system: NotificationBucket<T> = { latest: null, unread: 0 };
  for (const item of items) {
    const bucket = SYSTEM_NOTIFICATION_KINDS.has(item.kind) ? system : activity;
    bucket.latest ??= item;
    if (!item.read_at) bucket.unread++;
  }
  return { activity, system };
}

/** A conversation's second line: their last message, or for mine
 * "Seen" once they've read it and "Sent" until then. */
export function conversationStatus(
  last: { sender_id: string; body: string; gif_id?: string | null; read_at: string | null } | undefined,
  viewerId: string,
): { text: string; unread: boolean; mine: boolean } {
  if (!last) return { text: "Say hi", unread: false, mine: false };
  if (last.sender_id === viewerId) return { text: last.read_at ? "Seen" : "Sent", unread: false, mine: true };
  return { text: last.gif_id ? "Sent a GIF" : last.body, unread: !last.read_at, mine: false };
}
