import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { clampTutorialStep, type TutorialOutcome } from "@/lib/tutorial/steps";

export type TutorialProgress = Database["public"]["Tables"]["tutorial_progress"]["Row"];

/** Null when this person has never opened the tour (0095). */
export async function getTutorialProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TutorialProgress | null> {
  const { data, error } = await supabase
    .from("tutorial_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Remembers how far they got, so leaving halfway resumes there. A tour
 * that's already been completed is left completed. */
export async function saveTutorialStep(
  supabase: SupabaseClient<Database>,
  userId: string,
  step: number,
): Promise<void> {
  const existing = await getTutorialProgress(supabase, userId);
  if (existing?.completed_at) return;
  const { error } = await supabase.from("tutorial_progress").upsert(
    { user_id: userId, step: clampTutorialStep(step), updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Marks the tour done for good — it won't start on its own again on any
 * device. The first outcome sticks; replaying later doesn't rewrite it. */
export async function completeTutorial(
  supabase: SupabaseClient<Database>,
  userId: string,
  outcome: TutorialOutcome,
  step: number,
): Promise<void> {
  const existing = await getTutorialProgress(supabase, userId);
  if (existing?.completed_at) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from("tutorial_progress").upsert(
    { user_id: userId, step: clampTutorialStep(step), completed_at: now, outcome, updated_at: now },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
