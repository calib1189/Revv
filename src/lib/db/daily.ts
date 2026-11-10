import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { dayBounds, weekdayOf } from "@/lib/daily/day";
import { WEEKDAY_ROTATION, type ChallengeIcon } from "@/lib/daily/rotation";

export type DailyChallenge = Database["public"]["Tables"]["daily_challenges"]["Row"];
export type DailySubmission = Database["public"]["Tables"]["daily_submissions"]["Row"];

export async function getDailyChallengeByDate(
  supabase: SupabaseClient<Database>,
  dateKey: string,
): Promise<DailyChallenge | null> {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("challenge_date", dateKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDailyChallengeById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<DailyChallenge | null> {
  const { data, error } = await supabase.from("daily_challenges").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Makes sure a challenge exists for this date, creating it from the
 * weekday rotation if nobody scheduled one. Runs with the service role
 * (only admins can insert through RLS) and is safe to call any number of
 * times: the date is unique, so a race just keeps whichever row won. */
export async function ensureDailyChallenge(dateKey: string): Promise<DailyChallenge> {
  const service = createServiceRoleClient();
  const existing = await getDailyChallengeByDate(service, dateKey);
  if (existing) return existing;

  const template = WEEKDAY_ROTATION[weekdayOf(dateKey)];
  const { startsAt, endsAt } = dayBounds(dateKey);
  const { error } = await service.from("daily_challenges").upsert(
    {
      challenge_date: dateKey,
      title: template.title,
      description: template.description,
      icon: template.icon,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    },
    { onConflict: "challenge_date", ignoreDuplicates: true },
  );
  if (error) throw error;

  const created = await getDailyChallengeByDate(service, dateKey);
  if (!created) throw new Error(`Couldn't create the challenge for ${dateKey}`);
  return created;
}

/** Past challenges, newest first, for the results history. */
export async function listPastDailyChallenges(
  supabase: SupabaseClient<Database>,
  beforeDateKey: string,
  limit = 30,
): Promise<DailyChallenge[]> {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .lt("challenge_date", beforeDateKey)
    .order("challenge_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Admin: every challenge in a date range, including future ones (RLS
 * shows admins unstarted rows). */
export async function listDailyChallengesBetween(
  supabase: SupabaseClient<Database>,
  fromKey: string,
  toKey: string,
): Promise<DailyChallenge[]> {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .gte("challenge_date", fromKey)
    .lte("challenge_date", toKey)
    .order("challenge_date", { ascending: true });
  if (error) throw error;
  return data;
}

/** Admin: schedule or rewrite a date's challenge. RLS limits this to
 * admins; the caller validates the text. */
export async function upsertScheduledChallenge(
  supabase: SupabaseClient<Database>,
  input: {
    dateKey: string;
    title: string;
    description: string;
    icon: ChallengeIcon;
    coverMediaId: string | null;
    adminId: string;
    sponsor: { name: string | null; url: string | null; logoMediaId: string | null; prize: string | null };
  },
): Promise<void> {
  const { startsAt, endsAt } = dayBounds(input.dateKey);
  const base = {
    challenge_date: input.dateKey,
    title: input.title,
    description: input.description,
    icon: input.icon,
    cover_media_id: input.coverMediaId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    created_by: input.adminId,
  };
  const sponsor = {
    sponsor_name: input.sponsor.name,
    sponsor_url: input.sponsor.url,
    sponsor_logo_media_id: input.sponsor.logoMediaId,
    prize: input.sponsor.prize,
  };
  const { error } = await supabase.from("daily_challenges").upsert({ ...base, ...sponsor }, { onConflict: "challenge_date" });
  if (!error) return;
  // Before 0109 the sponsor columns don't exist. An ordinary day still
  // saves; one with sponsor details fails, so the admin knows to apply it.
  const hasSponsor = Object.values(sponsor).some((v) => v !== null);
  if (!hasSponsor && (error.code === "PGRST204" || error.code === "42703")) {
    const retry = await supabase.from("daily_challenges").upsert(base, { onConflict: "challenge_date" });
    if (retry.error) throw retry.error;
    return;
  }
  throw error;
}

/** Puts a future day back on the weekday rotation (RLS only lets admins
 * delete a day that hasn't started). */
export async function deleteScheduledChallenge(supabase: SupabaseClient<Database>, dateKey: string): Promise<void> {
  const { error } = await supabase.from("daily_challenges").delete().eq("challenge_date", dateKey);
  if (error) throw error;
}

export async function listDailySubmissions(
  supabase: SupabaseClient<Database>,
  challengeId: string,
): Promise<DailySubmission[]> {
  const { data, error } = await supabase
    .from("daily_submissions")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getDailySubmissionById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<DailySubmission | null> {
  const { data, error } = await supabase.from("daily_submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Enters a challenge, or replaces your entry if you already have one.
 * RLS enforces the deadline, ownership of the photo and car, and the
 * one-entry-per-person rule. */
export async function upsertDailySubmission(
  supabase: SupabaseClient<Database>,
  input: {
    challengeId: string;
    userId: string;
    mediaId: string;
    vehicleId: string | null;
    caption: string | null;
  },
): Promise<DailySubmission> {
  const { data, error } = await supabase
    .from("daily_submissions")
    .upsert(
      {
        challenge_id: input.challengeId,
        user_id: input.userId,
        media_id: input.mediaId,
        vehicle_id: input.vehicleId,
        caption: input.caption,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "challenge_id,user_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDailySubmission(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("daily_submissions").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Votes and results (0104) ----------

export type DailyVote = Database["public"]["Tables"]["daily_votes"]["Row"];
export type DailyPlacement = Database["public"]["Tables"]["daily_placements"]["Row"];

/** The signed-in user's vote in a challenge, if any (RLS only returns
 * their own). */
export async function getMyDailyVote(
  supabase: SupabaseClient<Database>,
  challengeId: string,
  userId: string,
): Promise<DailyVote | null> {
  const { data, error } = await supabase
    .from("daily_votes")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("voter_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Casts your one vote, or moves it to another entry. */
export async function castDailyVote(
  supabase: SupabaseClient<Database>,
  input: { challengeId: string; voterId: string; submissionId: string },
): Promise<void> {
  const { error } = await supabase.from("daily_votes").upsert(
    {
      challenge_id: input.challengeId,
      voter_id: input.voterId,
      submission_id: input.submissionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "challenge_id,voter_id" },
  );
  if (error) throw error;
}

export async function removeDailyVote(
  supabase: SupabaseClient<Database>,
  challengeId: string,
  voterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("daily_votes")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("voter_id", voterId);
  if (error) throw error;
}

function untyped(supabase: SupabaseClient<Database>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

/** Votes per entry. Empty until the challenge has ended (0104). */
export async function getDailyVoteCounts(
  supabase: SupabaseClient<Database>,
  challengeId: string,
): Promise<Map<string, number>> {
  const { data, error } = await untyped(supabase).rpc("daily_vote_counts", { p_challenge_id: challengeId });
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { submission_id: string; votes: number }[]) {
    counts.set(row.submission_id, Number(row.votes));
  }
  return counts;
}

export async function getDailyVoteTotal(
  supabase: SupabaseClient<Database>,
  challengeId: string,
): Promise<number> {
  const { data, error } = await untyped(supabase).rpc("daily_vote_total", { p_challenge_id: challengeId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function getMyDailyEntryVotes(
  supabase: SupabaseClient<Database>,
  challengeId: string,
): Promise<number> {
  const { data, error } = await untyped(supabase).rpc("my_daily_entry_votes", { p_challenge_id: challengeId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function listDailyPlacements(
  supabase: SupabaseClient<Database>,
  challengeIds: string[],
): Promise<DailyPlacement[]> {
  if (challengeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("daily_placements")
    .select("*")
    .in("challenge_id", challengeIds)
    .order("place", { ascending: true });
  if (error) throw error;
  return data;
}

/** How many times a user has won (placed 1st), for their profile. */
export async function countDailyWins(supabase: SupabaseClient<Database>, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("daily_placements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("place", 1);
  if (error) throw error;
  return count ?? 0;
}

/** Challenges that have ended but haven't been settled yet. */
export async function listUnsettledDailyChallenges(): Promise<DailyChallenge[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("daily_challenges")
    .select("*")
    .lte("ends_at", new Date().toISOString())
    .is("results_finalized_at", null)
    .order("challenge_date", { ascending: true })
    .limit(14);
  if (error) throw error;
  return data;
}

/** Entries across several challenges in one query (results history). */
export async function listDailySubmissionsForChallenges(
  supabase: SupabaseClient<Database>,
  challengeIds: string[],
): Promise<DailySubmission[]> {
  if (challengeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("daily_submissions")
    .select("*")
    .in("challenge_id", challengeIds);
  if (error) throw error;
  return data;
}
