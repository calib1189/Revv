import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type CrewMember = Database["public"]["Tables"]["crew_members"]["Row"];
export type CrewMemberRole = CrewMember["role"];

/** Instant join for a public crew — status 'approved' from the start.
 * RLS ("users self-join public crews...", 0064) rejects this outright if
 * the crew is actually private, so there's no need to check visibility
 * here too. */
export async function joinCrew(
  supabase: SupabaseClient<Database>,
  crewId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .insert({ crew_id: crewId, user_id: userId, role: "member", status: "approved" });
  if (error) throw error;
}

/** Request-to-join for a private crew — status 'pending' until a
 * leader/admin approves it. Same RLS backstop as joinCrew above. */
export async function requestToJoinCrew(
  supabase: SupabaseClient<Database>,
  crewId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .insert({ crew_id: crewId, user_id: userId, role: "member", status: "pending" });
  if (error) throw error;
}

/** Leaving a crew and cancelling your own pending request are the same
 * operation — deleting your own row, regardless of its current status. */
export async function leaveCrew(
  supabase: SupabaseClient<Database>,
  crewId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** The viewer's own membership row for a crew, whatever its status —
 * drives the Join / Request to join / Pending / Leave button state. */
export async function getCrewMembership(
  supabase: SupabaseClient<Database>,
  crewId: string,
  userId: string,
): Promise<CrewMember | null> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .eq("crew_id", crewId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function isCrewMember(
  supabase: SupabaseClient<Database>,
  crewId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("user_id")
    .eq("crew_id", crewId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** The viewer's approved role in this crew, or null if they aren't an
 * approved member — used by Server Actions to gate leader/admin-only
 * operations at the app level, on top of RLS's own coarser check. */
export async function getCrewMemberRole(
  supabase: SupabaseClient<Database>,
  crewId: string,
  userId: string,
): Promise<CrewMemberRole | null> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("role")
    .eq("crew_id", crewId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

/** The Members tab's source list — approved rows only, newest first. */
export async function listCrewMembers(
  supabase: SupabaseClient<Database>,
  crewId: string,
): Promise<CrewMember[]> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .eq("crew_id", crewId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** The Requests page's source list — oldest request first, so the queue
 * clears in the order people actually asked. */
export async function listPendingJoinRequests(
  supabase: SupabaseClient<Database>,
  crewId: string,
): Promise<CrewMember[]> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .eq("crew_id", crewId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getCrewMemberCount(
  supabase: SupabaseClient<Database>,
  crewId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("crew_members")
    .select("*", { count: "exact", head: true })
    .eq("crew_id", crewId)
    .eq("status", "approved");
  if (error) throw error;
  return count ?? 0;
}

/** Batch member counts for a discover-page grid of crews — one query
 * instead of one-per-card, same shape as getLikeCountsForPosts. */
export async function getCrewMemberCountsForCrews(
  supabase: SupabaseClient<Database>,
  crewIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (crewIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("crew_members")
    .select("crew_id")
    .in("crew_id", crewIds)
    .eq("status", "approved");
  if (error) throw error;

  for (const row of data) {
    counts.set(row.crew_id, (counts.get(row.crew_id) ?? 0) + 1);
  }
  return counts;
}

export async function approveJoinRequest(
  supabase: SupabaseClient<Database>,
  crewMemberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .update({ status: "approved" })
    .eq("id", crewMemberId);
  if (error) throw error;
}

/** Rejecting a pending request and kicking an approved member are both
 * just deleting the row — RLS ("...leaders and admins remove others",
 * 0064) is what actually enforces who's allowed to call this. */
export async function rejectJoinRequest(
  supabase: SupabaseClient<Database>,
  crewMemberId: string,
): Promise<void> {
  const { error } = await supabase.from("crew_members").delete().eq("id", crewMemberId);
  if (error) throw error;
}

export async function updateMemberRole(
  supabase: SupabaseClient<Database>,
  crewMemberId: string,
  role: CrewMemberRole,
): Promise<void> {
  const { error } = await supabase.from("crew_members").update({ role }).eq("id", crewMemberId);
  if (error) throw error;
}

export async function removeMember(
  supabase: SupabaseClient<Database>,
  crewMemberId: string,
): Promise<void> {
  const { error } = await supabase.from("crew_members").delete().eq("id", crewMemberId);
  if (error) throw error;
}

/** Approved crew ids for a user, feeding getCrewsByIds for "your crews"
 * sections and the post-composer / meetup-form crew selectors. */
export async function listCrewIdsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("crew_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.crew_id);
}
