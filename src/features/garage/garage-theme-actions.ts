"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import {
  GARAGE_THEMES,
  updateProfileGarageTheme,
  type GarageTheme,
} from "@/lib/db/profiles";

export async function setGarageThemeAction(theme: string): Promise<{ error: string | null }> {
  if (!GARAGE_THEMES.includes(theme as GarageTheme)) {
    return { error: "Invalid theme." };
  }

  const { supabase, user } = await requireConfirmedUser();

  try {
    await updateProfileGarageTheme(supabase, user.id, theme as GarageTheme);
  } catch {
    return { error: "Couldn't save that theme. Try again." };
  }

  revalidatePath("/garage");
  return { error: null };
}
