import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/** The signed-in user, or null. `supabase.auth.getUser()` is a network
 * round trip to Supabase Auth, and one page render calls this from the
 * root layout, the header, the page and often several components — so
 * it's wrapped in React's per-request `cache()`: the first call in a
 * render does the round trip and every later call in that same render
 * reuses the answer. Nothing is shared between requests or users. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
