import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  username: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Which of these usernames already belong to someone, in one query. */
export async function listTakenUsernames(
  supabase: SupabaseClient<Database>,
  usernames: string[],
): Promise<Set<string>> {
  if (usernames.length === 0) return new Set();
  const { data, error } = await supabase.from("profiles").select("username").in("username", usernames);
  if (error) throw error;
  return new Set(data.map((row) => row.username));
}

export async function getProfileByUsername(
  supabase: SupabaseClient<Database>,
  username: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProfilesByIds(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Profile[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (error) throw error;
  return data;
}

/** Profile info for the sitemap — every profile is publicly readable,
 * but a banned user's profile shouldn't be actively promoted in search
 * results even though it still works if linked directly. Capped and
 * ordered by recency for the same unbounded-sitemap reason as
 * listSitemapVehicles/listSitemapPosts. */
export async function listSitemapProfiles(
  supabase: SupabaseClient<Database>,
  limit = 5000,
): Promise<{ id: string; username: string; isBanned: boolean; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_banned, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    username: p.username,
    isBanned: p.is_banned,
    createdAt: p.created_at,
  }));
}

export type AdminUserFilter = "all" | "verified" | "founder" | "banned" | "admins";
export const ADMIN_USERS_PAGE_SIZE = 50;

/** Every account, newest first, one page at a time, with the total — the
 * admin Users page. Profiles are publicly readable (RLS), so this works
 * for anyone; the admin layout is what keeps the page itself admin-only.
 * The search term is cut down to characters a username or display name
 * can hold before it goes into PostgREST's `or` filter, where a comma or
 * parenthesis from the search box would otherwise break the query. */
export async function listProfilesForAdmin(
  supabase: SupabaseClient<Database>,
  { query = "", filter = "all", page = 1 }: { query?: string; filter?: AdminUserFilter; page?: number },
): Promise<{ profiles: Profile[]; total: number }> {
  let request = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const term = query.replace(/[^\p{L}\p{N}_.\-\s]/gu, "").trim();
  if (term) request = request.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  if (filter === "verified") request = request.eq("is_verified", true);
  if (filter === "founder") request = request.eq("is_founder", true);
  if (filter === "banned") request = request.eq("is_banned", true);
  if (filter === "admins") request = request.eq("is_admin", true);

  const from = (Math.max(1, page) - 1) * ADMIN_USERS_PAGE_SIZE;
  const { data, error, count } = await request.range(from, from + ADMIN_USERS_PAGE_SIZE - 1);
  if (error) throw error;
  return { profiles: data, total: count ?? data.length };
}

export async function searchProfilesByUsername(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 20,
): Promise<Profile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${trimmed}%`)
    .order("username", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Admin-only in practice — see 0068_admin_manage_profile_badges.sql's
 * protect_is_verified_column trigger, which reverts this column for any
 * non-admin write regardless of what the caller passes. */
export async function setUserVerified(
  supabase: SupabaseClient<Database>,
  userId: string,
  verified: boolean,
): Promise<void> {
  // Read back rather than trusting a clean response: RLS filtering the
  // row out, or the trigger reverting the column, both come back without
  // an error — the badge just silently doesn't change.
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_verified: verified })
    .eq("id", userId)
    .select("is_verified");
  if (error) throw error;
  if (data.length === 0 || data[0].is_verified !== verified) {
    throw new Error("The verified badge didn't change. Only admins can set it.");
  }
}

/** Admin-only in practice — see protect_is_founder_column. Founder is a
 * single-account title by convention, not enforced as unique in the
 * schema; the admin UI is what keeps it meaningful. */
export async function setUserFounder(
  supabase: SupabaseClient<Database>,
  userId: string,
  isFounder: boolean,
): Promise<void> {
  const { error } = await supabase.from("profiles").update({ is_founder: isFounder }).eq("id", userId);
  if (error) throw error;
}

export async function updateProfileBio(
  supabase: SupabaseClient<Database>,
  userId: string,
  bio: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ bio })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileUsername(
  supabase: SupabaseClient<Database>,
  userId: string,
  username: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markProfileOnboarded(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId)
    .is("onboarded_at", null);

  if (error) throw error;
}

export async function updateProfileDisplayName(
  supabase: SupabaseClient<Database>,
  userId: string,
  displayName: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Blocks/unblocks new posts and comments at the RLS layer (see
 * 0055_user_bans.sql) — not a full account lockout, login still works. */
export async function setUserBanned(
  supabase: SupabaseClient<Database>,
  userId: string,
  banned: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: banned, banned_at: banned ? new Date().toISOString() : null })
    .eq("id", userId);
  if (error) throw error;
}

/** Up to 3 achievement ids (validated by the caller — see
 * updateShowcaseAction) to pin on the profile header, in display
 * order. The DB's own check constraint (0075_achievement_showcase.sql)
 * is the hard backstop on the count; this is just the write. */
export async function updateShowcasedAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
  achievementIds: string[],
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ showcased_achievement_ids: achievementIds })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export type EquipCategory =
  | "name_color"
  | "profile_background"
  | "showcase_frame"
  | "vehicle_name_color";

/** `itemId: null` unequips — back to the default look for that slot.
 * Ownership is checked by the caller (features/store/actions.ts), not
 * here; this is just the write. Explicit per-category update objects
 * rather than a computed column key — Supabase's generated Update type
 * rejects an arbitrary string index. Garage Backdrop isn't here — it's
 * per-vehicle (vehicles.equipped_backdrop), not an account-wide slot;
 * see equipVehicleBackdropAction in features/garage/actions.ts. */
export async function updateEquippedCosmetic(
  supabase: SupabaseClient<Database>,
  userId: string,
  category: EquipCategory,
  itemId: string | null,
): Promise<Profile> {
  const patch =
    category === "name_color"
      ? { equipped_name_color: itemId }
      : category === "profile_background"
        ? { equipped_profile_background: itemId }
        : category === "showcase_frame"
          ? { equipped_showcase_frame: itemId }
          : { equipped_vehicle_name_color: itemId };

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  avatarMediaId: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_media_id: avatarMediaId })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
