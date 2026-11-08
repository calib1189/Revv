"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getMediaById } from "@/lib/db/media";
import { getVehicleById } from "@/lib/db/vehicles";
import { createAuditLog } from "@/lib/db/audit-logs";
import {
  castDailyVote,
  deleteDailySubmission,
  ensureDailyChallenge,
  getDailyChallengeById,
  getDailySubmissionById,
  getMyDailyVote,
  removeDailyVote,
  upsertDailySubmission,
  upsertScheduledChallenge,
} from "@/lib/db/daily";
import { dailyDateKey, isChallengeOpen, isDateKey } from "@/lib/daily/day";
import { isChallengeIcon } from "@/lib/daily/rotation";
import { normalizeCaption, normalizeChallengeText } from "@/lib/daily/validation";
import { rewardDailyActivity } from "@/lib/daily/rewards";
import { notifyEntryVote } from "@/lib/daily/notify";
import { getOrCreateRideRound } from "@/lib/daily/ride-server";
import { compareToCommunity, type CommunityComparison } from "@/lib/daily/ride";
import { summarizeReviews } from "@/lib/shops/reviews";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { submitPeerRatingAction } from "@/features/garage/peer-rating-actions";

export interface DailyActionResult {
  error?: string;
}

/** Enters today's challenge, or replaces your entry. The database
 * enforces the deadline and ownership too (0103); these checks are only
 * here so each refusal comes back with the actual reason. */
export async function submitDailyEntryAction(input: {
  mediaId: string;
  vehicleId: string | null;
  caption: string;
}): Promise<DailyActionResult> {
  const caption = normalizeCaption(input.caption);
  if ("error" in caption) return { error: caption.error };
  if (!input.mediaId) return { error: "Pick a photo of your car." };

  const { supabase, user } = await requireUser();

  const media = await getMediaById(supabase, input.mediaId).catch(() => null);
  if (!media || media.owner_id !== user.id || media.kind !== "image") {
    return { error: "Pick one of your own photos." };
  }
  if (input.vehicleId) {
    const vehicle = await getVehicleById(supabase, input.vehicleId).catch(() => null);
    if (!vehicle || vehicle.owner_id !== user.id) return { error: "Pick one of your own cars." };
  }

  let challengeId: string;
  let challengeDate: string;
  try {
    const challenge = await ensureDailyChallenge(dailyDateKey());
    challengeId = challenge.id;
    challengeDate = challenge.challenge_date;
  } catch {
    return { error: "Today's challenge isn't available right now. Try again in a moment." };
  }

  try {
    await upsertDailySubmission(supabase, {
      challengeId,
      userId: user.id,
      mediaId: input.mediaId,
      vehicleId: input.vehicleId,
      caption: caption.value,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "42501") {
      return { error: "Couldn't enter. Today's challenge may have just closed." };
    }
    return { error: "Couldn't save your entry. Try again." };
  }

  after(() => rewardDailyActivity(user.id, challengeDate, "entered"));
  revalidatePath("/daily");
  return {};
}

export async function removeDailyEntryAction(submissionId: string): Promise<DailyActionResult> {
  const { supabase, user } = await requireUser();
  const submission = await getDailySubmissionById(supabase, submissionId).catch(() => null);
  if (!submission || submission.user_id !== user.id) return { error: "Couldn't find your entry." };

  try {
    await deleteDailySubmission(supabase, submissionId);
  } catch {
    return { error: "Couldn't remove your entry. Try again." };
  }
  revalidatePath("/daily");
  return {};
}

/** Admin: schedule a challenge for a date, or rewrite one that's already
 * scheduled (including one the weekday rotation created). */
export async function scheduleDailyChallengeAction(input: {
  dateKey: string;
  title: string;
  description: string;
  icon: string;
  coverMediaId: string | null;
}): Promise<DailyActionResult> {
  if (!isDateKey(input.dateKey)) return { error: "Pick a date." };
  if (input.dateKey < dailyDateKey()) return { error: "That day has already finished." };
  if (!isChallengeIcon(input.icon)) return { error: "Pick a visual." };
  const text = normalizeChallengeText(input);
  if ("error" in text) return { error: text.error };

  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Only admins can do that." };
  }

  try {
    await upsertScheduledChallenge(admin.supabase, {
      dateKey: input.dateKey,
      ...text.value,
      icon: input.icon,
      coverMediaId: input.coverMediaId,
      adminId: admin.userId,
    });
    await createAuditLog(admin.supabase, {
      actorId: admin.userId,
      action: "daily_challenge.scheduled",
      targetType: "daily_challenge",
      metadata: { dateKey: input.dateKey, title: text.value.title },
    }).catch(() => undefined);
  } catch {
    return { error: "Couldn't save that challenge. If this keeps happening, migration 0103 may not be applied yet." };
  }

  revalidatePath("/admin/daily");
  revalidatePath("/daily");
  return {};
}

