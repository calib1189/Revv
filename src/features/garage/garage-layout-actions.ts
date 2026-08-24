"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { updateProfileGarageLayout } from "@/lib/db/profiles";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { validateGarageLayout } from "@/lib/garage/layout";

export async function setGarageLayoutAction(raw: unknown): Promise<{ error: string | null }> {
  const layout = validateGarageLayout(raw);
  if (!layout) return { error: "Invalid layout." };

  const { supabase, user } = await requireConfirmedUser();

  // A bay can only ever hold a car the caller actually owns — otherwise a
  // crafted payload could put someone else's vehicle on display in your
  // garage. RLS protects the profiles row itself, but has no way to know
  // what a vehicle id buried inside this jsonb blob refers to.
  const owned = await listVehiclesByOwner(supabase, user.id);
  const ownedIds = new Set(owned.map((v) => v.id));
  if (layout.bays.some((id) => id && !ownedIds.has(id))) {
    return { error: "Invalid vehicle in layout." };
  }

  try {
    await updateProfileGarageLayout(supabase, user.id, layout);
  } catch {
    return { error: "Couldn't save your garage layout. Try again." };
  }

  revalidatePath("/garage");
  revalidatePath("/garage/customize");
  return { error: null };
}
