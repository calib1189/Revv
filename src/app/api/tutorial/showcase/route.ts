import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadTutorialShowcase } from "@/lib/tutorial/showcase";

/** The real posts, builds and meets the first-time walkthrough shows.
 * Signed-in only; everything in it is content the person could already
 * see in the app. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const showcase = await loadTutorialShowcase(supabase, user.id);
  return NextResponse.json(showcase, { headers: { "Cache-Control": "private, no-store" } });
}
