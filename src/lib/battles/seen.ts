/** Remembers, per browser, the last battle result someone has watched,
 * so it leads the feed and the battle page until then and steps aside
 * after. A cookie rather than local storage because the server places
 * the slide before the page is sent. */
export const BATTLE_SEEN_COOKIE = "sorza_battle_seen";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export function markBattleResultSeen(battleId: string) {
  try {
    document.cookie = `${BATTLE_SEEN_COOKIE}=${encodeURIComponent(battleId)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
  } catch {
    // Cookies blocked: the result just keeps leading, which is harmless.
  }
}

/** Whether this battle's result should lead: it has one (somebody voted)
 * and this browser hasn't watched it yet. */
export function shouldLeadWithResult(
  battle: { id: string; result: { a: number; b: number } | null } | null,
  seenBattleId: string | undefined,
): boolean {
  if (!battle?.result || battle.result.a + battle.result.b === 0) return false;
  return seenBattleId !== battle.id;
}
