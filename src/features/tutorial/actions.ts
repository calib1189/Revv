"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { completeTutorial, saveTutorialStep } from "@/lib/db/tutorial-progress";
import { trackEvent } from "@/lib/analytics/track";
import { clampTutorialStep, type TutorialOutcome } from "@/lib/tutorial/steps";

/** Called as someone moves through the tour. Failing quietly is right:
 * the worst case is resuming one screen earlier next time. */
export async function saveTutorialStepAction(step: number): Promise<void> {
  try {
    const { supabase, user } = await requireConfirmedUser();
    await saveTutorialStep(supabase, user.id, clampTutorialStep(step));
  } catch {
    // never interrupt the tour over a progress write
  }
}

export async function finishTutorialAction(outcome: TutorialOutcome, step: number): Promise<{ error?: string }> {
  if (outcome !== "finished" && outcome !== "skipped") return { error: "Unknown outcome." };
  try {
    const { supabase, user } = await requireConfirmedUser();
    await completeTutorial(supabase, user.id, outcome, clampTutorialStep(step));
    await trackEvent(supabase, user.id, outcome === "finished" ? "tutorial_finished" : "tutorial_skipped", {
      step: clampTutorialStep(step),
    });
    return {};
  } catch {
    return { error: "Couldn't save that." };
  }
}
