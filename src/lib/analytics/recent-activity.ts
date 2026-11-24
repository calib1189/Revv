export type ActivityKind = "view" | "like" | "comment" | "post";

/** One thing a user did, from any of the public activity tables. */
export interface ActivitySignal {
  userId: string;
  at: string;
  kind: ActivityKind;
}

export interface UserActivity {
  userId: string;
  /** The newest signal of any kind. */
  lastSeenAt: string;
  views: number;
  likes: number;
  comments: number;
  posts: number;
}

const FIELD: Record<ActivityKind, "views" | "likes" | "comments" | "posts"> = {
  view: "views",
  like: "likes",
  comment: "comments",
  post: "posts",
};

/** Folds raw signals into one row per user, most recently seen first. */
export function summarizeActivity(signals: ActivitySignal[]): UserActivity[] {
  const byUser = new Map<string, UserActivity>();
  for (const s of signals) {
    let row = byUser.get(s.userId);
    if (!row) {
      row = { userId: s.userId, lastSeenAt: s.at, views: 0, likes: 0, comments: 0, posts: 0 };
      byUser.set(s.userId, row);
    }
    row[FIELD[s.kind]] += 1;
    if (Date.parse(s.at) > Date.parse(row.lastSeenAt)) row.lastSeenAt = s.at;
  }
  return [...byUser.values()].sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Posted 1 · 3 comments · 12 likes · viewed 40 posts", leading with
 * the most deliberate actions. Empty kinds are left out. */
export function describeActivity(a: UserActivity): string {
  const parts: string[] = [];
  if (a.posts > 0) parts.push(plural(a.posts, "post", "posts"));
  if (a.comments > 0) parts.push(plural(a.comments, "comment", "comments"));
  if (a.likes > 0) parts.push(plural(a.likes, "like", "likes"));
  if (a.views > 0) parts.push(`viewed ${plural(a.views, "post", "posts")}`);
  const text = parts.join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Splits at 24 hours ago, the same line the "Active today" count uses. */
export function splitByDay(activity: UserActivity[], now = Date.now()) {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  return {
    today: activity.filter((a) => Date.parse(a.lastSeenAt) >= dayAgo),
    earlier: activity.filter((a) => Date.parse(a.lastSeenAt) < dayAgo),
  };
}

/** One thing one person did, with what it was on. */
export interface ActivityEvent {
  kind: ActivityKind;
  at: string;
  postId: string;
  /** Comment text; "" for a GIF comment. */
  body?: string | null;
}

export interface TimelineItem {
  kind: ActivityKind;
  /** Newest time in the item. */
  at: string;
  /** Oldest time in the item; differs from `at` only for grouped views. */
  startAt: string;
  count: number;
  postId: string;
  body: string | null;
}

/** Views this close together read as one scroll, so they show as one
 * "Viewed 12 posts" line rather than twelve. */
const VIEW_RUN_GAP_MS = 30 * 60 * 1000;

/** Newest first, with back-to-back views folded into runs. Everything
 * deliberate (likes, comments, posts) stays its own line. */
export function groupTimeline(events: ActivityEvent[]): TimelineItem[] {
  const sorted = [...events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const items: TimelineItem[] = [];
  for (const e of sorted) {
    const last = items[items.length - 1];
    if (
      e.kind === "view" &&
      last?.kind === "view" &&
      Date.parse(last.startAt) - Date.parse(e.at) <= VIEW_RUN_GAP_MS
    ) {
      last.count += 1;
      last.startAt = e.at;
      continue;
    }
    items.push({ kind: e.kind, at: e.at, startAt: e.at, count: 1, postId: e.postId, body: e.body ?? null });
  }
  return items;
}

/** How many things they did on each of these date keys, in the order
 * given. `dayOf` maps an instant to its date key. */
export function countByDay(
  events: { at: string }[],
  dayKeys: string[],
  dayOf: (at: Date) => string,
): { key: string; count: number }[] {
  const counts = new Map(dayKeys.map((k) => [k, 0]));
  for (const e of events) {
    const key = dayOf(new Date(e.at));
    const n = counts.get(key);
    if (n !== undefined) counts.set(key, n + 1);
  }
  return dayKeys.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}
