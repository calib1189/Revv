import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Meetup = Database["public"]["Tables"]["meetups"]["Row"];
export type MeetupInsert = Database["public"]["Tables"]["meetups"]["Insert"];
export type MeetupTier = Meetup["tier"];

/** The only prices that exist — looked up server-side by tier key, never
 * trusted from the client, same reasoning as AD_TIERS in ad-campaigns.ts.
 * Labels match the Silver/Gold/Diamond branding used across every paid
 * tier in the app — see components/ui/tier-picker.tsx. Each tier sorts
 * ahead of every tier below it regardless of distance (enforced
 * client-side in meetups-list.tsx, using MEETUP_TIER_RANK below) — the
 * same "pay for more visibility" idea as an ad campaign, just for a
 * listing. Diamond is top-tier placement, NOT a guaranteed #1 slot: two
 * Diamond meets in the same area are tie-broken by distance from
 * whoever's viewing, same as shop promotions (see
 * shop-promotions.ts) — don't market it as exclusive in copy. */
export const MEETUP_TIERS: Record<MeetupTier, { label: string; priceCents: number }> = {
  standard: { label: "Silver", priceCents: 1000 },
  promoted: { label: "Gold", priceCents: 2500 },
  diamond: { label: "Diamond", priceCents: 5000 },
};

/** Higher first — the single source of truth for ranking tiers against
 * each other when sorting meetups, mirroring SHOP_PROMOTION_TIER_RANK. */
export const MEETUP_TIER_RANK: Record<MeetupTier, number> = {
  diamond: 3,
  promoted: 2,
  standard: 1,
};

export function isMeetupTier(value: string): value is MeetupTier {
  return value in MEETUP_TIERS;
}

/** Upcoming meetups, soonest first. A small grace window keeps a meetup
 * visible for a bit after it starts rather than yanking it the instant the
 * clock ticks past starts_at. `status = 'active'` is also enforced by RLS
 * for anyone but the host, but filtering here too keeps this query
 * correct on its own terms rather than leaning entirely on that.
 *
 * Promoted-first ordering happens client-side in meetups-list.tsx,
 * alongside the distance sort it already does — not here, since
 * PostgREST's .order() can't express "promoted' before 'standard'"
 * without leaning on tier names happening to sort alphabetically the
 * right way, which is fragile and stops being true the moment a third
 * tier is added. */
export async function listUpcomingMeetups(
  supabase: SupabaseClient<Database>,
): Promise<Meetup[]> {
  const graceWindow = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .eq("status", "active")
    .gte("starts_at", graceWindow)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data;
}

/** A single crew's Events tab — every meetup tagged to that crew,
 * regardless of status, since a leader/admin browsing their own crew's
 * page should still see one they just created that's still
 * pending_payment/pending_review (RLS's own host/admin read policies
 * already gate who can actually see a non-active row here). */
export async function listCrewMeetups(
  supabase: SupabaseClient<Database>,
  crewId: string,
): Promise<Meetup[]> {
  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .eq("crew_id", crewId)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getMeetupById(
  supabase: SupabaseClient<Database>,
  meetupId: string,
): Promise<Meetup | null> {
  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .eq("id", meetupId)
    .maybeSingle();

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

/** The admin review queue's source list — mirrors
 * listPendingReviewCampaigns in ad-campaigns.ts exactly. */
export async function listPendingReviewMeetups(
  supabase: SupabaseClient<Database>,
): Promise<Meetup[]> {
  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateMeetupStatus(
  supabase: SupabaseClient<Database>,
  meetupId: string,
  status: "active" | "rejected",
): Promise<void> {
  const { error } = await supabase.from("meetups").update({ status }).eq("id", meetupId);
  if (error) throw error;
}
