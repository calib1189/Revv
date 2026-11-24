import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getProfileByUserId } from "@/lib/db/profiles";
import { loadBattleViewById, loadTodayBattle } from "@/lib/battles/load";
import { BattlePageBody } from "@/features/battles/battle-page-body";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ battleId: string }> }): Promise<Metadata> {
  const { battleId } = await params;
  if (!UUID.test(battleId)) return {};
  const view = await loadBattleViewById(await createClient(), battleId, null);
  if (!view) return {};
  const title = `${view.a.title} vs ${view.b.title}`;
  const description = view.ended
    ? "See who won this SORZA Build Battle."
    : "Which build wins? Vote in today's SORZA Build Battle.";
  return { title: `${title} · SORZA`, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

/** One battle: what a shared link opens. Live, it takes votes; ended,
 * it shows the result. An ended one also shows today's battle, so a
 * late tap on an old link still lands somewhere to vote. */
export default async function BattlePage({ params }: { params: Promise<{ battleId: string }> }) {
  const { battleId } = await params;
  if (!UUID.test(battleId)) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();
  const [view, profile] = await Promise.all([
    loadBattleViewById(supabase, battleId, user?.id ?? null),
    user ? getProfileByUserId(supabase, user.id).catch(() => null) : Promise.resolve(null),
  ]);
  if (!view) notFound();

  const today = view.ended ? await loadTodayBattle(supabase, user?.id ?? null) : null;
  return view.ended && today ? (
    <BattlePageBody view={today} previous={view} isAuthenticated={Boolean(user)} viewerUsername={profile?.username ?? null} />
  ) : (
    <BattlePageBody view={view} previous={null} isAuthenticated={Boolean(user)} viewerUsername={profile?.username ?? null} />
  );
}
