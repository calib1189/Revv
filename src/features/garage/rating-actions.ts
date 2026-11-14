"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyLeaderboardDisplacements } from "@/features/leaderboard/notify-displacements";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import {
  getActiveBuild,
  getOrCreateActiveBuild,
  updateBuildRating,
  markBuildRatingAttempt,
  savePendingBuildRating,
  getPendingBuildRating,
  clearPendingBuildRating,
} from "@/lib/db/builds";
import { insertBuildRatingHistory } from "@/lib/db/build-rating-history";
import { listBuildParts } from "@/lib/db/build-parts";
import { buildRatingSummary } from "@/lib/rating/build-summary";
import { getRatingProvider } from "@/lib/providers/get-rating-provider";
import type { RatingPhoto, BuildRating, BuildRatingSubscores } from "@/lib/providers/rating-provider";
import { getPointsBalance } from "@/lib/db/points";
import { nextFreeRateAt, rerateCost } from "@/lib/rating/rerate";
const MAX_PHOTOS = 4;

async function requireOwner(vehicleId: string) {
  const { supabase, user } = await requireConfirmedUser();

  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle || vehicle.owner_id !== user.id) {
    throw new Error("Not found.");
  }
  return { supabase, user, vehicle };
}

/** One photo for the rating call, with a second try: a storage hiccup
 * on any one of up to four photos used to fail the whole rating. */
