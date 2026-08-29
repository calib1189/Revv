import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ShopSearchResponse, ShopDetailsResponse } from "@/lib/providers/places-provider";

// Shop listings don't change minute-to-minute — 24h keeps costs down
// while staying well within how often a rating, address, or open-hours
// status would realistically shift.
const CACHE_TTL_HOURS = 24;

// ~11km grid at the equator (a bit tighter at higher latitudes) — coarse
// enough that different people searching "General Repair" in the same
// city share one cached answer, which is the entire point, without being
// so coarse it lumps genuinely different areas together. The search
// itself already covers a 15-mile radius (see google-places-provider.ts),
// so this bucketing is well inside that margin of imprecision already.
function bucketCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildPlacesCacheKey(kind: "category" | "query", value: string, lat: number, lng: number): string {
  const normalized = value.trim().toLowerCase();
  return `${kind}:${normalized}:${bucketCoordinate(lat)}:${bucketCoordinate(lng)}`;
}

export async function getCachedPlacesSearch(
  supabase: SupabaseClient<Database>,
  cacheKey: string,
): Promise<ShopSearchResponse | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("places_search_cache")
    .select("response")
    .eq("cache_key", cacheKey)
    .gt("created_at", cutoff)
    .maybeSingle();

  if (error || !data) return null;
  return data.response as unknown as ShopSearchResponse;
}

/**
 * Server-only — deliberately uses the service role rather than the
 * caller's own client. RLS on this table has no insert/update policy for
 * anon/authenticated at all, since anyone able to write to it could
 * poison it with fake shop data that every future search for that key
 * would then serve back as if it were real. This is the only path that
 * can write.
 */
export async function setCachedPlacesSearch(cacheKey: string, response: ShopSearchResponse): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("places_search_cache")
    .upsert(
      { cache_key: cacheKey, response: response as unknown as Json, created_at: new Date().toISOString() },
      { onConflict: "cache_key" },
    );
}

// Keyed purely by place ID, not coordinates — a Place Details lookup
// doesn't take a location at all, unlike Text Search, so there's no
// coordinate to bucket. Same table, same TTL, same reasoning.
export function buildShopDetailsCacheKey(placeId: string): string {
  return `details:${placeId}`;
}

export async function getCachedShopDetails(
  supabase: SupabaseClient<Database>,
  cacheKey: string,
): Promise<ShopDetailsResponse | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("places_search_cache")
    .select("response")
    .eq("cache_key", cacheKey)
    .gt("created_at", cutoff)
    .maybeSingle();

  if (error || !data) return null;
  return data.response as unknown as ShopDetailsResponse;
}

export async function setCachedShopDetails(cacheKey: string, response: ShopDetailsResponse): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("places_search_cache")
    .upsert(
      { cache_key: cacheKey, response: response as unknown as Json, created_at: new Date().toISOString() },
      { onConflict: "cache_key" },
    );
}
