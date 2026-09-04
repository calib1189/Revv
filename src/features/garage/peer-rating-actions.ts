"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { getVehicleById } from "@/lib/db/vehicles";
import { upsertPeerRating, deletePeerRating } from "@/lib/db/peer-ratings";

export interface PeerRatingState {
  error: string | null;
}

export async function submitPeerRatingAction(
  vehicleId: string,
  stars: number,
): Promise<PeerRatingState> {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "Invalid rating." };
  }

  const { supabase, user } = await requireConfirmedUser();
  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle) return { error: "Not found." };
  if (vehicle.owner_id === user.id) {
    return { error: "You can't rate your own build." };
  }

  try {
    await upsertPeerRating(supabase, vehicleId, user.id, stars);
  } catch (err) {
    console.error("submitPeerRatingAction failed:", err);
    return { error: "Couldn't save your rating. Try again." };
  }

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}

export async function removePeerRatingAction(vehicleId: string): Promise<PeerRatingState> {
  const { supabase, user } = await requireConfirmedUser();

  try {
    await deletePeerRating(supabase, vehicleId, user.id);
  } catch (err) {
    console.error("removePeerRatingAction failed:", err);
    return { error: "Couldn't remove your rating. Try again." };
  }

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}
