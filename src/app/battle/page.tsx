import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getProfileByUserId } from "@/lib/db/profiles";
import { loadPastBattles, loadTodayBattle, loadYesterdayBattle } from "@/lib/battles/load";
import { BattlePageBody } from "@/features/battles/battle-page-body";
import { BattleResultGate } from "@/features/battles/battle-result-gate";
import { BATTLE_SEEN_COOKIE, shouldLeadWithResult } from "@/lib/battles/seen";

export const metadata: Metadata = {
  title: "Build Battle · SORZA",
  description: "Two real builds, one vote. A new SORZA Build Battle every day.",
};

/** Today's battle, with yesterday's result and the ones before it
 * underneath. The first visit after a battle ends opens on that result. */
export default async function TodayBattlePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const [view, previous, past, profile] = await Promise.all([
    loadTodayBattle(supabase, user?.id ?? null),
    loadYesterdayBattle(supabase, user?.id ?? null),
    loadPastBattles(supabase, user?.id ?? null),
    user ? getProfileByUserId(supabase, user.id).catch(() => null) : Promise.resolve(null),
  ]);
  const seen = (await cookies()).get(BATTLE_SEEN_COOKIE)?.value;
  return (
    <>
      {previous && shouldLeadWithResult(previous, seen) && (
        <BattleResultGate view={previous} isAuthenticated={Boolean(user)} />
      )}
      <BattlePageBody
        view={view}
        previous={previous}
        past={past.filter((b) => b.id !== previous?.id)}
        isAuthenticated={Boolean(user)}
        viewerUsername={profile?.username ?? null}
      />
    </>
  );
}