async function fetchRatingPhoto(url: string): Promise<RatingPhoto> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`);
      const bytes = await res.arrayBuffer();
      const mimeType = res.headers.get("content-type") ?? "image/jpeg";
      return { bytes, mimeType };
    } catch (err) {
      if (attempt >= 2) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export interface GenerateRatingResult {
  data?: BuildRating;
  error?: string;
}

export async function generateBuildRatingAction(
  vehicleId: string,
  /** The points price the owner saw and agreed to; a rating that costs
   * more than this (or anything, when it's missing) isn't run. */
  options: { pointsShown?: number } = {},
): Promise<GenerateRatingResult> {
  const { supabase, user, vehicle } = await requireOwner(vehicleId);

  const [existingBuild, profile] = await Promise.all([
    getActiveBuild(supabase, vehicleId),
    getProfileByUserId(supabase, user.id),
  ]);
  // ai_rating_last_attempt_at (set below, right after a real AI call
  // completes) is the actual gate — it's recorded even if the result
  // never gets confirmed. Falling back to ai_rating_rated_at covers a
  // build whose last rating predates this column existing at all.
  // The first rating is free; every re-rate costs points, more inside
  // the 24 hours after the last (rerateCost). Admins aren't charged, so
  // the app's own team can re-rate freely.
  const lastAttempt = existingBuild?.ai_rating_last_attempt_at ?? existingBuild?.ai_rating_rated_at ?? null;
  const cost = profile?.is_admin
    ? 0
    : rerateCost({ rated: existingBuild?.ai_rating_score != null, freeAt: nextFreeRateAt(lastAttempt) });
  // The points are taken before the AI call and given back if it fails,
  // so a rating is never paid for twice or got for free by a failed charge.
  let chargeId: string | null = null;
  if (cost > 0) {
    if (options.pointsShown == null || cost > options.pointsShown) {
      return { error: `Re-rating this build costs ${cost} points.` };
    }
    const balance = await getPointsBalance(supabase, user.id);
    if (balance < cost) {
      return { error: `You need ${cost} points to re-rate. You have ${balance}.` };
    }
    chargeId = crypto.randomUUID();
    // Every paid re-rate is an 'instant_rerate' ledger row (0112), at
    // either price, so the ledger needs no new type.
    const { error: chargeError } = await createServiceRoleClient().from("points_ledger").insert({
      user_id: user.id,
      amount: -cost,
      source_type: "instant_rerate",
      source_id: chargeId,
    });
    if (chargeError) {
      // Most likely 0112 isn't applied yet, so the ledger refuses the type.
      console.error("instant re-rate charge failed:", chargeError);
      return { error: "Re-rates aren't available right now. Try again later." };
    }
  }
  const result = await rateBuild(supabase, user.id, vehicle, existingBuild);
  if (chargeId && result.error) {
    const { error: refundError } = await createServiceRoleClient()
      .from("points_ledger")
      .delete()
      .eq("user_id", user.id)
      .eq("source_type", "instant_rerate")
      .eq("source_id", chargeId);
    if (refundError) console.error("instant re-rate refund failed:", chargeId, refundError);
  }
  if (chargeId && !result.error) revalidatePath("/store");
  return result;
}

/** The rating itself: photos, the AI call, and saving the result. */
async function rateBuild(
  supabase: Awaited<ReturnType<typeof requireOwner>>["supabase"],
  userId: string,
  vehicle: Awaited<ReturnType<typeof requireOwner>>["vehicle"],
  existingBuild: Awaited<ReturnType<typeof getActiveBuild>>,
): Promise<GenerateRatingResult> {
  const vehicleId = vehicle.id;

  const [gallery, heroMedia, buildParts] = await Promise.all([
    listVehicleMedia(supabase, vehicleId),
    vehicle.hero_media_id ? getMediaById(supabase, vehicle.hero_media_id) : Promise.resolve(null),
    existingBuild ? listBuildParts(supabase, existingBuild.id) : Promise.resolve([]),
  ]);

  const photoUrls = [
    ...(heroMedia ? [publicMediaUrl(supabase, heroMedia.storage_path)] : []),
    ...gallery
      .filter((g) => g.media.kind === "image")
      .map((g) => publicMediaUrl(supabase, g.media.storage_path)),
  ].slice(0, MAX_PHOTOS);

  if (photoUrls.length === 0) {
    return { error: "Add at least one photo before rating this build." };
  }

  let photos: RatingPhoto[];
  try {
    photos = await Promise.all(photoUrls.map(fetchRatingPhoto));
  } catch (err) {
    console.error("generateBuildRatingAction photo load failed:", err);
    return { error: "Couldn't load your photos. Try again." };
  }

  const summary = buildRatingSummary(vehicle, buildParts);
  const provider = getRatingProvider();

  try {
    const rating = await provider.rateBuild(photos, summary);
    // Recorded the moment a real result comes back, so the daily limit
    // is on the AI call itself.
    const build = await getOrCreateActiveBuild(supabase, vehicleId);
    await markBuildRatingAttempt(supabase, build.id);
    const previousScore = build.ai_rating_score;
    // A mock result (no AI key configured) is never ranked silently: it
    // waits as a labelled pending score instead (CLAUDE.md: never present
    // mock output as real).
    if (rating.isMock) {
      await savePendingBuildRating(createServiceRoleClient(), build.id, rating);
      return { data: rating };
    }
    // Saved straight away: the score is SORZA's judgment of the build,
    // not a guess about the car for the owner to correct, and a separate
    // Save step left most first scores unsaved (see CLAUDE.md invariant
    // 5's exception). Written via service role with exactly what the
    // provider returned, never anything a client supplied (0088).
    const serviceRole = createServiceRoleClient();
    await updateBuildRating(serviceRole, build.id, rating);
    await insertBuildRatingHistory(serviceRole, build.id, rating).catch((err) =>
      console.error("insertBuildRatingHistory failed:", err),
    );
    after(() => notifyLeaderboardDisplacements(vehicleId, userId, previousScore, rating.score));
    revalidatePath(`/garage/${vehicleId}`);
    revalidatePath("/garage");
    revalidatePath("/leaderboard");
    return { data: rating };
  } catch (err) {
    // Logged so a failure is diagnosable from Vercel's logs; the provider
    // has already retried anything worth retrying by this point.
    console.error("generateBuildRatingAction failed:", err);
    return { error: "Couldn't rate that build right now. Try again in a bit." };
  }
}

export interface ConfirmRatingState {
  error: string | null;
}

function isValidSubscores(value: BuildRatingSubscores): boolean {
  return (
    ["appearance", "performance", "wheelsFitment", "interior", "modifications"] as const
  ).every((key) => Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 100);
}

/**
 * Deliberately takes no rating content — just which build. Confirming
 * means "save whatever the server itself generated and is still holding
 * pending for this build," never "save whatever values I'm handing you,"
 * which is what let this be called with an arbitrary score before (see
 * 0088's migration comment). requireOwner still gates *whose* pending
 * rating can be confirmed; it no longer has any say over its content.
 */
export async function confirmBuildRatingAction(vehicleId: string): Promise<ConfirmRatingState> {
  const { supabase, user } = await requireOwner(vehicleId);
  const build = await getOrCreateActiveBuild(supabase, vehicleId);
  // Read before the update below replaces it: who this rating passes
  // depends on where the build stood before.
  const previousScore = build.ai_rating_score;

  // Reads and writes both go through service role — protect_ai_rating_
  // columns (0088) silently no-ops these columns for the caller's own
  // 'authenticated' session regardless of RLS, so the promotion itself
  // has to happen as service role too, not just the read.
  const serviceRole = createServiceRoleClient();
  const pending = await getPendingBuildRating(serviceRole, build.id);
  if (!pending || !isValidSubscores(pending.subscores)) {
    return { error: "Nothing to confirm — rate this build again." };
  }

  try {
    await updateBuildRating(serviceRole, build.id, pending);
    // Best-effort: the current rating is already saved by this point —
    // a failed history write shouldn't fail the whole confirm action,
    // just mean this one re-rate is missing from the timeline.
    await insertBuildRatingHistory(serviceRole, build.id, pending).catch((err) =>
      console.error("insertBuildRatingHistory failed:", err),
    );
  } catch (err) {
    // No logging here before meant a failed save was a total black box —
    // same fix as identifyVehicleAction's equivalent catch: log the real
    // error server-side so a future failure here is diagnosable from
    // Vercel logs instead of another guessing round.
    console.error("confirmBuildRatingAction failed:", err);
    return { error: "Couldn't save that rating. Try again." };
  }

  after(() => notifyLeaderboardDisplacements(vehicleId, user.id, previousScore, pending.score));

  revalidatePath(`/garage/${vehicleId}`);
  revalidatePath("/garage");
  return { error: null };
}

/** "Discard" on an unsaved rating. Without clearing it server-side it
 * would come back the next time the owner opens the car. The 24h limit
 * still counts from when it was generated. */
export async function discardPendingRatingAction(vehicleId: string): Promise<{ error: string | null }> {
  const { supabase } = await requireOwner(vehicleId);
  const build = await getActiveBuild(supabase, vehicleId);
  if (!build) return { error: null };
  try {
    await clearPendingBuildRating(createServiceRoleClient(), build.id);
  } catch (err) {
    console.error("discardPendingRatingAction failed:", err);
    return { error: "Couldn't discard that rating. Try again." };
  }
  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}
