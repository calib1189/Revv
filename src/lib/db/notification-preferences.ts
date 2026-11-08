import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** The kinds of push notification someone can switch off (0094, 0097, 0099, 0106). */
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
  "daily_challenge",
  "daily_results",
  "daily_votes",
  "rate_ride",
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
  daily_challenge: true,
  daily_results: true,
  daily_votes: true,
  rate_ride: true,
};

// Postgres "undefined_column": the database is missing a migration that
// added a category column (0097, 0099 or 0106).
const UNDEFINED_COLUMN = "42703";

// Newest schema first. Each step back drops the columns one migration
// added, so Settings still loads before that migration is applied and
// the missing categories read as on.
const COLUMN_SETS = [
  "likes, comments, follows, messages, crews, updates, ratings, leaderboard, challenges, meets, daily_challenge, daily_results, daily_votes, rate_ride",
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

export interface QuietHours {
  enabled: boolean;
  start: number;
  end: number;
  timeZone: string | null;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { enabled: true, start: 22, end: 8, timeZone: null };

/** Quiet hours and the saved time zone (0106). Defaults (on, 10pm-8am,
 * zone unknown) when there's no row yet or 0106 isn't applied. */
export async function getQuietHours(supabase: SupabaseClient<Database>, userId: string): Promise<QuietHours> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("quiet_hours, quiet_start, quiet_end, time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return DEFAULT_QUIET_HOURS;
  return { enabled: data.quiet_hours, start: data.quiet_start, end: data.quiet_end, timeZone: data.time_zone };
}

export async function setQuietHours(
  supabase: SupabaseClient<Database>,
  userId: string,
  quiet: { enabled: boolean; start: number; end: number },
): Promise<void> {
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      quiet_hours: quiet.enabled,
      quiet_start: quiet.start,
      quiet_end: quiet.end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function setTimeZone(supabase: SupabaseClient<Database>, userId: string, timeZone: string): Promise<void> {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, time_zone: timeZone, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}
