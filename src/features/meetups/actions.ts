"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMeetup, deleteMeetup } from "@/lib/db/meetups";
import { validateMeetup } from "@/lib/validation/meetup";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export interface CreateMeetupState {
  error: string | null;
  success: boolean;
}

export async function createMeetupAction(
  _prevState: CreateMeetupState,
  formData: FormData,
): Promise<CreateMeetupState> {
  const title = String(formData.get("title") ?? "");
  const locationName = String(formData.get("locationName") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");

  const error = validateMeetup({ title, locationName, startsAt });
  if (error) return { error, success: false };

  const { supabase, user } = await requireUser();
  try {
    await createMeetup(supabase, {
      host_id: user.id,
      title: title.trim(),
      description: description || null,
      location_name: locationName.trim(),
      starts_at: new Date(startsAt).toISOString(),
      lat: latRaw ? Number(latRaw) : null,
      lng: lngRaw ? Number(lngRaw) : null,
    });
  } catch {
    return { error: "Couldn't create that meetup. Try again.", success: false };
  }

  revalidatePath("/discover");
  return { error: null, success: true };
}

export async function deleteMeetupAction(meetupId: string): Promise<void> {
  const { supabase } = await requireUser();
  await deleteMeetup(supabase, meetupId);
  revalidatePath("/discover");
}
