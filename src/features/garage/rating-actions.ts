"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getVehicleById } from "@/lib/db/vehicles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import {
  getActiveBuild,
  getOrCreateActiveBuild,
  updateBuildRating,
  markBuildRatingAttempt,
  savePendingBuildRating,
  getPendingBuildRating,
} from "@/lib/db/builds";
import { insertBuildRatingHistory } from "@/lib/db/build-rating-history";
import { listBuildParts } from "@/lib/db/build-parts";
import { buildRatingSummary } from "@/lib/rating/build-summary";
import { getRatingProvider } from "@/lib/providers/get-rating-provider";
import type { RatingPhoto, BuildRating, BuildRatingSubscores } from "@/lib/providers/rating-provider";

const RATE_LIMIT_HOURS = 24;
const MAX_PHOTOS = 4;

async function requireOwner(vehicleId: string) {
  const { supabase, user } = await requireConfirmedUser();

  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle || vehicle.owner_id !== user.id) {
    throw new Error("Not found.");
  }
  return { supabase, user, vehicle };
}

export interface GenerateRatingResult {
  data?: BuildRating;
  error?: string;
}

export async function generateBuildRatingAction(
  vehicleId: string,
): Promise<GenerateRatingResult> {
  const { supabase, vehicle } = await requireOwner(vehicleId);

  const existingBuild = await getActiveBuild(supabase, vehicleId);
  // ai_rating_last_attempt_at (set below, right after a real AI call
  // completes) is the actual gate — it's recorded even if the result
  // never gets confirmed. Falling back to ai_rating_rated_at covers a
  // build whose last rating predates this column existing at all.
  const lastAttempt = existingBuild?.ai_rating_last_attempt_at ?? existingBuild?.ai_rating_rated_at;
  if (lastAttempt) {
    const hoursSince = (Date.now() - new Date(lastAttempt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < RATE_LIMIT_HOURS) {
      const hoursLeft = Math.ceil(RATE_LIMIT_HOURS - hoursSince);
      return { error: `You can rate this build again in about ${hoursLeft}h.` };
    }
  }

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
    photos = await Promise.all(
      photoUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        const bytes = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") ?? "image/jpeg";
        return { bytes, mimeType };
      }),
    );
  } catch {
    return { error: "Couldn't load your photos. Try again." };
  }

  const summary = buildRatingSummary(vehicle, buildParts);
  const provider = getRatingProvider();

  try {
    const rating = await provider.rateBuild(photos, summary);
    // Recorded the moment a real result comes back — before the caller
    // has any chance to discard it — so the daily limit is on the AI
    // call itself, not on choosing to keep the result.
    const build = await getOrCreateActiveBuild(supabase, vehicleId);
    await markBuildRatingAttempt(supabase, build.id);
    // Stored via service role, not the caller's own session — this is
    // the one write of rating content that's trustworthy, because it's
    // exactly what the provider just returned, not anything a client
    // supplied. confirmBuildRatingAction reads this back rather than
    // accepting rating content as arguments (see 0088's migration
    // comment for what that used to allow).
    const serviceRole = createServiceRoleClient();
    await savePendingBuildRating(serviceRole, build.id, rating);
    return { data: rating };
  } catch {
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
  const { supabase } = await requireOwner(vehicleId);
  const build = await getOrCreateActiveBuild(supabase, vehicleId);

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

  revalidatePath(`/garage/${vehicleId}`);
  revalidatePath("/garage");
  return { error: null };
}
