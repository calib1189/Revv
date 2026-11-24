import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { splitByDay, summarizeActivity, type ActivityEvent, type ActivitySignal, type UserActivity } from "@/lib/analytics/recent-activity";

export interface PlatformTotals {
  profiles: number;
  vehicles: number;
  posts: number;
}

/** All computed at read time — no stored counters, matching the
 * "aggregates are never stored" invariant. */
export async function getPlatformTotals(
  supabase: SupabaseClient<Database>,
): Promise<PlatformTotals> {
  const [profiles, vehicles, posts] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
  ]);

  return {
    profiles: profiles.count ?? 0,
    vehicles: vehicles.count ?? 0,
    posts: posts.count ?? 0,
  };
}

export interface ActiveUserCounts {
  last24h: number;
  last7d: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;

/** Every matching row, paged past PostgREST's 1000-row cap so a busy
 * stretch isn't silently cut short. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
}

/** Activity rolled up per person. "Activity" is a post view, like,
 * comment or post — all publicly readable tables. post_views is recorded
 * broadly across the feed, reel and post page (lib/db/post-views.ts), so
 * it catches people who only scroll; the events table logs too few
 * actions to rely on. Someone who only opens DMs won't show, since
 * messages are private. Narrow with `since` and/or `userIds`.
 * Fine at today's volume (a few thousand rows all-time); if post_views
 * gets large, move the per-user max into a SQL function. */
async function fetchActivity(
  supabase: SupabaseClient<Database>,
  { since, userIds }: { since?: string; userIds?: string[] },
): Promise<UserActivity[]> {
  const [views, likes, comments, posts] = await Promise.all([
    fetchAll((a, b) => {
      let q = supabase.from("post_views").select("viewer_id, created_at");
      if (since) q = q.gte("created_at", since);
      if (userIds) q = q.in("viewer_id", userIds);
      return q.order("created_at").range(a, b);
    }),
    fetchAll((a, b) => {
      let q = supabase.from("likes").select("user_id, created_at");
      if (since) q = q.gte("created_at", since);
      if (userIds) q = q.in("user_id", userIds);
      return q.order("created_at").range(a, b);
    }),
    fetchAll((a, b) => {
      let q = supabase.from("comments").select("author_id, created_at");
      if (since) q = q.gte("created_at", since);
      if (userIds) q = q.in("author_id", userIds);
      return q.order("created_at").range(a, b);
    }),
    fetchAll((a, b) => {
      let q = supabase.from("posts").select("author_id, created_at");
      if (since) q = q.gte("created_at", since);
      if (userIds) q = q.in("author_id", userIds);
      return q.order("created_at").range(a, b);
    }),
  ]);

  const signals: ActivitySignal[] = [
    ...views.map((r) => ({ userId: r.viewer_id, at: r.created_at, kind: "view" as const })),
    ...likes.map((r) => ({ userId: r.user_id, at: r.created_at, kind: "like" as const })),
    ...comments.map((r) => ({ userId: r.author_id, at: r.created_at, kind: "comment" as const })),
    ...posts.map((r) => ({ userId: r.author_id, at: r.created_at, kind: "post" as const })),
  ];
  return summarizeActivity(signals);
}

/** Who did anything in the last `days` days, most recent first. */
export async function getRecentActivity(
  supabase: SupabaseClient<Database>,
  days = 7,
): Promise<UserActivity[]> {
  return fetchActivity(supabase, { since: new Date(Date.now() - days * DAY_MS).toISOString() });
}

/** When each of these people last did anything, ever. Anyone missing
 * from the map has no activity at all. */
export async function getLastActiveAt(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const activity = await fetchActivity(supabase, { userIds });
  return new Map(activity.map((a) => [a.userId, a.lastSeenAt]));
}

/** Everything one person has done, all time, newest first — the
 * admin user page. One person's history is small (hundreds of rows). */
export async function getUserActivityEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActivityEvent[]> {
  const [views, likes, comments, posts] = await Promise.all([
    fetchAll((a, b) =>
      supabase.from("post_views").select("post_id, created_at").eq("viewer_id", userId).order("created_at", { ascending: false }).range(a, b),
    ),
    fetchAll((a, b) =>
      supabase.from("likes").select("post_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).range(a, b),
    ),
    fetchAll((a, b) =>
      supabase.from("comments").select("post_id, body, created_at").eq("author_id", userId).order("created_at", { ascending: false }).range(a, b),
    ),
    fetchAll((a, b) =>
      supabase.from("posts").select("id, created_at").eq("author_id", userId).order("created_at", { ascending: false }).range(a, b),
    ),
  ]);
  const events: ActivityEvent[] = [
    ...views.map((r) => ({ kind: "view" as const, at: r.created_at, postId: r.post_id })),
    ...likes.map((r) => ({ kind: "like" as const, at: r.created_at, postId: r.post_id })),
    ...comments.map((r) => ({ kind: "comment" as const, at: r.created_at, postId: r.post_id, body: r.body })),
    ...posts.map((r) => ({ kind: "post" as const, at: r.created_at, postId: r.id })),
  ];
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Counts from the same list the admin home shows, so the numbers and
 * the names always agree. */
export function countActive(activity: UserActivity[], now = Date.now()): ActiveUserCounts {
  return { last24h: splitByDay(activity, now).today.length, last7d: activity.length };
}

export async function getActiveUserCounts(
  supabase: SupabaseClient<Database>,
): Promise<ActiveUserCounts> {
  return countActive(await getRecentActivity(supabase, 7));
}

export interface EventCount {
  name: string;
  count: number;
}

/** Event counts over the last `days` days, grouped by event name. */
export async function getEventCounts(
  supabase: SupabaseClient<Database>,
  days = 30,
): Promise<EventCount[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("name")
    .gte("created_at", since);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
