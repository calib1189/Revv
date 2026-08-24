"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { deleteMeetup } from "@/lib/db/meetups";

export async function deleteMeetupAction(meetupId: string): Promise<void> {
  const { supabase } = await requireUser();
  await deleteMeetup(supabase, meetupId);
  revalidatePath("/discover");
}
