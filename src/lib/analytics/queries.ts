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
