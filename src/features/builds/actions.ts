"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateActiveBuild, updateBuildBudget } from "@/lib/db/builds";
import { createBuildPart, updateBuildPart, deleteBuildPart } from "@/lib/db/build-parts";
import { validateBuildPartForm, dollarsToCents, parseMoneyInput } from "@/lib/validation/build-part";
import type { BuildPartFormErrors } from "@/lib/validation/build-part";
import type { BuildPart } from "@/lib/db/build-parts";

export interface BuildPartFormState {
  error: string | null;
}

function readFields(formData: FormData) {
  return {
    rawName: String(formData.get("rawName") ?? ""),
    category: String(formData.get("category") ?? ""),
    status: String(formData.get("status") ?? "planned") as BuildPart["status"],
    price: String(formData.get("price") ?? ""),
    installCost: String(formData.get("installCost") ?? ""),
    installedAt: String(formData.get("installedAt") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    partId: String(formData.get("partId") ?? "") || null,
    ownerAffiliateUrl: String(formData.get("ownerAffiliateUrl") ?? ""),
  };
}

function firstError(errors: BuildPartFormErrors) {
  return Object.values(errors).find(Boolean) ?? null;
}

export async function createBuildPartAction(
  vehicleId: string,
  _prevState: BuildPartFormState,
  formData: FormData,
): Promise<BuildPartFormState> {
  const fields = readFields(formData);
  const errors = validateBuildPartForm(fields);
  const error = firstError(errors);
  if (error) return { error };

  const supabase = await createClient();
  const build = await getOrCreateActiveBuild(supabase, vehicleId);

  await createBuildPart(supabase, {
    build_id: build.id,
    part_id: fields.partId,
    raw_name: fields.rawName.trim(),
    category: fields.category.trim() || null,
    status: fields.status,
    price_cents: dollarsToCents(fields.price),
    install_cost_cents: dollarsToCents(fields.installCost),
    installed_at: fields.installedAt || null,
    notes: fields.notes.trim() || null,
    owner_affiliate_url: fields.ownerAffiliateUrl.trim() || null,
  });

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}

export async function updateBuildPartAction(
  buildPartId: string,
  vehicleId: string,
  _prevState: BuildPartFormState,
  formData: FormData,
): Promise<BuildPartFormState> {
  const fields = readFields(formData);
  const errors = validateBuildPartForm(fields);
  const error = firstError(errors);
  if (error) return { error };

  const supabase = await createClient();
  await updateBuildPart(supabase, buildPartId, {
    part_id: fields.partId,
    raw_name: fields.rawName.trim(),
    category: fields.category.trim() || null,
    status: fields.status,
    price_cents: dollarsToCents(fields.price),
    install_cost_cents: dollarsToCents(fields.installCost),
    installed_at: fields.installedAt || null,
    notes: fields.notes.trim() || null,
    owner_affiliate_url: fields.ownerAffiliateUrl.trim() || null,
  });

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}

export async function deleteBuildPartAction(
  buildPartId: string,
  vehicleId: string,
): Promise<void> {
  const supabase = await createClient();
  await deleteBuildPart(supabase, buildPartId);
  revalidatePath(`/garage/${vehicleId}`);
}

export interface BudgetFormState {
  error: string | null;
}

export async function updateBudgetAction(
  vehicleId: string,
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const raw = String(formData.get("budget") ?? "");
  if (raw.trim()) {
    const dollars = parseMoneyInput(raw);
    if (!Number.isFinite(dollars) || dollars < 0) {
      return { error: "Budget must be a positive number." };
    }
  }

  const supabase = await createClient();
  const build = await getOrCreateActiveBuild(supabase, vehicleId);
  await updateBuildBudget(supabase, build.id, dollarsToCents(raw));

  revalidatePath(`/garage/${vehicleId}`);
  return { error: null };
}
