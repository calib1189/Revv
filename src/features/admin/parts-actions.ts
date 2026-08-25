"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createPart, updatePart, deletePart } from "@/lib/db/parts";
import { createAuditLog } from "@/lib/db/audit-logs";
import { rowsToSpecs } from "@/lib/parts/specs";
import { PART_CATEGORIES } from "@/lib/parts/categories";

export interface PartFormState {
  error: string | null;
}

function readFields(formData: FormData) {
  const specKeys = formData.getAll("specKey").map(String);
  const specValues = formData.getAll("specValue").map(String);
  return {
    brand: String(formData.get("brand") ?? "").trim(),
    product: String(formData.get("product") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    partNumber: String(formData.get("partNumber") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    verified: formData.get("verified") === "on",
    specs: rowsToSpecs(specKeys.map((key, i) => ({ key, value: specValues[i] ?? "" }))),
  };
}

function validate(fields: ReturnType<typeof readFields>): string | null {
  if (!fields.brand) return "Brand is required.";
  if (!fields.product) return "Product is required.";
  if (!PART_CATEGORIES.some((c) => c.id === fields.category)) {
    return "Choose a valid category.";
  }
  return null;
}

export async function createPartAction(
  _prevState: PartFormState,
  formData: FormData,
): Promise<PartFormState> {
  const fields = readFields(formData);
  const error = validate(fields);
  if (error) return { error };

  const { supabase, userId } = await requireAdmin();
  const part = await createPart(supabase, {
    brand: fields.brand,
    product: fields.product,
    category: fields.category,
    part_number: fields.partNumber || null,
    source: fields.source || null,
    verified: fields.verified,
    specs: fields.specs,
  });
  await createAuditLog(supabase, {
    actorId: userId,
    action: "part.created",
    targetType: "part",
    targetId: part.id,
  });

  revalidatePath("/admin/parts");
  revalidatePath("/parts");
  return { error: null };
}

export async function updatePartAction(
  partId: string,
  _prevState: PartFormState,
  formData: FormData,
): Promise<PartFormState> {
  const fields = readFields(formData);
  const error = validate(fields);
  if (error) return { error };

  const { supabase, userId } = await requireAdmin();
  await updatePart(supabase, partId, {
    brand: fields.brand,
    product: fields.product,
    category: fields.category,
    part_number: fields.partNumber || null,
    source: fields.source || null,
    verified: fields.verified,
    specs: fields.specs,
  });
  await createAuditLog(supabase, {
    actorId: userId,
    action: "part.updated",
    targetType: "part",
    targetId: partId,
  });

  revalidatePath("/admin/parts");
  revalidatePath("/parts");
  return { error: null };
}

export async function deletePartAction(partId: string): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  await deletePart(supabase, partId);
  await createAuditLog(supabase, {
    actorId: userId,
    action: "part.deleted",
    targetType: "part",
    targetId: partId,
  });

  revalidatePath("/admin/parts");
  revalidatePath("/parts");
}
