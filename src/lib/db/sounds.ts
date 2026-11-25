import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SoundGenre } from "@/lib/sounds/genres";

/** Postgres's "undefined column": the genre filter running before
 * 0096_sounds_genre_credit.sql is applied. No sound has a genre yet then,
 * so an empty list is the true answer, not an error to show. */
const UNDEFINED_COLUMN = "42703";

/** The synthesized starter loops (scripts/generate-sounds.mjs). Members
 * said they didn't sound like real music, so browsing and search leave
 * them out. A post that already uses one still plays it: lookups by id
 * don't filter. */
const HIDDEN_SOURCE = "original";

/** A video's own audio, made a sound when it was posted. */
const POST_AUDIO_SOURCE = "post_audio";

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
  genre: SoundGenre | null = null,
): Promise<Sound[]> {
  // Commas and parentheses are PostgREST's own .or() syntax, so a query
  // containing them would break the filter rather than match literally.
  const trimmed = query.trim().replace(/[,()]/g, " ").trim();
  if (!trimmed) return [];

  let request = supabase
    .from("sounds")
    .select("*")
    .neq("source", HIDDEN_SOURCE)
    .or(`title.ilike.%${trimmed}%,artist_name.ilike.%${trimmed}%`);
  if (genre) request = request.eq("genre", genre);
  const { data, error } = await request.order("created_at", { ascending: false }).limit(limit);

  if (error) {
    if (genre && error.code === UNDEFINED_COLUMN) return [];
    throw error;
  }
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

  // Chunked so the id list never makes the request URL too long.
  for (let i = 0; i < soundIds.length; i += 150) {
    const { data, error } = await supabase
      .from("posts")
      .select("sound_id")
      .in("sound_id", soundIds.slice(i, i + 150));

    if (error) throw error;
    for (const row of data) {
      if (!row.sound_id) continue;
      counts.set(row.sound_id, (counts.get(row.sound_id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Every sound someone can put on a post, optionally within one genre:
 * the library, members' uploads and the audio of posted videos, most used
 * first, then newest. Only the retired starter loops are left out. For
 * the picker, where a sound you can't find is a sound you can't use. */
export async function listAllSounds(
  supabase: SupabaseClient<Database>,
  genre: SoundGenre | null = null,
): Promise<{ sounds: Sound[]; counts: Map<string, number> }> {
  let request = supabase.from("sounds").select("*").neq("source", HIDDEN_SOURCE);
  if (genre) request = request.eq("genre", genre);
  const { data, error } = await request.order("created_at", { ascending: false }).limit(1000);

  if (error) {
    if (genre && error.code === UNDEFINED_COLUMN) return { sounds: [], counts: new Map() };
    throw error;
  }
  const counts = await getSoundUsageCounts(supabase, data.map((s) => s.id));
  // Stable sort: equal counts keep the newest-first order from the query.
  const sounds = [...data].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  return { sounds, counts };
}

/** "Trending" sounds for the browse page, optionally within one genre: a
 * recent candidate pool ranked by how many posts currently use them. Not a stored counter — see
 * getSoundUsageCounts. Good enough at today's catalog size; if the sounds
 * table grows large, this candidate-pool approach (rather than a stored
 * counter) is the first thing to revisit. */
export async function listTrendingSounds(
  supabase: SupabaseClient<Database>,
  limit = 30,
  genre: SoundGenre | null = null,
): Promise<Sound[]> {
  let request = supabase
    .from("sounds")
    .select("*")
    .not("source", "in", `(${HIDDEN_SOURCE},${POST_AUDIO_SOURCE})`);
  if (genre) request = request.eq("genre", genre);
  const { data, error } = await request.order("created_at", { ascending: false }).limit(200);

  if (error) {
    if (genre && error.code === UNDEFINED_COLUMN) return [];
    throw error;
  }

  // Every video posted with its own audio makes one of these, so they're
  // their own pool (they'd crowd the library out of the one above), and
  // trend only once someone besides the original post has used one. They
  // have no genre, so a genre filter leaves them out.
  let postAudio: Sound[] = [];
  if (!genre) {
    const { data: rows, error: postAudioError } = await supabase
      .from("sounds")
      .select("*")
      .eq("source", POST_AUDIO_SOURCE)
      .order("created_at", { ascending: false })
      .limit(200);
    if (postAudioError) throw postAudioError;
    postAudio = rows;
  }

  const candidates = [...data, ...postAudio];
  if (candidates.length === 0) return [];

  const counts = await getSoundUsageCounts(supabase, candidates.map((s) => s.id));
  return candidates
    .filter((s) => s.source !== POST_AUDIO_SOURCE || (counts.get(s.id) ?? 0) >= 2)
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
