"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} from "@/lib/db/maintenance";
import { validateMaintenanceForm } from "@/lib/validation/maintenance";
import type { MaintenanceFormErrors } from "@/lib/validation/maintenance";
import { dollarsToCents } from "@/lib/validation/build-part";

export interface MaintenanceFormState {
  error: string | null;
}

function readFields(formData: FormData) {
  return {
    kind: String(formData.get("kind") ?? ""),
    performedAt: String(formData.get("performedAt") ?? ""),
    mileage: String(formData.get("mileage") ?? ""),
    cost: String(formData.get("cost") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function firstError(errors: MaintenanceFormErrors) {
  return Object.values(errors).find(Boolean) ?? null;
}

export async function createMaintenanceAction(
  vehicleId: string,
  _prevState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const fields = readFields(formData);
  const errors = validateMaintenanceForm(fields);
  const error = firstError(errors);
  if (error) return { error };

  const supabase = await createClient();
  await createMaintenanceRecord(supabase, {
    vehicle_id: vehicleId,
    kind: fields.kind.trim(),
    performed_at: fields.performedAt,
    mileage: fields.mileage.trim() ? Number(fields.mileage) : null,
    cost_cents: dollarsToCents(fields.cost),
    notes: fields.notes.trim() || null,
  });

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}

export async function updateMaintenanceAction(
  recordId: string,
  vehicleId: string,
  _prevState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const fields = readFields(formData);
  const errors = validateMaintenanceForm(fields);
  const error = firstError(errors);
  if (error) return { error };

  const supabase = await createClient();
  await updateMaintenanceRecord(supabase, recordId, {
    kind: fields.kind.trim(),
    performed_at: fields.performedAt,
    mileage: fields.mileage.trim() ? Number(fields.mileage) : null,
    cost_cents: dollarsToCents(fields.cost),
    notes: fields.notes.trim() || null,
  });

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}

export async function deleteMaintenanceAction(
  recordId: string,
  vehicleId: string,
): Promise<void> {
  const supabase = await createClient();
  await deleteMaintenanceRecord(supabase, recordId);
  revalidatePath(`/garage/${vehicleId}`);
}
