import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** The kinds of push notification someone can switch off (0094, 0097, 0099). */
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
  "meets",
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
  meets: true,
};

// Postgres "undefined_column": the database is missing a migration that
// added a category column (0097 or 0099).
const UNDEFINED_COLUMN = "42703";

// Newest schema first. Each step back drops the columns one migration
// added, so Settings still loads before that migration is applied and
// the missing categories read as on.
const COLUMN_SETS = [
  "likes, comments, follows, messages, crews, updates, ratings, leaderboard, challenges, meets",
  "likes, comments, follows, messages, crews, updates, ratings, leaderboard, challenges",
  "likes, comments, follows, messages, crews, updates",
];

export function isPushCategory(value: string): value is PushCategory {
  return (PUSH_CATEGORIES as readonly string[]).includes(value);
}

/** Someone's preferences, with every category on when they've never
 * changed one (no row yet). */
export async function getNotificationPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NotificationPreferences> {
  for (const columns of COLUMN_SETS) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select(columns)
      .eq("user_id", userId)
      .maybeSingle();
    if (!error) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data as Partial<NotificationPreferences> | null) };
    }
    if (error.code !== UNDEFINED_COLUMN) throw error;
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
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
