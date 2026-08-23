import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Media } from "@/lib/db/media";

export type MeetupMedia = Database["public"]["Tables"]["meetup_media"]["Row"];
export type MeetupMediaWithMedia = MeetupMedia & { media: Media };

export async function listMeetupMediaForMeetups(
  supabase: SupabaseClient<Database>,
  meetupIds: string[],
): Promise<MeetupMediaWithMedia[]> {
  if (meetupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("meetup_media")
    .select("*, media(*)")
    .in("meetup_id", meetupIds)
    .order("position", { ascending: true });

  if (error) throw error;
  return data as MeetupMediaWithMedia[];
}

export async function addMeetupMedia(
  supabase: SupabaseClient<Database>,
  meetupId: string,
  mediaId: string,
  position: number,
): Promise<MeetupMedia> {
  const { data, error } = await supabase
    .from("meetup_media")
    .insert({ meetup_id: meetupId, media_id: mediaId, position })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
