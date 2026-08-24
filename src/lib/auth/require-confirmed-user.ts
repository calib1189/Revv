import { createClient } from "@/lib/supabase/server";

/** The auth check every write-side server action should go through,
 * instead of a raw supabase.auth.getUser() call. Blocks not just an
 * absent session but an unconfirmed one — without this, a signup with a
 * fake or never-checked email address gets a fully active session from
 * Supabase and every mutation (posting, following, commenting, messaging)
 * silently works. */
export async function requireConfirmedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");
  if (!user.email_confirmed_at) {
    throw new Error("Please confirm your email before doing that.");
  }
  return { supabase, user };
}
