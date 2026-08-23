"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteMeetup } from "@/lib/db/meetups";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function deleteMeetupAction(meetupId: string): Promise<void> {
  const { supabase } = await requireUser();
  await deleteMeetup(supabase, meetupId);
  revalidatePath("/discover");
}
