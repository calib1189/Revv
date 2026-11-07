"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getVehicleById } from "@/lib/db/vehicles";
import { deleteShopReview, getShopReviewById, setShopReviewReply, upsertShopReview } from "@/lib/db/shop-reviews";
import { MAX_OWNER_REPLY, normalizeReviewInput } from "@/lib/shops/reviews";

export interface ReviewActionResult {
  error?: string;
}

function shopPath(placeId: string): string {
  return `/discover/shop/${encodeURIComponent(placeId)}`;
}

/** Writes (or rewrites) the signed-in user's review of a shop. */
export async function saveShopReviewAction(input: {
  placeId: string;
  rating: number;
  service: string;
  body: string;
  vehicleId: string | null;
}): Promise<ReviewActionResult> {
  if (!input.placeId) return { error: "Couldn't identify that shop." };
  const normalized = normalizeReviewInput(input);
  if ("error" in normalized) return { error: normalized.error };

  const { supabase, user } = await requireUser();

  if (input.vehicleId) {
    const vehicle = await getVehicleById(supabase, input.vehicleId).catch(() => null);
    if (!vehicle || vehicle.owner_id !== user.id) return { error: "Pick one of your own cars." };
  }

  try {
    await upsertShopReview(supabase, {
      placeId: input.placeId,
      authorId: user.id,
      vehicleId: input.vehicleId,
      ...normalized.value,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "42501") {
      return { error: "You can't review this shop. Owners can't review their own shop." };
    }
    return { error: "Couldn't post your review. Try again." };
  }

  revalidatePath(shopPath(input.placeId));
  return {};
}

export async function deleteShopReviewAction({
  reviewId,
  placeId,
}: {
  reviewId: string;
  placeId: string;
}): Promise<ReviewActionResult> {
  const { supabase, user } = await requireUser();
  const review = await getShopReviewById(supabase, reviewId).catch(() => null);
  if (!review || review.author_id !== user.id) return { error: "Couldn't find your review." };

  try {
    await deleteShopReview(supabase, reviewId);
  } catch {
    return { error: "Couldn't delete your review. Try again." };
  }
  revalidatePath(shopPath(placeId));
  return {};
}

/** The shop's verified owner replies to a review (an empty reply removes
 * it). RLS and the 0102 trigger make sure only the owner can. */
export async function replyToShopReviewAction({
  reviewId,
  placeId,
  reply,
}: {
  reviewId: string;
  placeId: string;
  reply: string;
}): Promise<ReviewActionResult> {
  const trimmed = reply.trim();
  if (trimmed.length > MAX_OWNER_REPLY) return { error: `Keep your reply under ${MAX_OWNER_REPLY} characters.` };

  const { supabase } = await requireUser();
  try {
    await setShopReviewReply(supabase, reviewId, trimmed || null);
  } catch {
    return { error: "Couldn't save your reply. Try again." };
  }
  revalidatePath(shopPath(placeId));
  return {};
}
