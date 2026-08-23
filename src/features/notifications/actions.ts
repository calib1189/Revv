"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/lib/db/notifications";

export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await markAllNotificationsRead(supabase, user.id);
  revalidatePath("/notifications");
}
