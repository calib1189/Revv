import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  getDailyVoteTotal,
  listDailyPlacements,
  listDailySubmissions,
  type DailyChallenge,
} from "@/lib/db/daily";
import { composeDailyEntries, type DailyEntry } from "@/lib/daily/compose";
import { settleDailyChallenge } from "@/lib/daily/settle";

export interface PodiumEntry {
  entry: DailyEntry;
  place: number;
  votes: number;
  tied: boolean;
}

export interface ChallengeResults {
  podium: PodiumEntry[];
  entryCount: number;
  voteTotal: number;
}

/** A finished challenge's podium. Settles it first if the hourly job
 * hasn't yet, so results never wait on a late scheduled run. */
export async function loadChallengeResults(
  supabase: SupabaseClient<Database>,
  challenge: DailyChallenge,
): Promise<ChallengeResults> {
  if (!challenge.results_finalized_at) {
    await settleDailyChallenge(challenge).catch(() => undefined);
  }
  const [submissions, placements, voteTotal] = await Promise.all([
    listDailySubmissions(supabase, challenge.id),
    listDailyPlacements(supabase, [challenge.id]),
    getDailyVoteTotal(supabase, challenge.id),
  ]);
  const placedIds = new Set(placements.map((p) => p.submission_id));
  const entries = await composeDailyEntries(
    supabase,
    submissions.filter((s) => placedIds.has(s.id)),
  );
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const perPlace = new Map<number, number>();
  for (const p of placements) perPlace.set(p.place, (perPlace.get(p.place) ?? 0) + 1);

  const podium = placements
    .filter((p) => entryById.has(p.submission_id))
    .sort((a, b) => a.place - b.place || b.votes - a.votes)
    .map((p) => ({
      entry: entryById.get(p.submission_id)!,
      place: p.place,
      votes: p.votes,
      tied: (perPlace.get(p.place) ?? 0) > 1,
    }));

  return { podium, entryCount: submissions.length, voteTotal };
}
