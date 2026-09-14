"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { createBusinessProfile } from "@/lib/db/business-profiles";

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
