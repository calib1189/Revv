import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getDailyVoteCounts,
  listDailySubmissions,
  listUnsettledDailyChallenges,
  type DailyChallenge,
} from "@/lib/db/daily";
import { computePlacements, type Placement } from "@/lib/daily/placements";
import { rewardPlacements } from "@/lib/daily/rewards";

/** Settles one finished challenge: counts its real votes, works out the
 * podium, and records it. Safe to run more than once: placements are
 * keyed by (challenge, entry) and the challenge is only marked settled
 * after they're written. Returns the podium it recorded. */
export async function settleDailyChallenge(challenge: DailyChallenge): Promise<Placement[]> {
  if (new Date(challenge.ends_at).getTime() > Date.now()) return [];
  const service = createServiceRoleClient();

  const [counts, submissions] = await Promise.all([
    getDailyVoteCounts(service, challenge.id),
    listDailySubmissions(service, challenge.id),
  ]);
  const placements = computePlacements(
    submissions.map((s) => ({ submissionId: s.id, userId: s.user_id, votes: counts.get(s.id) ?? 0 })),
  );

  if (placements.length > 0) {
    const { error } = await service.from("daily_placements").upsert(
      placements.map((p) => ({
        challenge_id: challenge.id,
        submission_id: p.submissionId,
        user_id: p.userId,
        place: p.place,
        votes: p.votes,
      })),
      { onConflict: "challenge_id,submission_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  await rewardPlacements(challenge.challenge_date, placements);

  const { error } = await service
    .from("daily_challenges")
    .update({ results_finalized_at: new Date().toISOString() })
    .eq("id", challenge.id)
    .is("results_finalized_at", null);
  if (error) throw error;

  return placements;
}

/** Settles every challenge that has ended and isn't settled yet. Called
 * by the hourly job, and by the Daily page itself, so results appear
 * even if a scheduled run is late. */
export async function settleDueDailyChallenges(): Promise<{ challenge: DailyChallenge; placements: Placement[] }[]> {
  const due = await listUnsettledDailyChallenges();
  const settled: { challenge: DailyChallenge; placements: Placement[] }[] = [];
  for (const challenge of due) {
    settled.push({ challenge, placements: await settleDailyChallenge(challenge) });
  }
  return settled;
}
