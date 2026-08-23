import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Meetup = Database["public"]["Tables"]["meetups"]["Row"];
export type MeetupInsert = Database["public"]["Tables"]["meetups"]["Insert"];

/** Upcoming meetups, soonest first. A small grace window keeps a meetup
 * visible for a bit after it starts rather than yanking it the instant the
 * clock ticks past starts_at. */
export async function listUpcomingMeetups(
  supabase: SupabaseClient<Database>,
): Promise<Meetup[]> {
  const graceWindow = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .gte("starts_at", graceWindow)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listMeetupsByHost(
  supabase: SupabaseClient<Database>,
  hostId: string,
): Promise<Meetup[]> {
  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .eq("host_id", hostId)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createMeetup(
  supabase: SupabaseClient<Database>,
  meetup: MeetupInsert,
): Promise<Meetup> {
  const { data, error } = await supabase
    .from("meetups")
    .insert(meetup)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMeetup(
  supabase: SupabaseClient<Database>,
  meetupId: string,
): Promise<void> {
  const { error } = await supabase.from("meetups").delete().eq("id", meetupId);
  if (error) throw error;
}
