import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getProfileByUserId } from "@/lib/db/profiles";
import { loadTodayBattle, loadYesterdayBattle } from "@/lib/battles/load";
import { BattlePageBody } from "@/features/battles/battle-page-body";

export const metadata: Metadata = {
  title: "Build Battle · SORZA",
  description: "Two real builds, one vote. A new SORZA Build Battle every day.",
};

/** Today's battle, with yesterday's result underneath. */
export default async function TodayBattlePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const [view, previous, profile] = await Promise.all([
    loadTodayBattle(supabase, user?.id ?? null),
    loadYesterdayBattle(supabase, user?.id ?? null),
    user ? getProfileByUserId(supabase, user.id).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <BattlePageBody view={view} previous={previous} isAuthenticated={Boolean(user)} viewerUsername={profile?.username ?? null} />
  );
}
