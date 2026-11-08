import { createClient } from "@/lib/supabase/server";
import { getTutorialProgress } from "@/lib/db/tutorial-progress";
import { tutorialStartStep } from "@/lib/tutorial/steps";
import { TutorialHost } from "@/features/tutorial/tutorial-host";

/** Reads where the first-time walkthrough should open and mounts it. Its
 * own async component (rendered inside Suspense by the root layout) so
 * this database read never holds up the rest of the page.
 *
 * Only for confirmed accounts (their progress can actually be saved), and
 * never when it can't be read — e.g. before migration 0095 has been
 * applied — so it can't end up showing on every launch. */
export async function TutorialGate({ userId, confirmed }: { userId: string; confirmed: boolean }) {
  let startStep: number | null = null;
  if (confirmed) {
    try {
      startStep = tutorialStartStep(await getTutorialProgress(await createClient(), userId));
    } catch {
      startStep = null;
    }
  }
  return <TutorialHost startStep={startStep} />;
}
