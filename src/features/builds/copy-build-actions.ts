"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import {
  getActiveBuild,
  getBuildById,
  createBuild,
  updateBuildStatus,
  deleteBuild,
} from "@/lib/db/builds";
import { listBuildParts, createBuildPart, deleteBuildPart } from "@/lib/db/build-parts";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export interface CopyBuildResult {
  error?: string;
}

export async function copyBuildAction(
  sourceVehicleId: string,
  targetVehicleId: string,
): Promise<CopyBuildResult> {
  const { supabase, user } = await requireUser();

  const targetVehicle = await getVehicleById(supabase, targetVehicleId);
  if (!targetVehicle || targetVehicle.owner_id !== user.id) {
    return { error: "You can only copy a build onto your own vehicle." };
  }

  const sourceBuild = await getActiveBuild(supabase, sourceVehicleId);
  if (!sourceBuild) {
    return { error: "This vehicle has no build to copy yet." };
  }

  const sourceParts = await listBuildParts(supabase, sourceBuild.id);

  const draftBuild = await createBuild(supabase, {
    vehicle_id: targetVehicleId,
    status: "draft",
    copied_from_build_id: sourceBuild.id,
  });

  for (const part of sourceParts) {
    await createBuildPart(supabase, {
      build_id: draftBuild.id,
      part_id: part.part_id,
      raw_name: part.raw_name,
      category: part.category,
      status: "planned",
      price_cents: part.price_cents,
      install_cost_cents: null,
      installed_at: null,
      notes: part.notes,
    });
  }

  revalidatePath(`/garage/${targetVehicleId}`);
  redirect(`/garage/${targetVehicleId}/builds/${draftBuild.id}/review`);
}

export async function acceptDraftBuildAction(
  vehicleId: string,
  draftBuildId: string,
): Promise<void> {
  const { supabase } = await requireUser();

  const currentActive = await getActiveBuild(supabase, vehicleId);
  if (currentActive && currentActive.id !== draftBuildId) {
    await updateBuildStatus(supabase, currentActive.id, "archived");
  }
  await updateBuildStatus(supabase, draftBuildId, "active");

  revalidatePath(`/garage/${vehicleId}`);
  redirect(`/garage/${vehicleId}`);
}

export async function discardDraftBuildAction(
  vehicleId: string,
  draftBuildId: string,
): Promise<void> {
  const { supabase } = await requireUser();
  await deleteBuild(supabase, draftBuildId);
  revalidatePath(`/garage/${vehicleId}`);
  redirect(`/garage/${vehicleId}`);
}

export async function removeDraftBuildPartAction(
  buildPartId: string,
  vehicleId: string,
  draftBuildId: string,
): Promise<void> {
  const { supabase } = await requireUser();
  await deleteBuildPart(supabase, buildPartId);
  revalidatePath(`/garage/${vehicleId}/builds/${draftBuildId}/review`);
}

export async function getSourceVehicleForBuild(
  copiedFromBuildId: string | null,
) {
  if (!copiedFromBuildId) return null;
  const supabase = await createClient();
  const sourceBuild = await getBuildById(supabase, copiedFromBuildId);
  if (!sourceBuild) return null;
  return getVehicleById(supabase, sourceBuild.vehicle_id);
}
