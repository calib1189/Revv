import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function hasSeenAnnouncement(
  supabase: SupabaseClient<Database>,
  userId: string,
  announcement: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("announcement_views")
    .select("user_id")
    .eq("user_id", userId)
    .eq("announcement", announcement)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

/** Idempotent: seeing it twice (two devices at once) is still one row. */
export async function markAnnouncementSeen(
  supabase: SupabaseClient<Database>,
  userId: string,
  announcement: string,
): Promise<void> {
  const { error } = await supabase
    .from("announcement_views")
    .upsert({ user_id: userId, announcement }, { onConflict: "user_id,announcement", ignoreDuplicates: true });
  if (error) throw error;
}
