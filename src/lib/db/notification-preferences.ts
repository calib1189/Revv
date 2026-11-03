import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** The kinds of push notification someone can switch off (0094). */
export const PUSH_CATEGORIES = ["likes", "comments", "follows", "messages", "crews", "updates"] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export type NotificationPreferences = Record<PushCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  crews: true,
  updates: true,
};

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
    .select("likes, comments, follows, messages, crews, updates")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? DEFAULT_NOTIFICATION_PREFERENCES;
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
