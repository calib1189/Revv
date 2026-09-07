"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/db/vehicles";
import { validateVehicleForm } from "@/lib/validation/vehicle";
import { validateImageFile } from "@/lib/validation/media";
import { getVisionProvider } from "@/lib/providers/get-vision-provider";
import { trackEvent } from "@/lib/analytics/track";
import { isVehicleCategory } from "@/lib/vehicles/category";
import { isUnderIdentifyRateLimit, recordIdentifyAttempt } from "@/lib/vehicles/identify-rate-limit";
import { getStoreItem } from "@/lib/store/catalog";
import { listOwnedItemIds } from "@/lib/db/points";
import { getProfileByUserId } from "@/lib/db/profiles";
import type { VehicleIdentification } from "@/lib/providers/vision-provider";
import type { VehicleInsert } from "@/lib/db/vehicles";

export interface VehicleFormState {
  error: string | null;
}

function readVehicleFields(formData: FormData) {
  return {
    year: String(formData.get("year") ?? ""),
    make: String(formData.get("make") ?? ""),
    model: String(formData.get("model") ?? ""),
    trim: String(formData.get("trim") ?? ""),
    category: String(formData.get("category") ?? ""),
    engine: String(formData.get("engine") ?? ""),
    drivetrain: String(formData.get("drivetrain") ?? ""),
    color: String(formData.get("color") ?? ""),
    mileage: String(formData.get("mileage") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

function toVehicleInput(
  fields: ReturnType<typeof readVehicleFields>,
): Omit<VehicleInsert, "owner_id"> {
  return {
    year: Number(fields.year),
    make: fields.make.trim(),
    model: fields.model.trim(),
    trim: fields.trim.trim() || null,
    category: isVehicleCategory(fields.category) ? fields.category : "cars",
    engine: fields.engine.trim() || null,
    drivetrain: fields.drivetrain.trim() || null,
    color: fields.color.trim() || null,
    mileage: fields.mileage.trim() ? Number(fields.mileage) : null,
    nickname: fields.nickname.trim() || null,
    description: fields.description.trim() || null,
  };
}

export async function createVehicleAction(
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const fields = readVehicleFields(formData);
  const errors = validateVehicleForm(fields);
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: firstError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const vehicle = await createVehicle(supabase, {
    ...toVehicleInput(fields),
    owner_id: user.id,
  });
  await trackEvent(supabase, user.id, "vehicle_created", {
    vehicle_id: vehicle.id,
  });

  redirect(`/garage/${vehicle.id}`);
}

export async function updateVehicleAction(
  vehicleId: string,
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const fields = readVehicleFields(formData);
  const errors = validateVehicleForm(fields);
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: firstError };

  const supabase = await createClient();
  await updateVehicle(supabase, vehicleId, toVehicleInput(fields));

  revalidatePath(`/garage/${vehicleId}`);
  redirect(`/garage/${vehicleId}`);
}

export interface IdentifyVehicleResult {
  data?: VehicleIdentification;
  error?: string;
}

export async function identifyVehicleAction(
  formData: FormData,
): Promise<IdentifyVehicleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // This action calls a real (billed) external API and doesn't insert
  // into any table itself, so there's no RLS policy to hang auth or a
  // rate limit off of the way posts/comments/signup do — both have to
  // be enforced explicitly here instead, or this Server Action is an
  // open, unauthenticated, unlimited way to spend Gemini API budget.
  if (!user) return { error: "You must be logged in." };
  if (!(await isUnderIdentifyRateLimit(supabase, user.id))) {
    return { error: "Too many photo lookups — try again in a bit." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }

  const validationError = validateImageFile(file);
  if (validationError) return { error: validationError };

  const provider = getVisionProvider();
  const bytes = await file.arrayBuffer();
  try {
    await recordIdentifyAttempt(supabase, user.id);
    const data = await provider.identifyVehicle(bytes, file.type);
    return { data };
  } catch (err) {
    // A provider failure (bad API response, malformed JSON, network
    // error) used to throw straight out of this server action, which
    // the client only ever saw as an unhelpful generic error — logging
    // it server-side at least makes future provider issues diagnosable
    // instead of a black box.
    console.error("identifyVehicleAction failed:", err);
    return { error: "Couldn't identify that photo. Try again." };
  }
}

export async function deleteVehicleAction(vehicleId: string): Promise<void> {
  const supabase = await createClient();
  await deleteVehicle(supabase, vehicleId);
  revalidatePath("/garage");
  redirect("/garage");
}

export interface VehicleBackdropActionState {
  error: string | null;
}

/** Garage Backdrop is per-vehicle (vehicles.equipped_backdrop), not an
 * account-wide slot — buying an item still just makes it available in
 * store_items_owned same as any other cosmetic, but equipping it
 * always names which specific vehicle it applies to. Ownership of the
 * vehicle itself is enforced by RLS ("owners manage their own
 * vehicles", 0001_init.sql) on the update below, same convention
 * updateVehicleAction already relies on. */
export async function equipVehicleBackdropAction(
  vehicleId: string,
  itemId: string | null,
): Promise<VehicleBackdropActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (itemId) {
    const item = getStoreItem(itemId);
    if (!item || item.category !== "garage_backdrop") return { error: "Invalid item." };

    if (item.founderOnly) {
      const profile = await getProfileByUserId(supabase, user.id);
      if (!profile?.is_founder) return { error: "That item isn't available." };
    }

    const owned = await listOwnedItemIds(supabase, user.id);
    if (!owned.has(itemId)) return { error: "You don't own this item." };
  }

  try {
    await updateVehicle(supabase, vehicleId, { equipped_backdrop: itemId });
    revalidatePath("/garage");
    revalidatePath("/garage/customize");
  } catch (err) {
    console.error("equipVehicleBackdropAction failed:", err);
    return { error: "Couldn't update that vehicle's backdrop. Try again." };
  }

  return { error: null };
}
