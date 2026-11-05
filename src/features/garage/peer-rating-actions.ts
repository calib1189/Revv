"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMyPeerRating, upsertPeerRating, deletePeerRating } from "@/lib/db/peer-ratings";
import { sendPushToUser } from "@/lib/push/send";
import { vehicleDisplayName } from "@/lib/vehicles/display-name";

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

  let isFirstRating = false;
  try {
    isFirstRating = (await getMyPeerRating(supabase, vehicleId, user.id)) === null;
    await upsertPeerRating(supabase, vehicleId, user.id, stars);
  } catch (err) {
    console.error("submitPeerRatingAction failed:", err);
    return { error: "Couldn't save your rating. Try again." };
  }

  // Only the first rating from this person. Changing it from 3 to 4
  // stars isn't news to the owner, and tapping through stars would
  // otherwise send a notification per tap.
  if (isFirstRating) {
    after(async () => {
      const rater = await getProfileByUserId(supabase, user.id);
      await sendPushToUser(
        vehicle.owner_id,
        {
          title: "SORZA",
          body: `@${rater?.username ?? "Someone"} gave your ${vehicleDisplayName(vehicle)} ${stars} ${stars === 1 ? "star" : "stars"}`,
          url: `/garage/${vehicleId}`,
        },
        "ratings",
      );
    });
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
