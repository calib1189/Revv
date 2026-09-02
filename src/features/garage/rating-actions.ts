"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { getVehicleById } from "@/lib/db/vehicles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import { getActiveBuild, getOrCreateActiveBuild, updateBuildRating } from "@/lib/db/builds";
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
  if (existingBuild?.ai_rating_rated_at) {
    const hoursSince =
      (Date.now() - new Date(existingBuild.ai_rating_rated_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < RATE_LIMIT_HOURS) {
      const hoursLeft = Math.ceil(RATE_LIMIT_HOURS - hoursSince);
      return { error: `You can re-rate this build in about ${hoursLeft}h.` };
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

export async function confirmBuildRatingAction(
  vehicleId: string,
  score: number,
  strengths: string,
  limitingFactors: string,
  subscores: BuildRatingSubscores,
): Promise<ConfirmRatingState> {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { error: "Invalid rating." };
  }
  if (typeof strengths !== "string" || strengths.length === 0 || strengths.length > 500) {
    return { error: "Invalid rating." };
  }
  if (
    typeof limitingFactors !== "string" ||
    limitingFactors.length === 0 ||
    limitingFactors.length > 500
  ) {
    return { error: "Invalid rating." };
  }
  if (!subscores || !isValidSubscores(subscores)) {
    return { error: "Invalid rating." };
  }

  const { supabase } = await requireOwner(vehicleId);
  const build = await getOrCreateActiveBuild(supabase, vehicleId);

  try {
    await updateBuildRating(supabase, build.id, { score, strengths, limitingFactors, subscores });
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
