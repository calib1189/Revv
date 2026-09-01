import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

/** Post ids for the sitemap — a plain id list (see listSitemapVehicles in
 * vehicles.ts for why: avoids depending on PostgREST's embedded-resource
 * relationship cache). Capped and ordered by recency for the same
 * unbounded-sitemap reason. */
export async function listSitemapPosts(
  supabase: SupabaseClient<Database>,
  limit = 5000,
): Promise<{ id: string; authorId: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.map((p) => ({ id: p.id, authorId: p.author_id, createdAt: p.created_at }));
}

export async function listFeedPosts(
  supabase: SupabaseClient<Database>,
  {
    before,
    limit = 12,
    vehicleIds,
  }: { before?: string; limit?: number; vehicleIds?: string[] } = {},
): Promise<Post[]> {
  if (vehicleIds && vehicleIds.length === 0) return [];

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);
  if (vehicleIds) query = query.in("vehicle_id", vehicleIds);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** A single crew's own feed — same shape as listFeedPosts, filtered to
 * one crew instead of a vehicle-category id list. Posts here also still
 * show up in the main feed (crew_id is an additive tag, not a
 * partition) — this is purely the crew page's own view. */
export async function listCrewFeedPosts(
  supabase: SupabaseClient<Database>,
  crewId: string,
  { before, limit = 12 }: { before?: string; limit?: number } = {},
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .eq("crew_id", crewId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listVideoPosts(
  supabase: SupabaseClient<Database>,
  { before, limit = 6 }: { before?: string; limit?: number } = {},
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .eq("post_type", "video")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listPostsByAuthor(
  supabase: SupabaseClient<Database>,
  authorId: string,
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/** Matches posts whose caption contains every word in the query
 * (case-insensitive) — covers both plain descriptions ("red mustang gt")
 * and hashtags ("#mustang"), since both are just text within the caption. */
export async function searchPostsByCaption(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 20,
): Promise<Post[]> {
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length === 0) return [];

  let builder = supabase
    .from("posts")
    .select("*")
    .not("caption", "is", null);

  for (const word of words) {
    builder = builder.ilike("caption", `%${word}%`);
  }

  const { data, error } = await builder
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Matches posts by caption text OR by their tagged vehicle's make, model,
 * trim, color, or nickname — so "red mustang gt" finds a post whose vehicle
 * record says Ford / Mustang / GT / Red even if the caption never mentions
 * any of it, not just literal caption substring hits. */
export async function searchPosts(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 20,
): Promise<Post[]> {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.replace(/[,()%]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return [];

  const [byCaption, vehicleIds] = await Promise.all([
    searchPostsByCaption(supabase, query, limit),
    searchVehicleIdsByText(supabase, words),
  ]);

  let byVehicle: Post[] = [];
  if (vehicleIds.length > 0) {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .in("vehicle_id", vehicleIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    byVehicle = data;
  }

  const byId = new Map<string, Post>();
  for (const post of [...byCaption, ...byVehicle]) byId.set(post.id, post);
  return [...byId.values()]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

async function searchVehicleIdsByText(
  supabase: SupabaseClient<Database>,
  words: string[],
): Promise<string[]> {
  let builder = supabase.from("vehicles").select("id");
  for (const word of words) {
    builder = builder.or(
      `make.ilike.%${word}%,model.ilike.%${word}%,trim.ilike.%${word}%,nickname.ilike.%${word}%,color.ilike.%${word}%`,
    );
  }
  const { data, error } = await builder.limit(50);
  if (error) throw error;
  return data.map((v) => v.id);
}

export async function getPostById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPost(
  supabase: SupabaseClient<Database>,
  input: PostInsert,
): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

/** RLS ("authors update their own posts", 0014) is the only thing
 * enforcing ownership here — a caller updating someone else's post id
 * just silently affects zero rows rather than needing a check here too. */
export async function updatePostCaption(
  supabase: SupabaseClient<Database>,
  id: string,
  caption: string | null,
): Promise<void> {
  const { error } = await supabase.from("posts").update({ caption }).eq("id", id);
  if (error) throw error;
}
