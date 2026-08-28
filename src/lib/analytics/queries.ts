import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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

/** Distinct viewers who've watched/viewed at least one post recently —
 * post_views is recorded broadly across the feed, reel, and post page
 * (see lib/db/post-views.ts), so it's a far better "is anyone actually
 * using this right now" signal than the events table, which only logs a
 * handful of named actions (signup, post_created, vehicle_created).
 * Distinct-count has to be done client-side — PostgREST's count option
 * counts rows, not unique column values — same reasoning as
 * getEventCounts' aggregation below. */
export async function getActiveUserCounts(
  supabase: SupabaseClient<Database>,
): Promise<ActiveUserCounts> {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("post_views")
    .select("viewer_id, created_at")
    .gte("created_at", since7d);
  if (error) throw error;

  const last7d = new Set(data.map((row) => row.viewer_id));
  const last24h = new Set(data.filter((row) => row.created_at >= since24h).map((row) => row.viewer_id));

  return { last24h: last24h.size, last7d: last7d.size };
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
