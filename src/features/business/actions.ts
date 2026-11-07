"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import {
  createBusinessProfile,
  getBusinessProfileById,
  updateBusinessDetails,
} from "@/lib/db/business-profiles";
import {
  normalizeInstagram,
  normalizePhone,
  normalizeServices,
  normalizeTagline,
  normalizeWebsite,
} from "@/lib/shops/business-details";
import { parseBusinessHours, type BusinessHours } from "@/lib/shops/hours";

export interface ClaimBusinessResult {
  error?: string;
  businessProfileId?: string;
}

/** The one step that genuinely needs server-side handling: everything
 * after this (logo, gallery, description, submitting for verification) is
 * a plain client-side Supabase write protected by RLS, same as
 * ownership-verification.tsx and create-meetup-form.tsx's photo uploads —
 * but a duplicate claim needs a friendly message instead of a raw
 * unique-constraint error surfacing to the UI. */
export async function claimBusinessProfileAction({
  placeId,
  placeName,
  placeAddress,
}: {
  placeId: string;
  placeName: string;
  placeAddress: string | null;
}): Promise<ClaimBusinessResult> {
  if (!placeId || !placeName) return { error: "Couldn't identify that business." };

  const { supabase, user } = await requireUser();

  try {
    const profile = await createBusinessProfile(supabase, {
      owner_id: user.id,
      place_id: placeId,
      place_name: placeName,
      place_address: placeAddress,
    });
    revalidatePath("/settings/business");
    return { businessProfileId: profile.id };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      return { error: "This business has already been claimed." };
    }
    return { error: "Couldn't claim that business. Try again." };
  }
}

export interface BusinessDetailsInput {
  businessProfileId: string;
  tagline: string;
  services: string[];
  /** null clears the hours; otherwise a full week (see lib/shops/hours). */
  hours: unknown;
  phone: string;
  website: string;
  instagram: string;
}

export interface BusinessDetailsResult {
  error?: string;
}

/** Saves the listing details a shop owner edits. Validates everything
 * here; RLS makes sure it's their own listing. */
export async function updateBusinessDetailsAction(input: BusinessDetailsInput): Promise<BusinessDetailsResult> {
  const tagline = normalizeTagline(input.tagline);
  if ("error" in tagline) return { error: tagline.error };
  const services = normalizeServices(input.services);
  if ("error" in services) return { error: services.error };
  const phone = normalizePhone(input.phone);
  if ("error" in phone) return { error: phone.error };
  const website = normalizeWebsite(input.website);
  if ("error" in website) return { error: website.error };
  const instagram = normalizeInstagram(input.instagram);
  if ("error" in instagram) return { error: instagram.error };

  let hours: BusinessHours | null = null;
  if (input.hours !== null) {
    hours = parseBusinessHours(input.hours);
    if (!hours) return { error: "Check your hours. Each open day needs a closing time after its opening time." };
  }

  const { supabase, user } = await requireUser();
  const profile = await getBusinessProfileById(supabase, input.businessProfileId).catch(() => null);
  if (!profile || profile.owner_id !== user.id) return { error: "Couldn't find that business." };

  try {
    await updateBusinessDetails(supabase, profile.id, {
      tagline: tagline.value,
      services: services.value,
      hours,
      phone: phone.value,
      website_url: website.value,
      instagram: instagram.value,
    });
  } catch {
    return {
      error: "Couldn't save. If this keeps happening, migration 0101 may not be applied yet.",
    };
  }

  revalidatePath(`/settings/business/${profile.id}`);
  revalidatePath(`/discover/shop/${encodeURIComponent(profile.place_id)}`);
  return {};
}
