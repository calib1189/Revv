import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function requireAdmin(): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) throw new Error("Admin access required.");

  return { supabase, userId: user.id };
}
