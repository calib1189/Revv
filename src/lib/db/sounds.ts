import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Sound = Database["public"]["Tables"]["sounds"]["Row"];
export type SoundInsert = Database["public"]["Tables"]["sounds"]["Insert"];

export async function createSound(
  supabase: SupabaseClient<Database>,
  input: SoundInsert,
): Promise<Sound> {
  const { data, error } = await supabase
    .from("sounds")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getSoundById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Sound | null> {
  const { data, error } = await supabase
    .from("sounds")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSoundsByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Sound[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from("sounds").select("*").in("id", ids);

  if (error) throw error;
  return data;
}

/** Matches a sound's title or artist name (case-insensitive substring) —
 * same simple ilike approach as searchPostsByCaption. */
export async function searchSounds(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 20,
): Promise<Sound[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("sounds")
    .select("*")
    .or(`title.ilike.%${trimmed}%,artist_name.ilike.%${trimmed}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/** How many posts currently use this sound — computed at read time
 * (invariant: aggregates are never stored), a plain exact count with no
 * row data fetched. */
export async function getSoundUsageCount(
  supabase: SupabaseClient<Database>,
  soundId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("sound_id", soundId);

  if (error) throw error;
  return count ?? 0;
}

/** Batch form of getSoundUsageCount, for a listing page showing many
 * sounds' counts at once without one round-trip per row. PostgREST has no
 * GROUP BY over its REST interface, so this pulls just the sound_id column
 * for every post using one of the given sounds and tallies client-side —
 * fine at today's scale; if this page gets slow, a materialized view
 * keyed by sound_id is the documented next step (see invariant #3). */
export async function getSoundUsageCounts(
  supabase: SupabaseClient<Database>,
  soundIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (soundIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("posts")
    .select("sound_id")
    .in("sound_id", soundIds);

  if (error) throw error;
  for (const row of data) {
    if (!row.sound_id) continue;
    counts.set(row.sound_id, (counts.get(row.sound_id) ?? 0) + 1);
  }
  return counts;
}

/** "Trending" sounds for the browse page: a recent candidate pool ranked
 * by how many posts currently use them. Not a stored counter — see
 * getSoundUsageCounts. Good enough at today's catalog size; if the sounds
 * table grows large, this candidate-pool approach (rather than a stored
 * counter) is the first thing to revisit. */
export async function listTrendingSounds(
  supabase: SupabaseClient<Database>,
  limit = 30,
): Promise<Sound[]> {
  const { data, error } = await supabase
    .from("sounds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  if (data.length === 0) return [];

  const counts = await getSoundUsageCounts(supabase, data.map((s) => s.id));
  return [...data]
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, limit);
}

export async function deleteSound(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("sounds").delete().eq("id", id);
  if (error) throw error;
}

export function publicSoundUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): string {
  return supabase.storage.from("media").getPublicUrl(storagePath).data.publicUrl;
}