/** Votes for an entry in today's challenge, or moves your vote to it.
 * Tapping the entry you already voted for takes the vote back. */
export async function voteForDailyEntryAction(submissionId: string): Promise<DailyActionResult & { voted?: boolean }> {
  const { supabase, user } = await requireUser();
  const submission = await getDailySubmissionById(supabase, submissionId).catch(() => null);
  if (!submission) return { error: "That entry was removed." };
  if (submission.user_id === user.id) return { error: "You can't vote for your own entry." };

  const challenge = await getDailyChallengeById(supabase, submission.challenge_id).catch(() => null);
  if (!challenge || !isChallengeOpen(challenge)) {
    return { error: "Voting has closed for this challenge." };
  }

  try {
    const current = await getMyDailyVote(supabase, challenge.id, user.id);
    if (current?.submission_id === submissionId) {
      await removeDailyVote(supabase, challenge.id, user.id);
      revalidatePath("/daily");
      return { voted: false };
    }
    await castDailyVote(supabase, { challengeId: challenge.id, voterId: user.id, submissionId });
    after(async () => {
      await rewardDailyActivity(user.id, challenge.challenge_date, "voted");
      await notifyEntryVote(submission.user_id);
    });
  } catch (err) {
    if ((err as { code?: string }).code === "42501") return { error: "Voting has closed for this challenge." };
    return { error: "Couldn't save your vote. Try again." };
  }

  revalidatePath("/daily");
  return { voted: true };
}

export interface RideResult {
  error?: string;
  myStars?: number;
  /** Everyone's ratings including yours. */
  communityAverage?: number | null;
  communityCount?: number;
  distribution?: Record<1 | 2 | 3 | 4 | 5, number>;
  comparison?: CommunityComparison;
  aiScore?: number | null;
  roundComplete?: boolean;
}

/** Rates one of today's Rate the Ride cars. The rating itself goes
 * through the same peer-rating action the garage page uses (so the owner
 * hears about it and you can't rate your own); this adds the community
 * comparison and marks the round done once every car is rated. */
export async function rateRideAction(vehicleId: string, stars: number): Promise<RideResult> {
  const { supabase, user } = await requireUser();
  const today = dailyDateKey();

  let round: string[];
  try {
    round = await getOrCreateRideRound(user.id, today);
  } catch {
    return { error: "Couldn't load today's rides. Try again." };
  }
  if (!round.includes(vehicleId)) return { error: "That car isn't in today's rides." };

  const saved = await submitPeerRatingAction(vehicleId, stars);
  if (saved.error) return { error: saved.error };

  const [{ data: all }, builds] = await Promise.all([
    supabase.from("peer_ratings").select("rater_id, stars, vehicle_id").in("vehicle_id", round),
    listActiveBuildsByVehicleIds(supabase, [vehicleId]),
  ]);
  const ratings = all ?? [];
  const forCar = ratings.filter((r) => r.vehicle_id === vehicleId);
  const summary = summarizeReviews(forCar.map((r) => r.stars));
  const others = forCar.filter((r) => r.rater_id !== user.id).map((r) => r.stars);
  const othersAverage = others.length ? others.reduce((a, b) => a + b, 0) / others.length : null;
  const ratedInRound = new Set(ratings.filter((r) => r.rater_id === user.id).map((r) => r.vehicle_id));
  const roundComplete = round.every((id) => ratedInRound.has(id));

  if (roundComplete) after(() => rewardDailyActivity(user.id, today, "rated_rides"));

  return {
    myStars: stars,
    communityAverage: summary.average,
    communityCount: summary.count,
    distribution: summary.distribution,
    comparison: compareToCommunity(stars, othersAverage),
    aiScore: builds.get(vehicleId)?.ai_rating_score ?? null,
    roundComplete,
  };
}
