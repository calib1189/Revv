"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/db/vehicles";
import { validateVehicleForm } from "@/lib/validation/vehicle";
import { validateImageFile } from "@/lib/validation/media";
import { getVisionProvider } from "@/lib/providers/get-vision-provider";
import { trackEvent } from "@/lib/analytics/track";
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
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }

  const validationError = validateImageFile(file);
  if (validationError) return { error: validationError };

  const provider = getVisionProvider();
  const bytes = await file.arrayBuffer();
  const data = await provider.identifyVehicle(bytes, file.type);
  return { data };
}

export async function deleteVehicleAction(vehicleId: string): Promise<void> {
  const supabase = await createClient();
  await deleteVehicle(supabase, vehicleId);
  revalidatePath("/garage");
  redirect("/garage");
}
