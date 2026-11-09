import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId, listTakenUsernames } from "@/lib/db/profiles";
import { getTutorialProgress } from "@/lib/db/tutorial-progress";
import { tutorialStartStep } from "@/lib/tutorial/steps";
import { isPlaceholderUsername, suggestUsernameBases, usernameCandidates } from "@/lib/validation/username";
import { TutorialHost } from "@/features/tutorial/tutorial-host";
import { ChooseUsernameScreen } from "@/features/onboarding/choose-username-screen";

/** A free username built from what Google or Apple shared, or null. */
async function suggestFreeUsername(supabase: SupabaseClient<Database>, user: User): Promise<string | null> {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof meta?.full_name === "string" ? meta.full_name : typeof meta?.name === "string" ? meta.name : null;
  const candidates = usernameCandidates(suggestUsernameBases({ fullName, email: user.email }));
  if (candidates.length === 0) return null;
  const taken = await listTakenUsernames(supabase, candidates);
  return candidates.find((name) => !taken.has(name)) ?? null;
}

/**
 * What a signed-in person sees before the app on first run, mounted once
 * by the root layout inside Suspense so these reads never hold up the
 * page:
 *
 * 1. Accounts still on the automatic "user_…" name (every Google and
 *    Apple signup) must pick a real username. It used to be an optional
 *    box on /welcome that most people skipped, which left them unfindable
 *    and unrecognisable in the feed.
 * 2. After that, the first-time walkthrough.
 *
 * Only for confirmed accounts (only they can save either), and nothing is
 * shown when the reads fail, so neither can end up on every launch.
 */
export async function FirstRunGate({ user }: { user: User }) {
  if (!user.email_confirmed_at) return null;
  const supabase = await createClient();

  const [profile, startStep] = await Promise.all([
    getProfileByUserId(supabase, user.id).catch(() => null),
    getTutorialProgress(supabase, user.id)
      .then(tutorialStartStep)
      .catch(() => null),
  ]);

  if (profile && isPlaceholderUsername(profile.username)) {
    const suggestion = await suggestFreeUsername(supabase, user).catch(() => null);
    return <ChooseUsernameScreen suggestion={suggestion} />;
  }
  return <TutorialHost startStep={startStep} />;
}
