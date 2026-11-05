import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** The kinds of push notification someone can switch off (0094, 0097). */
export const PUSH_CATEGORIES = [
  "likes",
  "comments",
  "follows",
  "messages",
  "crews",
  "updates",
  "ratings",
  "leaderboard",
  "challenges",
] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export type NotificationPreferences = Record<PushCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  crews: true,
  updates: true,
  ratings: true,
  leaderboard: true,
  challenges: true,
};

// Postgres "undefined_column": the database hasn't had 0097 applied yet.
const UNDEFINED_COLUMN = "42703";

export function isPushCategory(value: string): value is PushCategory {
  return (PUSH_CATEGORIES as readonly string[]).includes(value);
}

/** Someone's preferences, with every category on when they've never
 * changed one (no row yet). */
export async function getNotificationPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("likes, comments, follows, messages, crews, updates, ratings, leaderboard, challenges")
    .eq("user_id", userId)
    .maybeSingle();
  if (!error) return data ?? DEFAULT_NOTIFICATION_PREFERENCES;
  if (error.code !== UNDEFINED_COLUMN) throw error;

  // Before 0097: read the original six and treat the new three as on,
  // so Settings still loads and nobody's existing choices are lost.
  const legacy = await supabase
    .from("notification_preferences")
    .select("likes, comments, follows, messages, crews, updates")
    .eq("user_id", userId)
    .maybeSingle();
  if (legacy.error) throw legacy.error;
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...legacy.data };
}

export async function setNotificationPreference(
  supabase: SupabaseClient<Database>,
  userId: string,
  category: PushCategory,
  enabled: boolean,
): Promise<void> {
  const row: Database["public"]["Tables"]["notification_preferences"]["Insert"] = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  row[category] = enabled;
  const { error } = await supabase.from("notification_preferences").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
