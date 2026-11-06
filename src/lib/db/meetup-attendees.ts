import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type MeetupAttendee = Database["public"]["Tables"]["meetup_attendees"]["Row"];

/** Everyone going to one meet, earliest RSVP first. */
export async function listMeetupAttendees(
  supabase: SupabaseClient<Database>,
  meetupId: string,
): Promise<MeetupAttendee[]> {
  const { data, error } = await supabase
    .from("meetup_attendees")
    .select("*")
    .eq("meetup_id", meetupId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Says you're going, or changes the car you're bringing if you already
 * said so. One row per person per meet (the table's primary key). */
export async function setMeetupAttendance(
  supabase: SupabaseClient<Database>,
  meetupId: string,
  userId: string,
  vehicleId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("meetup_attendees")
    .upsert(
      { meetup_id: meetupId, user_id: userId, vehicle_id: vehicleId },
      { onConflict: "meetup_id,user_id" },
    );
  if (error) throw error;
}

export async function removeMeetupAttendance(
  supabase: SupabaseClient<Database>,
  meetupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("meetup_attendees")
    .delete()
    .eq("meetup_id", meetupId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** meetup_id -> number of people going, for a batch of meets (one query,
 * not one per card). */
export async function getAttendeeCountsForMeetups(
  supabase: SupabaseClient<Database>,
  meetupIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (meetupIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("meetup_attendees")
    .select("meetup_id")
    .in("meetup_id", meetupIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.meetup_id, (counts.get(row.meetup_id) ?? 0) + 1);
  }
  return counts;
}
